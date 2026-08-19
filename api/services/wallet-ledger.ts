import mongoose, { type ClientSession } from "mongoose";
import { TRPCError } from "@trpc/server";
import { AuditLog, Deposit, User, WalletTransaction, clean, cleanMany, nextId } from "../mongo/models";

export function moneyToCents(value: string | number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid money amount" });
  return Math.round(numeric * 100);
}

export function centsToMoney(cents: number) {
  if (!Number.isSafeInteger(cents)) throw new Error("Money amount exceeds safe integer range");
  return (cents / 100).toFixed(2);
}

type WalletMutationInput = {
  session: ClientSession;
  userId: number;
  type: "credit" | "debit";
  amountCents: number;
  operationKey: string;
  referenceType: "deposit" | "order" | "third_party_order" | "binance_pay_order" | "manual_credit" | "manual_debit" | "refund" | "referral";
  referenceId?: number;
  note: string;
};

export function walletReplayMatches(existing: any, input: Omit<WalletMutationInput, "session" | "note" | "operationKey">) {
  return existing.userId === input.userId
    && existing.type === input.type
    && moneyToCents(existing.amount) === input.amountCents
    && existing.referenceType === input.referenceType
    && (existing.referenceId ?? null) === (input.referenceId ?? null);
}

export async function applyWalletMutation(input: WalletMutationInput) {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Wallet amount must be positive" });
  }

  const existing = clean(await WalletTransaction.findOne({ operationKey: input.operationKey }).session(input.session).lean()) as any;
  if (existing) {
    if (!walletReplayMatches(existing, input)) {
      throw new TRPCError({ code: "CONFLICT", message: "Wallet operation key was already used for different details" });
    }
    return { transaction: existing, balance: existing.balanceAfter, replayed: true };
  }

  const user = clean(await User.findOne({ id: input.userId }).session(input.session).select("walletBalance").lean()) as any;
  if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Wallet owner not found" });

  const beforeCents = moneyToCents(user.walletBalance ?? "0");
  const afterCents = input.type === "credit" ? beforeCents + input.amountCents : beforeCents - input.amountCents;
  if (afterCents < 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Insufficient wallet balance. Required: $${centsToMoney(input.amountCents)}, Available: $${centsToMoney(beforeCents)}`,
    });
  }

  await User.updateOne(
    { id: input.userId },
    { $set: { walletBalance: centsToMoney(afterCents) } },
    { session: input.session },
  );

  const rows = await WalletTransaction.create([{
    id: await nextId("wallet_transactions"),
    userId: input.userId,
    type: input.type,
    amount: centsToMoney(input.amountCents),
    balanceBefore: centsToMoney(beforeCents),
    balanceAfter: centsToMoney(afterCents),
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    operationKey: input.operationKey,
    note: input.note,
  }], { session: input.session });

  return { transaction: clean(rows[0].toObject()) as any, balance: centsToMoney(afterCents), replayed: false };
}

export async function runInTransaction<T>(work: (session: ClientSession) => Promise<T>) {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export async function approveDepositAndCredit(input: { depositId: number; actorId?: number; adminNote?: string }) {
  return runInTransaction(async (session) => {
    const deposit = clean(await Deposit.findOne({ id: input.depositId }).session(session).lean()) as any;
    if (!deposit) throw new TRPCError({ code: "NOT_FOUND", message: "Deposit not found" });
    if (!deposit.txid || (deposit.method !== "nayapay" && !deposit.screenshotUrl)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot approve this deposit without the required payment proof" });
    }
    if (!["pending", "approved"].includes(deposit.status)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Deposit is not pending or repairable" });
    }

    const amountCents = moneyToCents(deposit.amount);
    const operationKey = `deposit:${deposit.id}:credit`;
    const keyedLedger = clean(await WalletTransaction.findOne({ operationKey }).session(session).lean()) as any;
    const legacyLedgers = cleanMany(await WalletTransaction.find({
      referenceType: "deposit",
      referenceId: deposit.id,
      $or: [{ operationKey: { $exists: false } }, { operationKey: null }, { operationKey: "" }],
    }).session(session).lean()) as any[];
    if (legacyLedgers.length > 1) {
      throw new TRPCError({ code: "CONFLICT", message: "Deposit has multiple legacy wallet credits and requires manual review" });
    }
    const legacyLedger = legacyLedgers[0];
    if (keyedLedger && legacyLedger) {
      throw new TRPCError({ code: "CONFLICT", message: "Deposit has conflicting wallet ledger records" });
    }
    if (legacyLedger && (
      legacyLedger.userId !== deposit.userId
      || legacyLedger.type !== "credit"
      || moneyToCents(legacyLedger.amount) !== amountCents
    )) {
      throw new TRPCError({ code: "CONFLICT", message: "Legacy deposit ledger does not match the deposit" });
    }

    let wallet: { transaction: any; balance: string; replayed: boolean };
    if (legacyLedger) {
      await WalletTransaction.updateOne(
        { id: legacyLedger.id, $or: [{ operationKey: { $exists: false } }, { operationKey: null }] },
        { $set: { operationKey } },
        { session },
      );
      const currentUser = clean(await User.findOne({ id: deposit.userId }).session(session).select("walletBalance").lean()) as any;
      if (!currentUser) throw new TRPCError({ code: "NOT_FOUND", message: "Wallet owner not found" });
      wallet = { transaction: { ...legacyLedger, operationKey }, balance: String(currentUser.walletBalance ?? legacyLedger.balanceAfter), replayed: true };
    } else {
      wallet = await applyWalletMutation({
        session,
        userId: deposit.userId,
        type: "credit",
        amountCents,
        operationKey,
        referenceType: "deposit",
        referenceId: deposit.id,
        note: deposit.method === "nayapay" ? "NayaPay deposit approved" : "Deposit approved",
      });
    }

    await Deposit.updateOne(
      { id: deposit.id, status: { $in: ["pending", "approved"] } },
      { $set: { status: "approved", adminNote: input.adminNote, verifiedAt: deposit.verifiedAt ?? new Date() } },
      { session },
    );

    if (!wallet.replayed) {
      await AuditLog.create([{
        id: await nextId("audit_logs"),
        actorId: input.actorId,
        action: "deposit_approved",
        entityType: "deposit",
        entityId: deposit.id,
        metadata: { operationKey, repairedApprovedDeposit: deposit.status === "approved" },
      }], { session });
    }

    return {
      success: true,
      replayed: wallet.replayed,
      depositId: deposit.id,
      userId: deposit.userId,
      creditedAmount: centsToMoney(amountCents),
      balance: wallet.balance,
    };
  });
}

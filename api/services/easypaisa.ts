import { TRPCError } from "@trpc/server";
import {
  EasyPaisaTransaction,
  nextId,
} from "../mongo/models";

export type ParsedEasyPaisaNotification = {
  amount?: number;
  trxId?: string;
  senderName?: string;
  senderAccount?: string;
  paymentDate?: Date;
};

export type EasyPaisaClaimInput = {
  userId: number;
  trxId: string;
  expectedAmount: number;
};

const amountRegex = /Rs\.?\s*([\d,]+)/i;
const trxIdRegex = /(?:Trx|Txn|Transaction)\s*ID\s*:\s*([A-Za-z0-9]+)/i;

function parsePaymentDate(message: string) {
  const match = message.match(/on\s+(\d{2})-(\d{2})-(\d{4})\s+at\s+(\d{2}):(\d{2}):(\d{2})/i);
  if (!match) return undefined;

  const [, day, month, year, hour, minute, second] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseSender(message: string) {
  const match = message.match(/from\s+(.+?)\s+via\s+/i);
  if (!match) return {};

  const senderText = match[1].trim();
  const accountMatch = senderText.match(/([A-Z]{2}\*+[A-Z0-9]*\*+\d{3,})/i);
  return {
    senderName: senderText.replace(accountMatch?.[0] ?? "", "").trim() || undefined,
    senderAccount: accountMatch?.[0],
  };
}

export function parseEasyPaisaNotification(message: string): ParsedEasyPaisaNotification {
  const amountMatch = message.match(amountRegex);
  const trxIdMatch = message.match(trxIdRegex);
  const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, "")) : undefined;

  return {
    amount: amount && Number.isFinite(amount) ? amount : undefined,
    trxId: trxIdMatch?.[1],
    ...parseSender(message),
    paymentDate: parsePaymentDate(message),
  };
}

export function validateClaimAmount(recordAmount: number, expectedAmount: number) {
  return Math.abs(recordAmount - expectedAmount) < 0.01;
}

export function isDuplicateTransactionError(error: unknown) {
  const anyError = error as { code?: number; message?: string };
  return anyError?.code === 11000 || String(anyError?.message ?? "").toLowerCase().includes("duplicate");
}

export async function saveEasyPaisaWebhook(input: {
  message: string;
  source?: string;
}) {
  const parsed = parseEasyPaisaNotification(input.message);

  if (!parsed.amount || !parsed.trxId) {
    const rejected = await EasyPaisaTransaction.create({
      id: await nextId("easypaisa_transactions"),
      trxId: `invalid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      amount: parsed.amount?.toFixed(2) ?? "0.00",
      senderName: parsed.senderName,
      senderAccount: parsed.senderAccount,
      paymentDate: parsed.paymentDate,
      rawMessage: input.message,
      source: input.source,
      status: "rejected",
      rejectionReason: "Could not extract amount or transaction ID",
    });
    console.warn("[easypaisa] rejected unparsable notification", { id: rejected.id });
    return { duplicate: false, status: "rejected" as const, id: rejected.id };
  }

  try {
    const created = await EasyPaisaTransaction.create({
      id: await nextId("easypaisa_transactions"),
      trxId: parsed.trxId,
      amount: parsed.amount.toFixed(2),
      senderName: parsed.senderName,
      senderAccount: parsed.senderAccount,
      paymentDate: parsed.paymentDate,
      rawMessage: input.message,
      source: input.source,
      status: "pending",
    });
    return { duplicate: false, status: "pending" as const, id: created.id, trxId: created.trxId };
  } catch (error) {
    if (isDuplicateTransactionError(error)) {
      const existing = await EasyPaisaTransaction.findOne({ trxId: parsed.trxId }).select("id status trxId").lean();
      return { duplicate: true, status: existing?.status ?? "pending", id: existing?.id, trxId: parsed.trxId };
    }
    throw error;
  }
}

export async function claimEasyPaisaTransaction(input: EasyPaisaClaimInput) {
  void input;
  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message: "EasyPaisa auto verification is disabled. Submit deposits for manual admin approval.",
  });
}

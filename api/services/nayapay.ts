import {
  Deposit,
  NayaPayTransaction,
  clean,
  nextId,
} from "../mongo/models";
import { approveDepositAndCredit } from "./wallet-ledger";
import { normalizeNayaPayReference } from "./payment-reference";

const PKR_PER_USD = 285;

export type ParsedNayaPayEmail = {
  amount?: number;
  trxId?: string;
  senderName?: string;
  senderAccount?: string;
  paymentDate?: Date;
};

const amountPatterns = [
  /(?:Rs\.?|PKR)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /([\d,]+(?:\.\d{1,2})?)\s*(?:Rs\.?|PKR)/i,
];

const trxIdPatterns = [
  /(?:Trx|Txn|Transaction|Reference|Ref)\s*(?:ID|No\.?|Number)\s*[:#-]?\s*([A-Za-z0-9-]{4,80})/i,
  /\b(?:ID|No)\s*[:#-]\s*([A-Za-z0-9-]{4,80})/i,
  /\b([a-f0-9]{24})\b/i,
];

function parseAmount(message: string) {
  for (const pattern of amountPatterns) {
    const match = message.match(pattern);
    const amount = match ? Number(match[1].replace(/,/g, "")) : undefined;
    if (amount && Number.isFinite(amount)) return amount;
  }
  return undefined;
}

function parseTrxId(message: string) {
  for (const pattern of trxIdPatterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function parsePaymentDate(message: string) {
  const isoLike = message.match(/\b(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?\b/);
  if (isoLike) {
    const [, year, month, day, hour, minute, second = "0"] = isoLike;
    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  const local = message.match(/\b(\d{2})[-/](\d{2})[-/](\d{4})\s+(?:at\s+)?(\d{1,2}):(\d{2})(?::(\d{2}))?\b/i);
  if (!local) return undefined;
  const [, day, month, year, hour, minute, second = "0"] = local;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseSender(message: string) {
  const senderMatch =
    message.match(/You\s+got\s+(?:Rs\.?|PKR)\s*[\d,]+(?:\.\d{1,2})?\s+from\s+(.+?)(?:\n|$)/i) ??
    message.match(/(?:from|sender)\s+(.+?)(?:\s+(?:has|sent|via|on|at)\b|$)/i);
  const accountMatch = message.match(/\b(?:account|wallet|mobile)\s*(?:no\.?|number)?\s*[:#-]?\s*([+\d* -]{6,20})/i);
  return {
    senderName: senderMatch?.[1]?.replace(/[^\p{L}\p{N}\s.'-]/gu, "").trim(),
    senderAccount: accountMatch?.[1]?.trim(),
  };
}

export function parseNayaPayEmail(message: string): ParsedNayaPayEmail {
  return {
    amount: parseAmount(message),
    trxId: parseTrxId(message),
    ...parseSender(message),
    paymentDate: parsePaymentDate(message),
  };
}

export function isDuplicateTransactionError(error: unknown) {
  const anyError = error as { code?: number; message?: string };
  return anyError?.code === 11000 || String(anyError?.message ?? "").toLowerCase().includes("duplicate");
}

function amountsMatch(deposit: any, paidPkr: number) {
  if (deposit.submittedCurrency === "PKR" && deposit.submittedAmount) {
    return Math.abs(Number(deposit.submittedAmount) - paidPkr) < 0.01;
  }
  return Math.abs(Number(deposit.amount) * PKR_PER_USD - paidPkr) < 0.01;
}

export function transactionIdsMatch(left?: string, right?: string) {
  try {
    return normalizeNayaPayReference(String(left ?? "")) === normalizeNayaPayReference(String(right ?? ""));
  } catch {
    return false;
  }
}

export async function creditMatchingNayaPayDeposit(trxId: string) {
  const pendingTransactions = await NayaPayTransaction.find({ status: "pending" })
    .sort({ createdAt: 1 })
    .lean();
  const transaction = clean(pendingTransactions.find((row: any) => transactionIdsMatch(row.trxId, trxId))) as any;
  if (!transaction) return { credited: false, reason: "No pending NayaPay transaction" };

  const paidPkr = Number(transaction.amount);
  const candidates = await Deposit.find({
    method: "nayapay",
    status: { $in: ["pending", "approved"] },
  }).sort({ createdAt: 1 }).lean();

  const deposit = clean(candidates.find((candidate: any) => transactionIdsMatch(candidate.txid, transaction.trxId) && amountsMatch(candidate, paidPkr))) as any;
  if (!deposit) return { credited: false, reason: "No matching pending deposit" };

  const credit = await approveDepositAndCredit({
    depositId: deposit.id,
    adminNote: "Auto-approved from NayaPay email",
  });

  await NayaPayTransaction.updateOne(
    { id: transaction.id, status: "pending" },
    {
      $set: {
        status: "credited",
        creditedDepositId: deposit.id,
        creditedUserId: deposit.userId,
        creditedAt: new Date(),
      },
    },
  );

  return { credited: true, depositId: deposit.id, userId: deposit.userId, creditedUsd: credit.creditedAmount };
}

export async function saveNayaPayEmail(input: {
  message: string;
  source?: string;
}) {
  const parsed = parseNayaPayEmail(input.message);

  if (!parsed.amount || !parsed.trxId) {
    const rejected = await NayaPayTransaction.create({
      id: await nextId("nayapay_transactions"),
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
    console.warn("[nayapay] rejected unparsable email", { id: rejected.id });
    return { duplicate: false, status: "rejected" as const, id: rejected.id };
  }

  try {
    const created = await NayaPayTransaction.create({
      id: await nextId("nayapay_transactions"),
      trxId: parsed.trxId,
      amount: parsed.amount.toFixed(2),
      senderName: parsed.senderName,
      senderAccount: parsed.senderAccount,
      paymentDate: parsed.paymentDate,
      rawMessage: input.message,
      source: input.source,
      status: "pending",
    });
    const credit = await creditMatchingNayaPayDeposit(created.trxId);
    return { duplicate: false, status: created.status, id: created.id, trxId: created.trxId, ...credit };
  } catch (error) {
    if (isDuplicateTransactionError(error)) {
      const existing = await NayaPayTransaction.findOne({ trxId: parsed.trxId }).select("id status trxId").lean();
      const credit = existing?.status === "pending" ? await creditMatchingNayaPayDeposit(parsed.trxId) : { credited: false };
      return { duplicate: true, status: existing?.status ?? "pending", id: existing?.id, trxId: parsed.trxId, ...credit };
    }
    throw error;
  }
}

import type { ClientSession } from "mongoose";
import { TRPCError } from "@trpc/server";
import { PaymentReferenceClaim } from "../mongo/models";

function alphanumericReference(value: string) {
  const normalized = String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalized.length < 4) throw new TRPCError({ code: "BAD_REQUEST", message: "Payment reference is invalid" });
  return normalized;
}

export function normalizeNayaPayReference(value: string) {
  return alphanumericReference(value);
}

export function normalizePaymentReference(value: string, paymentMethod?: string) {
  void paymentMethod;
  return `GLOBAL:${alphanumericReference(value)}`;
}

export async function reservePaymentReference(input: {
  session: ClientSession;
  reference: string;
  sourceType: "deposit" | "direct_order" | "binance_pay_order";
  sourceId: number;
  userId?: number;
  paymentMethod?: string;
}) {
  try {
    await PaymentReferenceClaim.create([{
      key: normalizePaymentReference(input.reference, input.paymentMethod),
      reference: input.reference.trim(),
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      userId: input.userId,
    }], { session: input.session });
  } catch (error: any) {
    if (error?.code === 11000) {
      throw new TRPCError({ code: "CONFLICT", message: "This payment reference has already been used" });
    }
    throw error;
  }
}

export async function findPaymentReferenceClaim(reference: string, session?: ClientSession) {
  const query = PaymentReferenceClaim.findOne({ key: normalizePaymentReference(reference) });
  if (session) query.session(session);
  return query.lean<{ sourceType: "deposit" | "direct_order" | "binance_pay_order"; sourceId: number; userId?: number }>();
}

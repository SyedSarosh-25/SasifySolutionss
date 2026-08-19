import { TRPCError } from "@trpc/server";

export function canonicalDepositUsd(submittedAmount: number, submittedCurrency: "USD" | "PKR", usdToPkrRate: number) {
  const divisor = submittedCurrency === "PKR" ? usdToPkrRate : 1;
  if (!Number.isFinite(submittedAmount) || submittedAmount <= 0 || !Number.isFinite(divisor) || divisor <= 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Submitted payment amount is invalid" });
  }
  const amount = Math.round((submittedAmount / divisor) * 100) / 100;
  if (amount <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Submitted payment amount is too small" });
  return amount;
}

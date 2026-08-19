import { TRPCError } from "@trpc/server";

export function assertProviderCostWithinSale(providerCostCents: number, sellingTotalCents: number) {
  if (!Number.isSafeInteger(providerCostCents) || providerCostCents < 0 || !Number.isSafeInteger(sellingTotalCents) || sellingTotalCents <= 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid provider price quote" });
  }
  if (providerCostCents > sellingTotalCents) {
    throw new TRPCError({ code: "CONFLICT", message: "Provider cost now exceeds the customer price. Purchase paused for repricing." });
  }
}

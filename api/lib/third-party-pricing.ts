export type PricingCurrency = "USD" | "PKR";

export const DEFAULT_USD_TO_PKR = 285;

function finiteAmount(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function effectiveSellingPriceUsd(
  sellingPriceUsd: unknown,
  providerCostUsd: unknown,
): number {
  const sellingPrice = finiteAmount(sellingPriceUsd);
  if (sellingPrice > 0) return sellingPrice;
  const providerCost = finiteAmount(providerCostUsd);
  return providerCost > 0 ? providerCost : 0;
}

export function shouldRepairSellingPrice(
  sellingPriceUsd: unknown,
  providerCostUsd: unknown,
): boolean {
  return finiteAmount(sellingPriceUsd) <= 0 && finiteAmount(providerCostUsd) > 0;
}

export function parseUsdToPkrRate(value: unknown): number {
  const parsed = finiteAmount(value);
  return parsed > 0 ? parsed : DEFAULT_USD_TO_PKR;
}

export function pricingDisplayToUsd(
  amount: unknown,
  currency: PricingCurrency,
  usdToPkrRate: number,
): number {
  const parsedAmount = finiteAmount(amount);
  const rate = parseUsdToPkrRate(usdToPkrRate);
  const usd = currency === "PKR" ? parsedAmount / rate : parsedAmount;
  return Math.round(usd * 100) / 100;
}

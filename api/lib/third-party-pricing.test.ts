import { describe, expect, it } from "vitest";
import {
  effectiveSellingPriceUsd,
  parseUsdToPkrRate,
  pricingDisplayToUsd,
  shouldRepairSellingPrice,
} from "./third-party-pricing";

describe("third-party pricing", () => {
  it("treats a stored string zero selling price as unset and falls back to provider USD cost", () => {
    expect(effectiveSellingPriceUsd("0.00", "20.60")).toBe(20.6);
  });

  it("keeps a positive merchant selling price instead of provider cost", () => {
    expect(effectiveSellingPriceUsd("24.56", "20.60")).toBe(24.56);
  });

  it("repairs only non-positive selling prices when provider cost is positive", () => {
    expect(shouldRepairSellingPrice("0.00", "2.50")).toBe(true);
    expect(shouldRepairSellingPrice("3.00", "2.50")).toBe(false);
    expect(shouldRepairSellingPrice("0.00", "0.00")).toBe(false);
  });

  it("uses the configured USD to PKR rate and a safe fallback", () => {
    expect(parseUsdToPkrRate("300")).toBe(300);
    expect(parseUsdToPkrRate("not-a-number")).toBe(285);
    expect(parseUsdToPkrRate("0")).toBe(285);
  });

  it("normalizes a PKR editor amount to canonical USD with the configured rate", () => {
    expect(pricingDisplayToUsd(6000, "PKR", 300)).toBe(20);
    expect(pricingDisplayToUsd(20.126, "USD", 300)).toBe(20.13);
  });
});

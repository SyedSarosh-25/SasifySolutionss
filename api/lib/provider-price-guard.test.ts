import { describe, expect, it } from "vitest";
import { assertProviderCostWithinSale } from "./provider-price-guard";

describe("provider price guard", () => {
  it("allows a non-loss-making current provider quote", () => {
    expect(() => assertProviderCostWithinSale(2, 4)).not.toThrow();
  });

  it("blocks checkout before provider purchase when live cost exceeds sale price", () => {
    expect(() => assertProviderCostWithinSale(5, 4)).toThrow(/exceeds the customer price/i);
  });
});

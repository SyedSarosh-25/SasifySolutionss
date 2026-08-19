import { describe, expect, it } from "vitest";
import { summarizeCanbosoPurchase } from "./canboso";

describe("Canboso provider status normalization", () => {
  it.each([
    ["cancelled", "cancelled"],
    ["canceled", "cancelled"],
    ["refunded", "refunded"],
    ["failed", "failed"],
    ["rejected", "failed"],
    ["delivered", "delivered"],
    ["processing", "processing"],
  ])("maps %s to %s", (providerStatus, expected) => {
    const result = summarizeCanbosoPurchase({ data: { id: "order-1", status: providerStatus, items: [] } } as any);
    expect(result.status).toBe(expected);
  });

  it("does not mistake provider wallet/amount units for USD cost", () => {
    const result = summarizeCanbosoPurchase({ data: { id: "order-2", status: "delivered", amount: 500, items: ["credential"] } } as any);
    expect(result.priceUsd).toBeUndefined();
  });

  it("accepts only explicitly USD-denominated cost fields", () => {
    const result = summarizeCanbosoPurchase({ data: { id: "order-3", status: "delivered", totalPriceUsd: 0.02, items: ["credential"] } } as any);
    expect(result.priceUsd).toBe(0.02);
  });
});

import { describe, expect, it } from "vitest";
import { summarizeAkundingOrder } from "./akunding";

describe("Akunding provider status normalization", () => {
  it.each([
    ["cancelled", "cancelled"],
    ["refunded", "refunded"],
    ["failed", "failed"],
    ["rejected", "failed"],
    ["delivered", "delivered"],
    ["processing", "processing"],
  ])("maps %s to %s", (providerStatus, expected) => {
    const result = summarizeAkundingOrder({ data: { id: 12, status: providerStatus, items: [] } } as any);
    expect(result.status).toBe(expected);
  });

  it("does not treat ambiguous provider-native amount fields as USD", () => {
    const result = summarizeAkundingOrder({ data: { id: 13, status: "delivered", amount: 500, price: 500, total_price: 500, items: ["credential"] } } as any);
    expect(result.priceUsd).toBeUndefined();
  });

  it("accepts only explicitly USD-denominated provider cost", () => {
    const result = summarizeAkundingOrder({ data: { id: 14, status: "delivered", amount: 500, total_price_usd: 0.25, items: ["credential"] } } as any);
    expect(result.priceUsd).toBe(0.25);
  });
});

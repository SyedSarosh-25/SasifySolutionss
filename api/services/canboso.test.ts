import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/provider-keys", () => ({
  getProviderApiKey: vi.fn().mockResolvedValue("test-buyer-key"),
}));

import {
  listCanbosoProducts,
  normalizeCanbosoProduct,
  purchaseCanbosoProduct,
  summarizeCanbosoPurchase,
} from "./canboso";

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it("reads delivery accounts from the v2 response", () => {
    const result = summarizeCanbosoPurchase({
      success: true,
      order: { orderCode: "ORDER-1", status: "completed" },
      delivery: { accounts: [{ user: "account@example.com", password: "secret" }] },
    } as any);
    expect(result.status).toBe("delivered");
    expect(result.externalOrderId).toBe("ORDER-1");
    expect(result.items).toHaveLength(1);
  });

  it("uses the v2 products endpoint and query key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      products: [{
        productId: "product-1",
        name: "Test product",
        productType: "account",
        price: { amount: 2.5, currency: "USD", text: "$2.50" },
        availability: { available: 4, sold: 1 },
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const products = await listCanbosoProducts();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://canboso.com/api/v2/telegram-buyer/products?key=test-buyer-key",
      { headers: { Accept: "application/json" } },
    );
    expect(normalizeCanbosoProduct(products[0])).toMatchObject({ id: "product-1", priceUsd: 2.5, stock: 4 });
  });

  it("sends the v2 purchase body and idempotency header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      order: { orderCode: "ORDER-2", status: "completed" },
      delivery: { accounts: [] },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await purchaseCanbosoProduct({ productId: "product-1", quantity: 2, idempotencyKey: "purchase-1" });

    expect(fetchMock).toHaveBeenCalledWith("https://canboso.com/api/v2/telegram-buyer/purchase", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", "Idempotency-Key": "purchase-1" },
      body: JSON.stringify({ key: "test-buyer-key", product_id: "product-1", quantity: 2 }),
    });
  });

  it("refuses to treat non-USD wallet amounts as USD", () => {
    expect(() => normalizeCanbosoProduct({
      _id: "product-1",
      product_name: "Test product",
      walletPricing: 50_000,
      walletCurrency: "VND",
      stats: { available: 1 },
    } as any)).toThrow(/cannot be treated as USD/);
  });
});

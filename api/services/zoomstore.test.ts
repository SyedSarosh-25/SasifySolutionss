import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/provider-keys", () => ({
  getProviderApiKey: vi.fn().mockResolvedValue("zoom-test-key"),
}));

import {
  calculateZoomStorePrice,
  listZoomStoreProducts,
  normalizeZoomStoreProduct,
  purchaseZoomStoreProduct,
  summarizeZoomStorePurchase,
} from "./zoomstore";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ZoomStore provider", () => {
  it("normalizes products and calculates quantity pricing", () => {
    const product = { id: "12", name: "Example", price: 1.25, stock: 4, in_stock: true };
    expect(normalizeZoomStoreProduct(product)).toMatchObject({ id: "12", priceUsd: 1.25, stock: 4, instant: true });
    expect(calculateZoomStorePrice(product, 3)).toBe(3.75);
  });

  it("uses X-API-Key for the product list", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      products: [{ id: 12, name: "Example", price: 1.25, stock: 4, in_stock: true }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const products = await listZoomStoreProducts();

    expect(fetchMock).toHaveBeenCalledWith("https://api.zoomstore255.com/api/v1/products", {
      headers: { Accept: "application/json", "X-API-Key": "zoom-test-key" },
    });
    expect(products[0].id).toBe("12");
  });

  it("sends an idempotency key with purchase requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      order_id: "order-1",
      codes: ["credential"],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await purchaseZoomStoreProduct({ productId: "12", quantity: 2, idempotencyKey: "purchase-12" });

    expect(fetchMock).toHaveBeenCalledWith("https://api.zoomstore255.com/api/v1/purchase", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "X-API-Key": "zoom-test-key",
        "Content-Type": "application/json",
        "Idempotency-Key": "purchase-12",
      },
      body: JSON.stringify({ product_id: "12", quantity: 2 }),
    });
    expect(summarizeZoomStorePurchase(response)).toMatchObject({
      externalOrderId: "order-1",
      status: "delivered",
      items: [{ type: "text", content: "credential" }],
    });
  });
});

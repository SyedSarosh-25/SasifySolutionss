import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/provider-keys", () => ({
  getProviderApiKey: vi.fn().mockResolvedValue("sson-test-key"),
}));

import { calculateSsonPrice, listSsonProducts, normalizeSsonProduct } from "./sson-digital";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SSOn Digital provider", () => {
  it("normalizes products as manual fulfillment", () => {
    const product = { id: "7", name: "Example", price: 2, stock: 3, category: "Accounts" };
    expect(normalizeSsonProduct(product)).toMatchObject({
      id: "7",
      priceUsd: 2,
      stock: 3,
      categoryName: "Accounts",
      instant: false,
    });
    expect(calculateSsonPrice(product, 2)).toBe(4);
  });

  it("uses the documented read-only products endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      reseller: { balance: 1.95 },
      products: [{ id: 7, name: "Example", price: 2, stock: 3 }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const products = await listSsonProducts();

    expect(fetchMock).toHaveBeenCalledWith("https://ssondigitalworks.online/api/reseller?action=products", {
      headers: { Accept: "application/json", "X-API-Key": "sson-test-key" },
    });
    expect(products[0].id).toBe("7");
  });
});

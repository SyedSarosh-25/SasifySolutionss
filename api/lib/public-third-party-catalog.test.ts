import { describe, expect, it } from "vitest";
import { sanitizeCustomerText, toCustomerDirectProduct, toCustomerThirdPartyProduct } from "./public-third-party-catalog";

describe("public third-party catalog privacy", () => {
  it("removes supplier names from customer-facing copy", () => {
    expect(sanitizeCustomerText("Technysoft via CANBOSO and akunding delivery")).toBe("Sasify via Sasify and Sasify delivery");
  });

  it("returns an explicit customer-safe DTO", () => {
    const dto = toCustomerThirdPartyProduct({
      id: 7,
      provider: "akunding",
      externalProductId: "upstream-42",
      title: "Technysoft Pro Access",
      categoryName: "Canboso Accounts",
      description: "Delivered by Akunding",
      sourceDescription: "raw provider copy",
      sourcePriceUsd: "2.50",
      sourceStock: 14,
      unlimited: false,
      instant: true,
      priceUsd: "7.00",
      priceCurrency: "USD",
      priceDisplayAmount: "7.00",
      originalPriceUsd: "10.00",
      originalPriceCurrency: "USD",
      originalPriceDisplayAmount: "10.00",
    });

    expect(dto).toMatchObject({
      id: 7,
      slug: "third-party-7",
      name: "Sasify Pro Access",
      categoryName: "Sasify Accounts",
      description: "Delivered by Sasify",
      stock: 14,
      maxQuantity: 1000,
      priceUsd: 7,
    });
    expect(Object.keys(dto)).not.toEqual(expect.arrayContaining([
      "provider",
      "providerLabel",
      "externalProductId",
      "sourcePriceUsd",
      "sourceDescription",
      "stockSource",
    ]));
  });

  it("returns real direct-product stock and never blocks manual activation on inventory", () => {
    expect(toCustomerDirectProduct({
      product: { id: 4, slug: "instant", name: "Instant", categoryId: 2, fulfillmentType: "credentials" },
      plan: { id: 8, price: "2.00" },
      categoryName: "Tools",
      availableStock: 3,
    })).toMatchObject({ stock: 3, unlimited: false, maxQuantity: 1, isDirect: true });

    expect(toCustomerDirectProduct({
      product: { id: 5, slug: "manual", name: "Manual", categoryId: 2, fulfillmentType: "whatsapp_activation" },
      plan: { id: 9, price: "4.00" },
      categoryName: "Tools",
      availableStock: 0,
    })).toMatchObject({ stock: 0, unlimited: true, instant: false, maxQuantity: 1, isDirect: true });
  });
});

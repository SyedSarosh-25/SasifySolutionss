import { describe, expect, it } from "vitest";
import { sanitizeAdminMarketplaceOrderSummary } from "./admin-marketplace-order";

describe("admin marketplace order summary", () => {
  it("never carries credential-bearing fields into bulk list responses", () => {
    const summary = sanitizeAdminMarketplaceOrderSummary({
      id: 42,
      productName: "Example",
      status: "delivered",
      items: [{ content: "sensitive" }],
      itemsEncrypted: "encrypted-payload",
      rawOrder: { delivery: "sensitive" },
      providerRaw: { delivery: "sensitive" },
      codes: "sensitive",
      password: "sensitive",
      token: "sensitive",
      secret: "sensitive",
      apiKey: "sensitive",
      credentialPayload: "sensitive",
      delivery: { licenseKey: "sensitive" },
    });

    expect(summary).toEqual({ id: 42, productName: "Example", status: "delivered", items: [] });
  });
});

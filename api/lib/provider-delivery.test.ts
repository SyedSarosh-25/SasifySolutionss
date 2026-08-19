import { describe, expect, it } from "vitest";
import { providerDeliveryFields, readProviderDeliveryItems, sanitizeProviderDeliveryItems } from "./provider-delivery";
import { ThirdPartyProduct } from "../mongo/models";

describe("provider delivery sanitizer", () => {
  it("allows multiple independently gated live provider-purchase products", () => {
    const index = ThirdPartyProduct.schema.indexes().find(([keys]: any) => keys.providerPurchaseEnabled === 1);
    expect(index?.[1]?.unique).not.toBe(true);
  });
  it("keeps customer credentials while dropping upstream metadata", () => {
    expect(sanitizeProviderDeliveryItems([{
      email: "buyer@example.test",
      password: "sample-value",
      wholesale_cost: 0.25,
      provider_order_id: "internal-123",
      diagnostics: { trace: "hidden" },
    }])).toEqual([{ type: "text", content: "Email: buyer@example.test\nPassword: sample-value" }]);
  });

  it("drops objects with no explicitly customer-facing fields", () => {
    expect(sanitizeProviderDeliveryItems([{ id: 1, cost: 2, metadata: { provider: true } }])).toEqual([]);
  });

  it("persists marketplace deliverables only as encrypted payloads", () => {
    const previous = process.env.CREDENTIAL_ENCRYPTION_KEY;
    process.env.CREDENTIAL_ENCRYPTION_KEY = "qa-provider-delivery-encryption-key";
    try {
      const fields = providerDeliveryFields([{ email: "buyer@example.test", password: "secret-value" }]);
      expect(fields.items).toEqual([]);
      expect(fields.itemsEncrypted).toMatch(/^enc:v1:/);
      expect(fields.itemsEncrypted).not.toContain("secret-value");
      expect(readProviderDeliveryItems(fields)).toEqual([{ type: "text", content: "Email: buyer@example.test\nPassword: secret-value" }]);
    } finally {
      if (previous === undefined) delete process.env.CREDENTIAL_ENCRYPTION_KEY;
      else process.env.CREDENTIAL_ENCRYPTION_KEY = previous;
    }
  });
});

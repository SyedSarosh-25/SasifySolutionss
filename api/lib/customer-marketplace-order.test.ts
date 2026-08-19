import { describe, expect, it } from "vitest";
import { toCustomerMarketplaceOrder } from "./customer-marketplace-order";

describe("customer marketplace order DTO", () => {
  it("does not expose provider identity or internal reconciliation fields", () => {
    const dto = toCustomerMarketplaceOrder({
      id: 1,
      provider: "canboso",
      externalProductId: "upstream-1",
      reconciliationStatus: "needs_review",
      productName: "Sasify Access",
      quantity: 1,
      priceUsd: "0.04",
      status: "processing",
    });
    expect(dto).not.toHaveProperty("provider");
    expect(dto).not.toHaveProperty("externalProductId");
    expect(dto).not.toHaveProperty("reconciliationStatus");
  });

  it("releases items only after terminal delivery was claimed", () => {
    expect(toCustomerMarketplaceOrder({ status: "delivered", items: ["secret"] }).items).toEqual([]);
    expect(toCustomerMarketplaceOrder({ status: "delivered", credentialsReleasedAt: new Date(), items: ["secret"] }).items).toEqual([]);
    expect(toCustomerMarketplaceOrder({ status: "delivered", credentialsReleasedAt: new Date(), items: ["secret"] }, { includeDelivery: true }).items).toEqual([{ type: "text", content: "secret" }]);
  });
});

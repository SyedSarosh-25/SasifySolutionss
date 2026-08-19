import { describe, expect, it } from "vitest";
import { ThirdPartyOrder } from "../mongo/models";
import { hasReleasedDeliveredCredentials } from "./third-party-orders";

describe("marketplace credential release invariants", () => {
  it("persists the credential-release barrier in the order schema", () => {
    expect(ThirdPartyOrder.schema.path("credentialsReleasedAt")).toBeTruthy();
  });

  it("blocks refunds only after delivered credentials have been released", () => {
    expect(hasReleasedDeliveredCredentials({ status: "delivered", credentialsReleasedAt: new Date() })).toBe(true);
    expect(hasReleasedDeliveredCredentials({ status: "delivered" })).toBe(false);
    expect(hasReleasedDeliveredCredentials({ status: "refunded", credentialsReleasedAt: new Date() })).toBe(false);
  });
});
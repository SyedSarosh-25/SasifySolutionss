import { describe, expect, it } from "vitest";
import { manualCompletionState } from "./manual-fulfillment";

describe("manual fulfillment completion", () => {
  it("allows only pending WhatsApp activation orders", () => {
    expect(manualCompletionState({ status: "pending_fulfillment", deliveryStatus: "pending_fulfillment", fulfillmentType: "whatsapp_activation" })).toBe("eligible");
    expect(manualCompletionState({ status: "pending_fulfillment", fulfillmentType: "credentials" })).toBe("ineligible");
  });

  it("recognizes a safe idempotent replay", () => {
    expect(manualCompletionState({ status: "delivered", deliveryStatus: "delivered", fulfillmentType: "whatsapp_activation" })).toBe("replayed");
  });
});

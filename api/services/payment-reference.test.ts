import { describe, expect, it } from "vitest";
import { PaymentReferenceClaim } from "../mongo/models";
import { normalizeNayaPayReference, normalizePaymentReference } from "./payment-reference";

describe("global payment reference claims", () => {
  it("normalizes formatting and case before uniqueness checks", () => {
    expect(normalizePaymentReference(" tx-12 34 ")).toBe("GLOBAL:TX1234");
    expect(normalizePaymentReference("TX1234")).toBe("GLOBAL:TX1234");
    expect(normalizePaymentReference("51853297370", "nayapay")).toBe("GLOBAL:51853297370");
    expect(normalizePaymentReference("51853297370", "easypaisa")).toBe(normalizePaymentReference("51853297370", "nayapay"));
    expect(normalizeNayaPayReference("TMICFBPK260626051853297370")).toBe("TMICFBPK260626051853297370");
    expect(normalizeNayaPayReference("ATTACK9900000051853297370")).not.toBe(normalizeNayaPayReference("51853297370"));
  });

  it("uses one unique namespace across deposits and direct orders", () => {
    const options = (PaymentReferenceClaim.schema.path("key") as any).options;
    expect(options.unique).toBe(true);
    expect(options.required).toBe(true);
  });
});

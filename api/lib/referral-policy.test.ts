import { describe, expect, it } from "vitest";
import {
  DEFAULT_REFERRAL_SETTINGS,
  calculateCommission,
  commissionAvailableAt,
  referralSettingsFromRecord,
  referralSettingsInputSchema,
} from "./referral-policy";

describe("referral financial policy", () => {
  it("calculates money using integer cents and rounds commission down", () => {
    expect(calculateCommission("19.99", 5)).toEqual({
      baseAmount: "19.99",
      percentage: "5.00",
      amount: "0.99",
      amountCents: 99,
    });
    expect(calculateCommission("100.00", 10)).toMatchObject({ amount: "10.00", amountCents: 1000 });
  });

  it("validates bounded admin percentages and preserves reseller precedence", () => {
    expect(referralSettingsInputSchema.parse({ ...DEFAULT_REFERRAL_SETTINGS, userPercent: 6, resellerPercent: 12 })).toMatchObject({ userPercent: 6, resellerPercent: 12 });
    expect(() => referralSettingsInputSchema.parse({ ...DEFAULT_REFERRAL_SETTINGS, userPercent: 12, resellerPercent: 6 })).toThrow();
    expect(() => referralSettingsInputSchema.parse({ ...DEFAULT_REFERRAL_SETTINGS, resellerPercent: 45 })).toThrow();
  });

  it("fails closed when stored settings are malformed", () => {
    expect(referralSettingsFromRecord({ referral_user_percent: "NaN", referral_reseller_percent: "-2" })).toEqual({
      ...DEFAULT_REFERRAL_SETTINGS,
      enabled: false,
      userPercent: 0,
      resellerPercent: 0,
    });
    expect(referralSettingsFromRecord({
      referral_enabled: "false",
      referral_user_percent: "4",
      referral_reseller_percent: "9",
      referral_hold_days: "14",
      referral_min_conversion: "2.50",
    })).toEqual({ enabled: false, userPercent: 4, resellerPercent: 9, holdDays: 14, minConversion: 2.5 });
  });

  it("computes the exact hold release date", () => {
    expect(commissionAvailableAt(new Date("2026-07-22T00:00:00.000Z"), 7).toISOString()).toBe("2026-07-29T00:00:00.000Z");
  });
});

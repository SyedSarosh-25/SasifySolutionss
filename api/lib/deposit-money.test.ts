import { describe, expect, it } from "vitest";
import { canonicalDepositUsd } from "./deposit-money";

describe("canonical deposit money", () => {
  it("derives PKR deposits from the server exchange-rate snapshot", () => {
    expect(canonicalDepositUsd(2_850, "PKR", 285)).toBe(10);
    expect(canonicalDepositUsd(300, "PKR", 285)).toBe(1.05);
  });

  it("uses the submitted USD amount rather than a second client representation", () => {
    expect(canonicalDepositUsd(12.345, "USD", 999)).toBe(12.35);
  });

  it("rejects invalid amounts and rates", () => {
    expect(() => canonicalDepositUsd(0, "USD", 1)).toThrow(/invalid/);
    expect(() => canonicalDepositUsd(100, "PKR", 0)).toThrow(/invalid/);
  });
});

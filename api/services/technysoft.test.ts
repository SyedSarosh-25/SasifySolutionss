import { describe, expect, it } from "vitest";
import { normalizeTechnysoftOrderStatus } from "./technysoft";

describe("Technysoft provider status normalization", () => {
  it.each([
    ["delivered", "delivered"],
    ["completed", "delivered"],
    ["rejected", "failed"],
    ["failed", "failed"],
    ["cancelled", "cancelled"],
    ["refunded", "refunded"],
    ["queued", "processing"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeTechnysoftOrderStatus(input)).toBe(expected);
  });
});
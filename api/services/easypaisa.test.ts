import { describe, expect, it } from "vitest";
import {
  isDuplicateTransactionError,
  parseEasyPaisaNotification,
  validateClaimAmount,
} from "./easypaisa";

describe("EasyPaisa notification parsing", () => {
  it("extracts amount, trx id, sender, account, and payment date", () => {
    const parsed = parseEasyPaisaNotification(
      "Dear SYED ADEEN SAROSH, You have received Rs.1500 in your Easypaisa account **********5711 from SYED ADEEN SAROSH PK**WMBLPKKA****5711 via Raast Payment on 26-06-2026 at 13:13:07. Trx ID: 51839979260",
    );

    expect(parsed.amount).toBe(1500);
    expect(parsed.trxId).toBe("51839979260");
    expect(parsed.senderName).toBe("SYED ADEEN SAROSH");
    expect(parsed.senderAccount).toBe("PK**WMBLPKKA****5711");
    expect(parsed.paymentDate?.getFullYear()).toBe(2026);
  });

  it("supports comma amounts and alternate transaction labels", () => {
    expect(parseEasyPaisaNotification("received Rs 1,500. Transaction ID: ABC123").amount).toBe(1500);
    expect(parseEasyPaisaNotification("received Rs.2,000. TXN ID: 999XYZ").trxId).toBe("999XYZ");
  });
});

describe("EasyPaisa claim checks", () => {
  it("detects duplicate trx id database errors", () => {
    expect(isDuplicateTransactionError({ code: 11000 })).toBe(true);
    expect(isDuplicateTransactionError(new Error("duplicate key error"))).toBe(true);
  });

  it("rejects amount mismatches and accepts exact received amount", () => {
    expect(validateClaimAmount(1500, 1500)).toBe(true);
    expect(validateClaimAmount(1500, 1400)).toBe(false);
  });
});

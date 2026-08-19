import { describe, expect, it } from "vitest";
import { parseNayaPayEmail, transactionIdsMatch } from "./nayapay";

describe("NayaPay email parsing", () => {
  it("extracts amount, sender, and transaction id from the real NayaPay receipt format", () => {
    const parsed = parseNayaPayEmail(`
      You got Rs. 1,360 from Naimat Ullah Khan
      Naimat Ullah Khan
      naimat.ullah.210@nayapay
      Rs. 1,360
      25 Jun 2026, 04:23 PM

      AMOUNT DETAILS
      Principal Amount Rs. 1,360
      Service Fee Rs. 0
      Amount Received Rs. 1,360

      TRANSACTION DETAILS
      Transaction ID 6a3d11dbcb757d1abaa57f0e
    `);

    expect(parsed.amount).toBe(1360);
    expect(parsed.trxId).toBe("6a3d11dbcb757d1abaa57f0e");
    expect(parsed.senderName).toBe("Naimat Ullah Khan");
  });

  it("extracts amount and transaction id from common receipt text", () => {
    const parsed = parseNayaPayEmail(
      "You have received PKR 1,500 from Ali Khan. Transaction ID: NP123456789 on 26-06-2026 at 13:13:07.",
    );

    expect(parsed.amount).toBe(1500);
    expect(parsed.trxId).toBe("NP123456789");
    expect(parsed.paymentDate?.getFullYear()).toBe(2026);
  });

  it("supports alternate amount and reference labels", () => {
    const parsed = parseNayaPayEmail("Payment received: 2500 PKR Ref No: NYP-998877");

    expect(parsed.amount).toBe(2500);
    expect(parsed.trxId).toBe("NYP-998877");
  });

  it("extracts bare NayaPay transaction ids from compact Gmail plain text", () => {
    const parsed = parseNayaPayEmail(
      "You got Rs. 1,600 from Jahanzaib Arshad 🎉\n1,600 Jahanzaib Arshad 6a3d87e1536382215763c8da 26 Jun 2026, 12:56 AM jahanzaibpay",
    );

    expect(parsed.amount).toBe(1600);
    expect(parsed.trxId).toBe("6a3d87e1536382215763c8da");
  });

  it("requires the full NayaPay transaction reference", () => {
    expect(transactionIdsMatch("51853297370", "TMICFBPK260626051853297370")).toBe(false);
    expect(transactionIdsMatch("TMIC-FBPK-260626051853297370", "TMICFBPK260626051853297370")).toBe(true);
    expect(transactionIdsMatch("ATTACK9900000051853297370", "TMICFBPK260626051853297370")).toBe(false);
  });

  it("does not accept arbitrary substring aliases", () => {
    expect(transactionIdsMatch("12345678", "XX12345678YY")).toBe(false);
    expect(transactionIdsMatch("6a3d11db", "6a3d11dbcb757d1abaa57f0e")).toBe(false);
  });
});

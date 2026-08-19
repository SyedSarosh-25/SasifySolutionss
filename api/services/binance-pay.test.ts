import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  assertBinancePayCredential,
  assertFreshBinanceTimestamp,
  parseBinanceCreateOrderResponse,
  parseBinancePayWebhook,
  parseBinanceQueryOrderResponse,
  signBinancePayPayload,
  validateBinanceSettlementBinding,
  verifyWebhookWithPublicKey,
} from "./binance-pay";

describe("Binance Pay merchant contracts", () => {
  it("signs Binance request payloads exactly", () => {
    expect(signBinancePayPayload("1700000000000", "nonce", '{"a":1}', "secret")).toBe(
      crypto.createHmac("sha512", "secret").update('1700000000000\nnonce\n{"a":1}\n').digest("hex").toUpperCase(),
    );
  });

  it("rejects blank credentials and control characters", () => {
    expect(assertBinancePayCredential("  abcDEF-123  ", "API Identity Key")).toBe("abcDEF-123");
    expect(() => assertBinancePayCredential("", "API Identity Key")).toThrow(/required/i);
    expect(() => assertBinancePayCredential("abc\nheader", "API Identity Key")).toThrow(/invalid/i);
  });

  it("strictly parses customer-safe create-order data", () => {
    const parsed = parseBinanceCreateOrderResponse({
      status: "SUCCESS",
      code: "000000",
      data: {
        prepayId: "123456",
        expireTime: 1700000300000,
        currency: "USDT",
        totalFee: "12.34",
        qrcodeLink: "https://qr.example/order",
        qrContent: "binance://pay/123",
        checkoutUrl: "https://pay.binance.com/checkout/123",
        deeplink: "bnc://app.binance.com/payment/secpay/123",
        universalUrl: "https://app.binance.com/payment/secpay/123",
      },
    });
    expect(parsed.prepayId).toBe("123456");
    expect(parsed.currency).toBe("USDT");
    expect(parsed.amountCents).toBe(1234);
    expect(parsed.checkoutUrl).toMatch(/^https:\/\//);
    expect(Object.keys(parsed)).not.toContain("apiSecret");
  });

  it("rejects malformed or failed create-order data", () => {
    expect(() => parseBinanceCreateOrderResponse({ status: "FAIL", code: "400003", errorMessage: "rejected" })).toThrow(/rejected/i);
    expect(() => parseBinanceCreateOrderResponse({ status: "SUCCESS", code: "000000", data: { prepayId: "" } })).toThrow(/invalid/i);
  });

  it("parses authoritative query state and rejects malformed data", () => {
    const order = parseBinanceQueryOrderResponse({
      status: "SUCCESS",
      code: "000000",
      data: {
        merchantTradeNo: "SAS123ABC",
        prepayId: "999",
        transactionId: "tx-1",
        status: "PAID",
        currency: "USDT",
        orderAmount: "12.34",
      },
    });
    expect(order.status).toBe("PAID");
    expect(order.amountCents).toBe(1234);
    expect(() => parseBinanceQueryOrderResponse({ status: "SUCCESS", code: "000000", data: { status: "PAID" } })).toThrow(/invalid/i);
  });

  it("enforces the webhook replay window", () => {
    expect(() => assertFreshBinanceTimestamp("1700000000000", 1700000000000)).not.toThrow();
    expect(() => assertFreshBinanceTimestamp("1699999000000", 1700000000000)).toThrow(/timestamp/i);
    expect(() => assertFreshBinanceTimestamp("not-a-time", 1700000000000)).toThrow(/timestamp/i);
  });

  it("verifies the exact raw webhook bytes with Binance RSA semantics", () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const timestamp = "1700000000000";
    const nonce = "nonce";
    const rawBody = '{"bizType":"PAY","bizStatus":"PAY_SUCCESS","data":"{}"}';
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(`${timestamp}\n${nonce}\n${rawBody}\n`);
    signer.end();
    const signature = signer.sign(privateKey).toString("base64");
    expect(verifyWebhookWithPublicKey({ timestamp, nonce, signature, rawBody, publicKey: publicKey.export({ type: "spki", format: "pem" }).toString() })).toBe(true);
    expect(verifyWebhookWithPublicKey({ timestamp, nonce, signature, rawBody: `${rawBody} `, publicKey: publicKey.export({ type: "spki", format: "pem" }).toString() })).toBe(false);
  });

  it("parses only bounded PAY notifications with string data", () => {
    const notification = parseBinancePayWebhook(JSON.stringify({
      bizType: "PAY",
      bizStatus: "PAY_SUCCESS",
      bizId: "prepay-1",
      data: JSON.stringify({ merchantTradeNo: "SAS123", prepayId: "prepay-1", transactionId: "tx-1", totalFee: "5.00", currency: "USDT" }),
    }));
    expect(notification.data.merchantTradeNo).toBe("SAS123");
    expect(() => parseBinancePayWebhook("not-json")).toThrow(/invalid/i);
    expect(() => parseBinancePayWebhook(JSON.stringify({ bizType: "PAY", bizStatus: "PAY_SUCCESS", data: {} }))).toThrow(/invalid/i);
  });

  it("binds settlement to the immutable local order value and provider IDs", () => {
    const local = { merchantTradeNo: "SAS123", prepayId: "prepay-1", amountCents: 500, currency: "USDT" };
    const authoritative = { merchantTradeNo: "SAS123", prepayId: "prepay-1", transactionId: "tx-1", status: "PAID", amountCents: 500, currency: "USDT" };
    expect(validateBinanceSettlementBinding(local, authoritative)).toEqual(authoritative);
    expect(() => validateBinanceSettlementBinding(local, { ...authoritative, amountCents: 501 })).toThrow(/amount/i);
    expect(() => validateBinanceSettlementBinding(local, { ...authoritative, currency: "USDC" })).toThrow(/currency/i);
    expect(() => validateBinanceSettlementBinding(local, { ...authoritative, status: "PENDING" })).toThrow(/paid/i);
    expect(() => validateBinanceSettlementBinding(local, { ...authoritative, transactionId: "" })).toThrow(/transaction/i);
  });
});

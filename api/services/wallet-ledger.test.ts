import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { centsToMoney, moneyToCents, walletReplayMatches } from "./wallet-ledger";
import { BinancePayOrder, BinancePayWebhookEvent, Deposit, Order, PaymentReferenceClaim, ThirdPartyOrder, WalletTransaction } from "../mongo/models";

describe("wallet ledger invariants", () => {
  it("normalizes decimal money through integer cents", () => {
    expect(moneyToCents("1.05")).toBe(105);
    expect(moneyToCents(10.555)).toBe(1056);
    expect(centsToMoney(1056)).toBe("10.56");
  });

  it("rejects non-money values", () => {
    expect(() => moneyToCents("not-money")).toThrow(TRPCError);
    expect(() => centsToMoney(Number.MAX_SAFE_INTEGER + 1)).toThrow(/safe integer/);
  });

  it("enforces unique sparse operation keys and order idempotency keys", () => {
    const walletKey = WalletTransaction.schema.path("operationKey").options as any;
    const orderKey = Order.schema.path("idempotencyKey").options as any;
    expect(walletKey.unique).toBe(true);
    expect(walletKey.sparse).toBe(true);
    expect(orderKey.unique).toBe(true);
    expect(orderKey.sparse).toBe(true);
  });

  it("enforces unique payment references and supports smoke fulfillment state", () => {
    const depositTxid = Deposit.schema.path("txid").options as any;
    const orderTxid = Order.schema.path("paymentTxid").options as any;
    const thirdPartyStatus = ThirdPartyOrder.schema.path("status") as any;
    expect(depositTxid.unique).toBe(true);
    expect(depositTxid.sparse).toBe(true);
    expect(orderTxid.unique).toBe(true);
    expect(orderTxid.sparse).toBe(true);
    expect(thirdPartyStatus.enumValues).toContain("pending_fulfillment");
  });

  it("enforces Binance Pay provider and replay uniqueness at the database boundary", () => {
    for (const field of ["clientRequestKey", "merchantTradeNo", "prepayId", "transactionId"]) {
      expect((BinancePayOrder.schema.path(field).options as any).unique).toBe(true);
    }
    expect((BinancePayWebhookEvent.schema.path("eventDigest").options as any).unique).toBe(true);
    expect((WalletTransaction.schema.path("referenceType") as any).enumValues).toContain("binance_pay_order");
    expect((PaymentReferenceClaim.schema.path("sourceType") as any).enumValues).toContain("binance_pay_order");
  });

  it("binds wallet idempotency replays to their financial reference", () => {
    const input = { userId: 7, type: "credit" as const, amountCents: 500, referenceType: "binance_pay_order" as const, referenceId: 42 };
    const existing = { userId: 7, type: "credit", amount: "5.00", referenceType: "binance_pay_order", referenceId: 42 };
    expect(walletReplayMatches(existing, input)).toBe(true);
    expect(walletReplayMatches({ ...existing, referenceType: "deposit" }, input)).toBe(false);
    expect(walletReplayMatches({ ...existing, referenceId: 41 }, input)).toBe(false);
  });
});

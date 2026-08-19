import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import { AuditLog, BinancePayOrder, BinancePayWebhookEvent, SiteSetting, clean, cleanMany, nextId } from "../mongo/models";
import { env } from "../lib/env";
import { applyWalletMutation, centsToMoney, moneyToCents, runInTransaction } from "./wallet-ledger";
import {
  BinancePayTransportError,
  parseBinancePayWebhook,
  queryBinancePayOrder,
  requestBinanceCreateOrder,
  validateBinanceSettlementBinding,
} from "./binance-pay";
import { findPaymentReferenceClaim, reservePaymentReference } from "./payment-reference";

const ACTIVE_RECONCILIATION_STATUSES = ["pending", "paid", "needs_review"];

function safeOrder(row: any) {
  return {
    id: row.id,
    merchantTradeNo: row.merchantTradeNo,
    prepayId: row.prepayId,
    amount: centsToMoney(row.amountCents),
    currency: row.currency,
    status: row.status,
    checkoutUrl: row.checkoutUrl,
    qrcodeLink: row.qrcodeLink,
    qrContent: row.qrContent,
    deeplink: row.deeplink,
    universalUrl: row.universalUrl,
    expireTime: row.expireTime,
    settledAt: row.settledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function binancePayLiveEnabled() {
  const setting = await SiteSetting.findOne({ key: "binance_pay_live_enabled" }).select("value").lean<{ value?: string }>();
  return setting?.value === "true";
}

function merchantTradeNo(id: number) {
  const random = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `SAS${Date.now().toString(36).toUpperCase()}${id.toString(36).toUpperCase()}${random}`.slice(0, 32);
}

function requirePublicOrigin() {
  const raw = env.publicAppUrl.trim();
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && env.isProduction) throw new Error();
    return url.origin;
  } catch {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Public application URL is not configured for Binance Pay" });
  }
}

export async function createBinancePayOrder(input: { userId: number; amount: number; currency: "USDT"; clientRequestKey: string }) {
  if (!await binancePayLiveEnabled()) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Binance Pay Live is disabled. Use the manual Binance Pay deposit method." });
  }
  const amountCents = moneyToCents(input.amount);
  if (amountCents < 100 || amountCents > 500_000) throw new TRPCError({ code: "BAD_REQUEST", message: "Binance Pay amount must be between 1.00 and 5000.00 USDT" });
  if (Math.abs(input.amount * 100 - amountCents) > 1e-7) throw new TRPCError({ code: "BAD_REQUEST", message: "Binance Pay amount supports at most two decimals" });

  const existing = clean(await BinancePayOrder.findOne({ clientRequestKey: input.clientRequestKey }).lean()) as any;
  if (existing) {
    if (existing.userId !== input.userId || existing.amountCents !== amountCents || existing.currency !== input.currency) {
      throw new TRPCError({ code: "CONFLICT", message: "Payment request key was already used for different details" });
    }
    return safeOrder(existing);
  }

  const id = await nextId("binance_pay_orders");
  const tradeNo = merchantTradeNo(id);
  const origin = requirePublicOrigin();
  try {
    await BinancePayOrder.create({
      id,
      userId: input.userId,
      clientRequestKey: input.clientRequestKey,
      merchantTradeNo: tradeNo,
      amountCents,
      purpose: "wallet_deposit",
      currency: input.currency,
      status: "creating",
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      const replay = clean(await BinancePayOrder.findOne({ clientRequestKey: input.clientRequestKey }).lean()) as any;
      if (replay && replay.userId === input.userId && replay.amountCents === amountCents && replay.currency === input.currency) return safeOrder(replay);
      throw new TRPCError({ code: "CONFLICT", message: "Payment request is already in use" });
    }
    throw error;
  }

  try {
    const created = await requestBinanceCreateOrder({
      env: { terminalType: "WEB" },
      merchantTradeNo: tradeNo,
      orderAmount: Number(centsToMoney(amountCents)),
      currency: input.currency,
      description: "Sasify wallet credit",
      goodsDetails: [{
        goodsType: "02",
        goodsCategory: "Z000",
        referenceGoodsId: `wallet-${id}`,
        goodsName: "Sasify wallet credit",
        goodsDetail: "Account wallet funding",
      }],
      orderExpireTime: Date.now() + 15 * 60 * 1000,
      returnUrl: `${origin}/dashboard/wallet?binancePay=${id}`,
      cancelUrl: `${origin}/dashboard/wallet?binancePay=${id}&canceled=1`,
      webhookUrl: `${origin}/api/binance-pay/webhook`,
      passThroughInfo: String(id),
    });
    if (created.currency !== input.currency || created.amountCents !== amountCents) {
      await BinancePayOrder.updateOne({ id, status: "creating" }, { $set: { status: "needs_review", createError: "provider_value_mismatch" } });
      throw new TRPCError({ code: "BAD_GATEWAY", message: "Binance Pay returned mismatched order details" });
    }
    const updated = clean(await BinancePayOrder.findOneAndUpdate(
      { id, status: "creating" },
      { $set: {
        status: "pending",
        prepayId: created.prepayId,
        checkoutUrl: created.checkoutUrl,
        qrcodeLink: created.qrcodeLink,
        qrContent: created.qrContent,
        deeplink: created.deeplink,
        universalUrl: created.universalUrl,
        expireTime: new Date(created.expireTime),
        nextReconcileAt: new Date(Date.now() + 60_000),
      } },
      { returnDocument: "after" },
    ).lean()) as any;
    return safeOrder(updated);
  } catch (error) {
    const ambiguous = error instanceof BinancePayTransportError;
    await BinancePayOrder.updateOne(
      { id, status: "creating" },
      { $set: ambiguous
        ? { status: "needs_review", createError: "transport_ambiguous", nextReconcileAt: new Date(Date.now() + 60_000) }
        : { status: "create_failed", createError: "provider_rejected" } },
    );
    throw error;
  }
}

export async function getOwnedBinancePayOrder(userId: number, id: number) {
  const row = clean(await BinancePayOrder.findOne({ id, userId }).lean()) as any;
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Binance Pay order not found" });
  return safeOrder(row);
}

export async function listOwnedBinancePayOrders(userId: number) {
  return cleanMany(await BinancePayOrder.find({ userId }).sort({ createdAt: -1 }).limit(20).lean()).map(safeOrder);
}

export async function settleBinancePayOrder(orderId: number) {
  const local = clean(await BinancePayOrder.findOne({ id: orderId }).lean()) as any;
  if (!local) throw new Error("Binance Pay order not found");
  if (local.status === "settled") return safeOrder(local);

  const authoritative = await queryBinancePayOrder(local.merchantTradeNo);
  validateBinanceSettlementBinding(local, authoritative);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await runInTransaction(async (session) => {
        const current = clean(await BinancePayOrder.findOne({ id: orderId }).session(session).lean()) as any;
        if (!current) throw new Error("Binance Pay order not found");
        if (current.status === "settled") return safeOrder(current);
        validateBinanceSettlementBinding(current, authoritative);

        await reservePaymentReference({
          session,
          reference: authoritative.transactionId,
          sourceType: "binance_pay_order",
          sourceId: current.id,
          userId: current.userId,
          paymentMethod: "binance_pay_merchant",
        });

        const wallet = await applyWalletMutation({
          session,
          userId: current.userId,
          type: "credit",
          amountCents: current.amountCents,
          operationKey: `binance-pay:${current.id}:credit`,
          referenceType: "binance_pay_order",
          referenceId: current.id,
          note: "Binance Pay wallet funding",
        });

        const settledAt = new Date();
        await BinancePayOrder.updateOne(
          { id: current.id, status: { $ne: "settled" } },
          { $set: {
            status: "settled",
            providerStatus: authoritative.status,
            transactionId: authoritative.transactionId,
            prepayId: authoritative.prepayId,
            lastQueriedAt: settledAt,
            settledAt,
            nextReconcileAt: null,
          } },
          { session },
        );
        if (!wallet.replayed) {
          await AuditLog.create([{
            id: await nextId("audit_logs"),
            action: "binance_pay_wallet_credited",
            entityType: "binance_pay_order",
            entityId: current.id,
            metadata: { operationKey: `binance-pay:${current.id}:credit`, currency: current.currency, amountCents: current.amountCents },
          }], { session });
        }
        return safeOrder({ ...current, status: "settled", transactionId: authoritative.transactionId, settledAt });
      });
    } catch (error) {
      if (!(error instanceof TRPCError) || error.code !== "CONFLICT") throw error;
      const claim = await findPaymentReferenceClaim(authoritative.transactionId);
      if (claim?.sourceType === "binance_pay_order" && claim.sourceId === orderId) {
        const latest = clean(await BinancePayOrder.findOne({ id: orderId }).lean()) as any;
        if (latest?.status === "settled") return safeOrder(latest);
        if (attempt === 0) continue;
      }
      await BinancePayOrder.updateOne(
        { id: orderId, status: { $ne: "settled" } },
        { $set: { status: "needs_review", providerStatus: authoritative.status, createError: "payment_reference_conflict", nextReconcileAt: null } },
      );
      throw new TRPCError({ code: "CONFLICT", message: "Binance Pay transaction was already claimed and requires review" });
    }
  }
  throw new TRPCError({ code: "CONFLICT", message: "Binance Pay settlement is already in progress" });
}

function digestWebhook(rawBody: string, signature: string, certificateSerial: string) {
  return crypto.createHash("sha256").update(certificateSerial).update("\0").update(signature).update("\0").update(rawBody).digest("hex");
}

export async function processBinancePayWebhook(input: { rawBody: string; signature: string; certificateSerial: string }) {
  const parsed = parseBinancePayWebhook(input.rawBody);
  const digest = digestWebhook(input.rawBody, input.signature, input.certificateSerial);
  let event = clean(await BinancePayWebhookEvent.findOne({ eventDigest: digest }).lean()) as any;
  if (!event) {
    try {
      event = clean((await BinancePayWebhookEvent.create({
        id: await nextId("binance_pay_webhook_events"),
        eventDigest: digest,
        certificateSerial: input.certificateSerial,
        bizId: parsed.payload.bizId,
        bizType: parsed.payload.bizType,
        bizStatus: parsed.payload.bizStatus,
        merchantTradeNo: typeof parsed.data.merchantTradeNo === "string" ? parsed.data.merchantTradeNo : undefined,
        status: "received",
      })).toObject()) as any;
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
      event = clean(await BinancePayWebhookEvent.findOne({ eventDigest: digest }).lean()) as any;
    }
  }
  if (event?.status === "processed" || event?.status === "ignored") return { replayed: true, status: event.status };

  if (parsed.payload.bizType !== "PAY" || parsed.payload.bizStatus !== "PAY_SUCCESS") {
    await BinancePayWebhookEvent.updateOne({ eventDigest: digest }, { $set: { status: "ignored", processedAt: new Date() } });
    return { replayed: false, status: "ignored" };
  }

  const tradeNo = typeof parsed.data.merchantTradeNo === "string" ? parsed.data.merchantTradeNo.trim() : "";
  if (!tradeNo) throw new Error("Invalid Binance Pay merchant order");
  const order = clean(await BinancePayOrder.findOne({ merchantTradeNo: tradeNo }).lean()) as any;
  if (!order) throw new Error("Binance Pay order not found");

  const webhookCurrency = typeof parsed.data.currency === "string" ? parsed.data.currency.toUpperCase() : undefined;
  const webhookAmount = parsed.data.totalFee == null ? undefined : moneyToCents(String(parsed.data.totalFee));
  if (webhookCurrency && webhookCurrency !== order.currency) throw new Error("Binance Pay webhook currency mismatch");
  if (webhookAmount != null && webhookAmount !== order.amountCents) throw new Error("Binance Pay webhook amount mismatch");

  try {
    const settled = await settleBinancePayOrder(order.id);
    await BinancePayWebhookEvent.updateOne({ eventDigest: digest }, { $set: { status: "processed", processedAt: new Date(), merchantTradeNo: tradeNo }, $unset: { errorCode: 1 } });
    return { replayed: false, status: "processed", order: settled };
  } catch (error) {
    await BinancePayWebhookEvent.updateOne({ eventDigest: digest }, { $set: { status: "failed", errorCode: "settlement_failed" } });
    throw error;
  }
}

function nextReconcileDate(attempts: number) {
  return new Date(Date.now() + Math.min(60 * 60 * 1000, 60_000 * 2 ** Math.min(attempts, 6)));
}

export async function reconcileBinancePayOrders(limit = 20) {
  const now = new Date();
  const rows = cleanMany(await BinancePayOrder.find({
    status: { $in: ACTIVE_RECONCILIATION_STATUSES },
    $or: [{ nextReconcileAt: { $lte: now } }, { nextReconcileAt: null }, { nextReconcileAt: { $exists: false } }],
  }).sort({ nextReconcileAt: 1, createdAt: 1 }).limit(limit).lean()) as any[];
  let settled = 0;
  let checked = 0;
  for (const row of rows) {
    try {
      const authoritative = await queryBinancePayOrder(row.merchantTradeNo);
      checked += 1;
      if (authoritative.status === "PAID") {
        await settleBinancePayOrder(row.id);
        settled += 1;
      } else if (["EXPIRED", "CANCELED", "CANCELLED"].includes(authoritative.status)) {
        await BinancePayOrder.updateOne({ id: row.id, status: { $ne: "settled" } }, { $set: { status: authoritative.status === "EXPIRED" ? "expired" : "canceled", providerStatus: authoritative.status, lastQueriedAt: now, nextReconcileAt: null } });
      } else {
        const attempts = Number(row.reconcileAttempts || 0) + 1;
        await BinancePayOrder.updateOne({ id: row.id, status: { $ne: "settled" } }, { $set: { providerStatus: authoritative.status, lastQueriedAt: now, nextReconcileAt: nextReconcileDate(attempts) }, $inc: { reconcileAttempts: 1 } });
      }
    } catch {
      const attempts = Number(row.reconcileAttempts || 0) + 1;
      await BinancePayOrder.updateOne({ id: row.id, status: { $ne: "settled" } }, { $set: { nextReconcileAt: nextReconcileDate(attempts) }, $inc: { reconcileAttempts: 1 } });
    }
  }
  return { checked, settled, scanned: rows.length };
}

let reconciliationTimer: NodeJS.Timeout | undefined;
export function startBinancePayReconciliationWorker() {
  if (reconciliationTimer || process.env.NODE_ENV === "test") return;
  reconciliationTimer = setInterval(() => {
    reconcileBinancePayOrders().catch(() => undefined);
  }, 60_000);
  reconciliationTimer.unref();
}

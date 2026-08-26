import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "../middleware";
import { connectDb } from "../queries/connection";
import {
  AuditLog,
  Notification,
  ThirdPartyOrder,
  ThirdPartyProduct,
  User,
  clean,
  cleanMany,
  nextId,
} from "../mongo/models";
import { calculateTechnysoftPrice, getTechnysoftProduct } from "../services/technysoft";
import { calculateCanbosoPrice, getCanbosoProduct } from "../services/canboso";
import { calculateAkundingPrice, getAkundingProduct } from "../services/akunding";
import { calculateZoomStorePrice, getZoomStoreProduct } from "../services/zoomstore";
import { calculateSsonPrice, getSsonProduct } from "../services/sson-digital";
import { settleReferralCommissionSafely } from "../services/referral";
import { applyWalletMutation, centsToMoney, moneyToCents, runInTransaction } from "../services/wallet-ledger";
import { sanitizeProviderDeliveryItems } from "../lib/provider-delivery";
import { isPlatformApiRealMode } from "../lib/platform-api-mode";
import { applyProviderOutcome, claimMarketplaceCredentials, refundLocalWallet, type RefundTerminalStatus } from "../services/third-party-orders";
import { toCustomerMarketplaceOrder } from "../lib/customer-marketplace-order";
import { purchaseExternalMarketplaceProduct, type MarketplaceProvider } from "../services/marketplace-provider-purchase";
import { assertProviderCostWithinSale } from "../lib/provider-price-guard";
import { recordAuditOnce } from "../services/audit-log";

type Provider = MarketplaceProvider;


function customerOrder(order: any, includeDelivery = false) {
  return toCustomerMarketplaceOrder(order, { includeDelivery });
}

async function readWalletBalance(userId: number) {
  const wallet = clean(await User.findOne({ id: userId }).select("walletBalance").lean()) as any;
  return String(wallet?.walletBalance ?? "0.00");
}

async function healTerminalReplay(order: any) {
  if (!["refunded", "cancelled", "failed"].includes(String(order.status))) return order;
  await refundLocalWallet({
    orderId: order.id,
    note: `Reconciled ${order.status} marketplace order`,
    terminalStatus: order.status as RefundTerminalStatus,
  });
  return clean(await ThirdPartyOrder.findOne({ id: order.id }).lean()) as any;
}

function providerFailureIsDefinitive(error: Error & { status?: number }) {
  return typeof error.status === "number" && [400, 401, 403, 404, 422].includes(error.status);
}


async function verifyStock(provider: Provider, externalProductId: string, quantity: number) {
  if (provider === "technysoft") {
    const product = await getTechnysoftProduct(Number(externalProductId));
    if (!product.unlimited && product.stock != null && product.stock < quantity) {
      throw new TRPCError({ code: "CONFLICT", message: `Only ${product.stock} available in stock.` });
    }
    return {
      stock: product.stock ?? 0,
      unlimited: Boolean(product.unlimited),
      totalCostCents: moneyToCents(calculateTechnysoftPrice(product, quantity)),
    };
  } else if (provider === "canboso") {
    const product = await getCanbosoProduct(externalProductId);
    const available = product.stats?.available ?? 0;
    if (available < quantity) throw new TRPCError({ code: "CONFLICT", message: `Only ${available} available in stock.` });
    return {
      stock: available,
      unlimited: false,
      totalCostCents: moneyToCents(calculateCanbosoPrice(product, quantity)),
    };
  } else if (provider === "akunding") {
    const product = await getAkundingProduct(Number(externalProductId));
    const available = product.stock ?? 0;
    if (available < quantity) throw new TRPCError({ code: "CONFLICT", message: `Only ${available} available in stock.` });
    return {
      stock: available,
      unlimited: false,
      totalCostCents: moneyToCents(calculateAkundingPrice(product, quantity)),
    };
  } else if (provider === "zoomstore") {
    const product = await getZoomStoreProduct(externalProductId);
    const available = product.stock ?? 0;
    if (available < quantity) throw new TRPCError({ code: "CONFLICT", message: `Only ${available} available in stock.` });
    return {
      stock: available,
      unlimited: false,
      totalCostCents: moneyToCents(calculateZoomStorePrice(product, quantity)),
    };
  } else {
    const product = await getSsonProduct(externalProductId);
    const available = product.stock ?? 0;
    if (available < quantity) throw new TRPCError({ code: "CONFLICT", message: `Only ${available} available in stock.` });
    return {
      stock: available,
      unlimited: false,
      totalCostCents: moneyToCents(calculateSsonPrice(product, quantity)),
    };
  }
}

export const thirdPartyRouter = createRouter({
  buy: authedQuery
    .input(z.object({
      id: z.number().positive(),
      quantity: z.number().int().min(1).max(1000).default(1),
      idempotencyKey: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const replay = clean(await ThirdPartyOrder.findOne({ idempotencyKey: input.idempotencyKey }).lean()) as any;
      if (replay) {
        if (replay.userId !== ctx.user.id || replay.thirdPartyProductId !== input.id || replay.quantity !== input.quantity) {
          throw new TRPCError({ code: "CONFLICT", message: "Purchase idempotency key was already used" });
        }
        const healedReplay = await healTerminalReplay(replay);
        const settledReplay = healedReplay;
        if (settledReplay.reconciliationStatus === "needs_review") {
          await recordAuditOnce({
            operationKey: `third-party-order:${settledReplay.id}:provider-outcome-unknown`,
            actorId: ctx.user.id,
            action: "third_party_provider_outcome_unknown",
            entityType: "third_party_order",
            entityId: settledReplay.id,
            metadata: { repairedOnReplay: true },
          });
        }
        await recordAuditOnce({
          operationKey: `third-party-order:${settledReplay.id}:created`,
          actorId: ctx.user.id,
          action: "third_party_order_created",
          entityType: "third_party_order",
          entityId: settledReplay.id,
          metadata: { providerStatus: settledReplay.status, finalStatus: settledReplay.status, repairedOnReplay: true },
        });
        return {
          ...customerOrder(settledReplay),
          codes: "",
          newBalance: await readWalletBalance(ctx.user.id),
          message: settledReplay.status === "delivered"
            ? "Order delivered instantly."
            : settledReplay.reconciliationStatus === "needs_review"
              ? "Provider outcome is under review."
              : "Order is already being processed.",
          idempotentReplay: true,
        };
      }

      const productSnapshot = clean(await ThirdPartyProduct.findOne({ id: input.id, status: "active" }).lean()) as any;
      if (!productSnapshot) throw new TRPCError({ code: "NOT_FOUND", message: "Product is not available." });
      const platformApiRealMode = await isPlatformApiRealMode();
      const smokeTest = !platformApiRealMode;
      let verifiedProviderQuote: Awaited<ReturnType<typeof verifyStock>> | null = null;
      if (!smokeTest && productSnapshot.providerPurchaseEnabled === true) {
        verifiedProviderQuote = await verifyStock(productSnapshot.provider, productSnapshot.externalProductId, input.quantity);
        const sellingTotalCents = moneyToCents(productSnapshot.priceUsd) * input.quantity;
        assertProviderCostWithinSale(verifiedProviderQuote.totalCostCents, sellingTotalCents);
        await ThirdPartyProduct.updateOne(
          { id: productSnapshot.id },
          {
            $set: {
              sourceStock: verifiedProviderQuote.stock,
              unlimited: verifiedProviderQuote.unlimited,
              sourcePriceUsd: centsToMoney(Math.round(verifiedProviderQuote.totalCostCents / input.quantity)),
            },
          },
        );
      } else if (!productSnapshot.unlimited && Number(productSnapshot.sourceStock || 0) < input.quantity) {
        throw new TRPCError({ code: "CONFLICT", message: "Cached stock is insufficient for this smoke test." });
      }

      const reservation = await runInTransaction(async (session) => {
        const concurrentReplay = clean(await ThirdPartyOrder.findOne({ idempotencyKey: input.idempotencyKey }).session(session).lean()) as any;
        if (concurrentReplay) {
          if (concurrentReplay.userId !== ctx.user.id || concurrentReplay.thirdPartyProductId !== input.id || concurrentReplay.quantity !== input.quantity) {
            throw new TRPCError({ code: "CONFLICT", message: "Purchase idempotency key was already used" });
          }
          return { order: concurrentReplay, product: productSnapshot, created: false };
        }
        const product = clean(await ThirdPartyProduct.findOne({ id: input.id, status: "active" }).session(session).lean()) as any;
        if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product is not available." });

        const unitPriceCents = moneyToCents(product.priceUsd);
        const originalUnitPriceCents = moneyToCents(product.originalPriceUsd || 0);
        const totalPriceCents = unitPriceCents * input.quantity;
        const totalProviderCostCents = verifiedProviderQuote?.totalCostCents ?? moneyToCents(product.sourcePriceUsd || 0) * input.quantity;
        const totalOriginalPriceCents = originalUnitPriceCents * input.quantity;
        const orderId = await nextId("third_party_orders");
        const rows = await ThirdPartyOrder.create([{
          id: orderId,
          userId: ctx.user.id,
          thirdPartyProductId: product.id,
          provider: product.provider,
          externalProductId: product.externalProductId,
          idempotencyKey: input.idempotencyKey,
          productName: product.title,
          quantity: input.quantity,
          priceUsd: centsToMoney(totalPriceCents),
          originalPriceUsd: centsToMoney(totalOriginalPriceCents),
          savingsUsd: centsToMoney(Math.max(0, totalOriginalPriceCents - totalPriceCents)),
          sellingPriceUsd: centsToMoney(totalPriceCents),
          providerCostUsd: centsToMoney(totalProviderCostCents),
          profitMarginUsd: centsToMoney(totalPriceCents - totalProviderCostCents),
          status: "pending",
          fulfillmentStatus: "pending",
        }], { session });
        const wallet = await applyWalletMutation({
          session,
          userId: ctx.user.id,
          type: "debit",
          amountCents: totalPriceCents,
          operationKey: `third-party:${input.idempotencyKey}:debit`,
          referenceType: "third_party_order",
          referenceId: orderId,
          note: `Marketplace purchase ${product.title}`,
        });
        return { order: clean(rows[0].toObject()) as any, product, created: true, newBalance: wallet.balance };
      });

      if (!reservation.created) {
        const healedReplay = await healTerminalReplay(reservation.order);
        const settledReplay = healedReplay;
        return {
          ...customerOrder(settledReplay),
          codes: "",
          newBalance: await readWalletBalance(ctx.user.id),
          message: settledReplay.reconciliationStatus === "needs_review" ? "Provider outcome is under review." : "Order is already being processed.",
          idempotentReplay: true,
        };
      }

      const product = reservation.product;
      const orderId = reservation.order.id;
      const idempotencyKey = input.idempotencyKey;
      const totalPrice = Number(reservation.order.priceUsd);
      let totalProviderCost = Number(reservation.order.providerCostUsd);
      let profitMargin = Number(reservation.order.profitMarginUsd);

      const SMOKE_TEST = smokeTest;
      let LIVE_PROVIDER_PURCHASE = !SMOKE_TEST
        && productSnapshot.providerPurchaseEnabled === true
        && product.providerPurchaseEnabled === true;
      if (LIVE_PROVIDER_PURCHASE) {
        const liveGate = await ThirdPartyProduct.exists({
          id: product.id,
          status: "active",
          providerPurchaseEnabled: true,
        });
        LIVE_PROVIDER_PURCHASE = Boolean(liveGate);
      }

      if (!LIVE_PROVIDER_PURCHASE) {
        // Provider purchase calls are product-gated. Disabled products require manual fulfillment.
        await ThirdPartyOrder.updateOne(
          { id: orderId },
          { $set: { status: "pending_fulfillment" } },
        );
        await Notification.create({
          id: await nextId("notifications"),
          userId: ctx.user.id,
          type: "third_party_order",
          title: "Order placed",
          message: `${product.title} — order confirmed. Fulfillment pending.`,
        });
        await AuditLog.create({
          id: await nextId("audit_logs"),
          actorId: ctx.user.id,
          action: SMOKE_TEST ? "third_party_order_smoke" : "third_party_order_manual",
          entityType: "third_party_order",
          entityId: orderId,
          metadata: {
            provider: product.provider,
            sellingPrice: totalPrice.toFixed(2),
            providerCost: totalProviderCost.toFixed(2),
            profitMargin: profitMargin.toFixed(2),
            mode: SMOKE_TEST ? "smoke" : "manual",
          },
        });
        return {
          id: orderId,
          status: "pending_fulfillment",
          productName: product.title,
          priceUsd: totalPrice.toFixed(2),
          codes: "",
          message: "Order confirmed. Fulfillment is pending.",
          mode: SMOKE_TEST ? "smoke" : "manual",
          newBalance: reservation.newBalance,
        };
      }

      // Live mode: provider purchase failure and post-delivery bookkeeping have separate failure domains.
      let external: Awaited<ReturnType<typeof purchaseExternalMarketplaceProduct>>;
      try {
        external = await purchaseExternalMarketplaceProduct(product.provider, product.externalProductId, input.quantity, idempotencyKey);
      } catch (error) {
        const anyError = error as Error & { code?: string; status?: number };
        if (providerFailureIsDefinitive(anyError)) {
          await refundLocalWallet({ orderId, note: `Provider rejected ${product.title}`, terminalStatus: "failed" });
          throw new TRPCError({ code: "BAD_GATEWAY", message: "Provider rejected the purchase. Your wallet was refunded." });
        }
        await applyProviderOutcome({
          orderId,
          status: "processing",
          reconciliationStatus: "needs_review",
          reconciliationNote: "Provider outcome requires reconciliation",
          errorCode: "provider_outcome_unknown",
          errorMessage: "Provider outcome requires reconciliation",
        });
        await recordAuditOnce({
          operationKey: `third-party-order:${orderId}:provider-outcome-unknown`,
          actorId: ctx.user.id,
          action: "third_party_provider_outcome_unknown",
          entityType: "third_party_order",
          entityId: orderId,
          metadata: { provider: product.provider, upstreamCode: anyError.code || "unknown" },
        });
        throw new TRPCError({ code: "TIMEOUT", message: "Provider outcome is pending reconciliation. Your wallet will not be charged twice." });
      }

      const customerItems = sanitizeProviderDeliveryItems(external.items);
      const reportedProviderCostCents = moneyToCents(external.priceUsd || 0);
      if (reportedProviderCostCents > 0 && reportedProviderCostCents !== moneyToCents(totalProviderCost)) {
        totalProviderCost = Number(centsToMoney(reportedProviderCostCents));
        profitMargin = Number(centsToMoney(moneyToCents(totalPrice) - reportedProviderCostCents));
        await ThirdPartyOrder.updateOne(
          { id: orderId },
          {
            $set: {
              providerCostUsd: centsToMoney(reportedProviderCostCents),
              profitMarginUsd: centsToMoney(moneyToCents(totalPrice) - reportedProviderCostCents),
            },
          },
        );
      }
      let resolvedOrder: any;
      if (["refunded", "cancelled", "failed"].includes(external.status)) {
        await refundLocalWallet({
          orderId,
          note: `${external.status === "cancelled" ? "Cancelled" : external.status === "failed" ? "Failed" : "Refunded"} ${product.title}`,
          terminalStatus: external.status as RefundTerminalStatus,
        });
        resolvedOrder = clean(await ThirdPartyOrder.findOne({ id: orderId }).lean()) as any;
      } else {
        const outcome = await applyProviderOutcome({
          orderId,
          status: external.status === "delivered" ? "delivered" : "processing",
          externalOrderId: external.externalOrderId ? String(external.externalOrderId) : undefined,
          items: customerItems,
          reconciliationStatus: external.status === "processing" ? "none" : "resolved",
          reconciliationNote: external.status === "processing" ? undefined : "Provider returned a definitive order status",
        });
        resolvedOrder = outcome.order;
        if (external.status === "delivered" && product.unlimited !== true) {
          await ThirdPartyProduct.updateOne(
            { id: product.id, sourceStock: { $gte: input.quantity } },
            { $inc: { sourceStock: -input.quantity }, $set: { updatedAt: new Date() } },
          );
        }
      }
      const finalStatus = String(resolvedOrder?.status || "processing");
      if (finalStatus === "delivered") {
        await settleReferralCommissionSafely({ sourceType: "third_party_order", sourceId: orderId, referredUserId: ctx.user.id, baseAmount: totalPrice.toFixed(2) });
      }
      try {
        await Notification.create({
          id: await nextId("notifications"),
          userId: ctx.user.id,
          type: "third_party_order",
          title: finalStatus === "delivered" ? "Order delivered" : finalStatus === "refunded" ? "Order refunded" : "Order processing",
          message: finalStatus === "delivered" ? `${product.title} is ready in your dashboard.` : finalStatus === "refunded" ? `${product.title} was refunded.` : `${product.title} is processing.`,
        });
        await recordAuditOnce({
          operationKey: `third-party-order:${orderId}:created`,
          actorId: ctx.user.id,
          action: "third_party_order_created",
          entityType: "third_party_order",
          entityId: orderId,
          metadata: { provider: product.provider, externalProductId: product.externalProductId, providerStatus: external.status, finalStatus },
        });
      } catch (error) {
        const name = error instanceof Error ? error.name : "UnknownError";
        process.stderr.write(`[third-party] post-purchase bookkeeping deferred for order #${orderId}: ${name}\n`);
      }
      const responseOrder = clean(await ThirdPartyOrder.findOne({ id: orderId, userId: ctx.user.id }).lean()) as any;
      const responseStatus = String(responseOrder?.status || finalStatus);
      return {
        id: orderId,
        status: responseStatus,
        productName: product.title,
        priceUsd: totalPrice.toFixed(2),
        codes: "",
        message: responseStatus === "delivered"
          ? "Order delivered instantly."
          : ["refunded", "failed", "cancelled"].includes(responseStatus)
            ? "Order could not be completed. Your wallet has been restored."
            : "Order is processing.",
        newBalance: await readWalletBalance(ctx.user.id),
      };
    }),

  revealDelivery: authedQuery
    .input(z.object({ id: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const order = clean(await ThirdPartyOrder.findOne({ id: input.id, userId: ctx.user.id }).lean()) as any;
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Marketplace order not found" });
      if (order.status !== "delivered") throw new TRPCError({ code: "CONFLICT", message: "Delivery is not ready yet" });
      const released = await claimMarketplaceCredentials({ orderId: input.id, userId: ctx.user.id });
      const delivery = customerOrder(released, true);
      return { id: delivery.id, status: delivery.status, items: delivery.items };
    }),

  myOrders: authedQuery.query(async ({ ctx }) => {
    await connectDb();
    const orders = cleanMany(await ThirdPartyOrder.find({ userId: ctx.user.id }).sort({ createdAt: -1 }).lean()) as any[];
    return orders.map((order) => customerOrder(order));
  }),
});

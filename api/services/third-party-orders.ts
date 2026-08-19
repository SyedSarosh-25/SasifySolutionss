import { TRPCError } from "@trpc/server";
import { ThirdPartyOrder, clean } from "../mongo/models";
import { applyWalletMutation, moneyToCents, runInTransaction } from "./wallet-ledger";
import { providerDeliveryFields } from "../lib/provider-delivery";

export type RefundTerminalStatus = "refunded" | "cancelled" | "failed";

export function hasReleasedDeliveredCredentials(order: { status?: unknown; credentialsReleasedAt?: unknown }) {
  return String(order.status) === "delivered" && Boolean(order.credentialsReleasedAt);
}

export async function refundLocalWallet(input: {
  orderId: number;
  note: string;
  terminalStatus?: RefundTerminalStatus;
  actorId?: number;
}) {
  return runInTransaction(async (session) => {
    const order = clean(await ThirdPartyOrder.findOne({ id: input.orderId }).session(session).lean()) as any;
    if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Marketplace order not found" });
    if (hasReleasedDeliveredCredentials(order)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Delivered credentials were already released; use an explicit compensating adjustment instead of refunding this order",
      });
    }
    const terminalStatus = input.terminalStatus ?? "refunded";
    const otherTerminal = ["refunded", "cancelled", "failed"].includes(order.status) && order.status !== terminalStatus;
    if (otherTerminal) {
      return { applied: false, terminalStatus: order.status };
    }
    const now = new Date();
    const transition = await ThirdPartyOrder.updateOne(
      { id: input.orderId, status: order.status },
      {
        $set: {
          status: terminalStatus,
          fulfillmentStatus: "pending",
          items: [],
          refundedAt: now,
          reconciliationStatus: "resolved",
          reconciliationNote: input.note,
          reconciledAt: now,
          reconciledBy: input.actorId,
        },
        $unset: { deliveredAt: 1, itemsEncrypted: 1 },
      },
      { session },
    );
    if (transition.matchedCount !== 1) {
      throw new TRPCError({ code: "CONFLICT", message: "Marketplace order state changed during refund" });
    }
    const wallet = await applyWalletMutation({
      session,
      userId: order.userId,
      type: "credit",
      amountCents: moneyToCents(order.totalSellingPriceUsd ?? order.priceUsd),
      operationKey: `third-party:${input.orderId}:refund`,
      referenceType: "refund",
      referenceId: input.orderId,
      note: input.note,
    });
    return wallet;
  });
}

export async function claimMarketplaceCredentials(input: { orderId: number; userId?: number }) {
  return runInTransaction(async (session) => {
    const order = clean(await ThirdPartyOrder.findOne({ id: input.orderId }).session(session).lean()) as any;
    if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Marketplace order not found" });
    if (input.userId !== undefined && Number(order.userId) !== Number(input.userId)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Marketplace order does not belong to this user" });
    }
    if (order.status !== "delivered" || order.credentialsReleasedAt) return order;

    const releasedAt = new Date();
    const claimed = await ThirdPartyOrder.updateOne(
      {
        id: input.orderId,
        status: "delivered",
        credentialsReleasedAt: { $exists: false },
      },
      { $set: { credentialsReleasedAt: releasedAt } },
      { session },
    );
    if (claimed.matchedCount !== 1) {
      throw new TRPCError({ code: "CONFLICT", message: "Marketplace delivery changed while credentials were being released" });
    }
    return clean(await ThirdPartyOrder.findOne({ id: input.orderId }).session(session).lean()) as any;
  });
}

export async function applyProviderOutcome(input: {
  orderId: number;
  status: "processing" | "delivered";
  externalOrderId?: string;
  items?: unknown;
  reconciliationStatus: "none" | "needs_review" | "resolved";
  reconciliationNote?: string;
  errorCode?: string;
  errorMessage?: string;
}) {
  return runInTransaction(async (session) => {
    const order = clean(await ThirdPartyOrder.findOne({ id: input.orderId }).session(session).lean()) as any;
    if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Marketplace order not found" });
    if (["refunded", "cancelled", "failed"].includes(String(order.status))) {
      return { applied: false, order };
    }
    if (order.status === "delivered") {
      return { applied: input.status === "delivered", order };
    }

    const now = new Date();
    const delivered = input.status === "delivered";
    const transition = await ThirdPartyOrder.updateOne(
      { id: input.orderId, status: order.status },
      {
        $set: {
          status: input.status,
          fulfillmentStatus: delivered ? "fulfilled" : "pending",
          externalOrderId: input.externalOrderId,
          ...(delivered ? providerDeliveryFields(input.items) : {}),
          deliveredAt: delivered ? now : undefined,
          reconciliationStatus: input.reconciliationStatus,
          reconciliationNote: input.reconciliationNote,
          reconciledAt: input.reconciliationStatus === "none" ? undefined : now,
          errorCode: input.errorCode,
          errorMessage: input.errorMessage,
        },
        ...(delivered ? { $unset: { refundedAt: 1 } } : {}),
      },
      { session },
    );
    if (transition.matchedCount !== 1) {
      throw new TRPCError({ code: "CONFLICT", message: "Marketplace provider outcome raced another resolution" });
    }
    const updated = clean(await ThirdPartyOrder.findOne({ id: input.orderId }).session(session).lean()) as any;
    return { applied: true, order: updated };
  });
}

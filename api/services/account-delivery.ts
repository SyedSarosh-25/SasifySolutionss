import { TRPCError } from "@trpc/server";

import {
  AuditLog,
  DeliveryRecord,
  InventoryItem,
  Notification,
  Order,
  Product,
  ProductPlan,
  User,
  clean,
  nextId,
} from "../mongo/models";
import { settleReferralCommissionSafely } from "./referral";
import { runInTransaction } from "./wallet-ledger";
import { credentialFingerprint, credentialWrite, revealCredential } from "../lib/credential-security";
import { manualCompletionState } from "../lib/manual-fulfillment";
import { env } from "../lib/env";

export const pendingFulfillmentMessage =
  "Your order is confirmed. Delivery is pending. Track updates in your dashboard and open a support ticket if needed.";

export const manualActivationMessage =
  "Your payment is confirmed. Manual activation is pending. Track the order in your dashboard and use the support ticket system for follow-up.";

export const defaultSetupInstructions = [
  "Open the official login page of the purchased service.",
  "Enter the delivered email and password.",
  "When asked for 2FA, use the provided 2FA secret/code.",
  "After login, go to account/security settings.",
  "Change the email to your personal email if the platform allows it.",
  "Update password and recovery options if supported.",
  "Save changes and confirm everything is working.",
];

type AnyRecord = Record<string, any>;

function splitInstructions(value?: string | string[] | null) {
  if (Array.isArray(value)) {
    return value.map((step) => String(step).trim()).filter(Boolean);
  }
  if (!value) return [];
  return String(value)
    .split(/\r?\n/)
    .map((step) => step.trim())
    .filter(Boolean);
}

export function setupInstructionsFor(product?: AnyRecord | null, inventoryItem?: AnyRecord | null) {
  const productSteps = splitInstructions(product?.setupInstructions);
  if (productSteps.length > 0) return productSteps;

  const itemSteps = splitInstructions(inventoryItem?.instructions);
  if (itemSteps.length > 0) return itemSteps;

  return defaultSetupInstructions;
}

function protectedFields(value?: string | null) {
  const credential = credentialWrite(value);
  return {
    plaintext: credential.plaintext,
    encrypted: credential.encrypted,
  };
}

function readCredential(encrypted: unknown, legacyPlaintext?: unknown) {
  const decrypted = revealCredential(typeof encrypted === "string" ? encrypted : "");
  if (decrypted) return decrypted;
  return env.isProduction ? "" : String(legacyPlaintext || "");
}

export function readInventoryCredentials(item?: AnyRecord | null) {
  if (!item) {
    return {
      accountEmail: "",
      password: "",
      twoFaSecret: "",
      backupMethod: "",
      licenseKey: "",
      activationLink: "",
    };
  }

  return {
    accountEmail: item.accountEmail || item.email || "",
    password: readCredential(item.passwordEncrypted, item.password),
    twoFaSecret: readCredential(item.twoFaSecretEncrypted, item.twoFa || item.twoFaSecret),
    backupMethod: item.backupMethod || "",
    licenseKey: readCredential(item.licenseKeyEncrypted, item.licenseKey),
    activationLink: readCredential(item.activationLinkEncrypted, item.activationLink),
  };
}

function legacyDeliveryData(delivery: AnyRecord) {
  const parsed: Record<string, string> = {};
  for (const line of String(delivery.deliveredData || "").split(/\r?\n/)) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    const key = line.slice(0, index).trim().toLowerCase();
    const value = line.slice(index + 1).trim();
    if (key === "email") parsed.accountEmail = value;
    if (key === "password") parsed.password = value;
    if (key === "2fa" || key === "2fa secret") parsed.twoFaSecret = value;
    if (key === "license key") parsed.licenseKey = value;
    if (key === "activation link") parsed.activationLink = value;
    if (key === "instructions") parsed.instructions = value;
  }
  return parsed;
}

export function serializeDeliveryRecord(delivery?: AnyRecord | null) {
  if (!delivery) return null;

  const legacy = legacyDeliveryData(delivery);
  const setupInstructions = splitInstructions(delivery.setupInstructions);
  if (setupInstructions.length === 0 && legacy.instructions) {
    setupInstructions.push(legacy.instructions);
  }

  return {
    id: delivery.id,
    orderId: delivery.orderId,
    userId: delivery.userId,
    productId: delivery.productId,
    inventoryItemId: delivery.inventoryItemId,
    productName: delivery.productName || "",
    accountEmail: delivery.accountEmail || legacy.accountEmail || "",
    password: readCredential(delivery.passwordEncrypted, delivery.password || legacy.password),
    twoFaSecret: readCredential(delivery.twoFaSecretEncrypted, delivery.twoFaSecret || legacy.twoFaSecret),
    backupMethod: delivery.backupMethod || "",
    licenseKey: readCredential(delivery.licenseKeyEncrypted, delivery.licenseKey || legacy.licenseKey),
    activationLink: readCredential(delivery.activationLinkEncrypted, delivery.activationLink || legacy.activationLink),
    deliveredData: delivery.deliveredData,
    setupInstructions: setupInstructions.length > 0 ? setupInstructions : defaultSetupInstructions,
    deliveredAt: delivery.deliveredAt || delivery.createdAt,
    viewedAt: delivery.viewedAt,
    createdAt: delivery.createdAt,
    updatedAt: delivery.updatedAt,
  };
}

export function serializeInventoryItem(item: AnyRecord) {
  const credentials = readInventoryCredentials(item);
  return {
    ...item,
    accountEmail: credentials.accountEmail,
    password: credentials.password,
    twoFaSecret: credentials.twoFaSecret,
    backupMethod: credentials.backupMethod,
    licenseKey: credentials.licenseKey,
    activationLink: credentials.activationLink,
    assignedToUserId: item.assignedToUserId ?? item.soldToUserId ?? null,
    orderId: item.orderId ?? item.reservedByOrderId ?? null,
    deliveredAt: item.deliveredAt ?? item.soldAt ?? null,
  };
}

export function credentialFieldsForWrite(input: {
  password?: string | null;
  twoFaSecret?: string | null;
  licenseKey?: string | null;
  activationLink?: string | null;
}) {
  const password = protectedFields(input.password);
  const twoFaSecret = protectedFields(input.twoFaSecret);
  const licenseKey = protectedFields(input.licenseKey);
  const activationLink = protectedFields(input.activationLink);

  return {
    password: password.plaintext,
    passwordEncrypted: password.encrypted,
    twoFaSecret: twoFaSecret.plaintext,
    twoFaSecretEncrypted: twoFaSecret.encrypted,
    licenseKey: licenseKey.plaintext,
    licenseKeyEncrypted: licenseKey.encrypted,
    licenseKeyFingerprint: credentialFingerprint(input.licenseKey),
    activationLink: activationLink.plaintext,
    activationLinkEncrypted: activationLink.encrypted,
    activationLinkFingerprint: credentialFingerprint(input.activationLink),
  };
}

async function markPendingFulfillment(order: AnyRecord, actorId?: number, reason = "stock_unavailable", message = pendingFulfillmentMessage) {
  if (order.status === "pending_fulfillment" && order.deliveryStatus === "pending_fulfillment") {
    return { status: "pending_fulfillment" as const, message, replayed: true };
  }
  const transition = await Order.updateOne(
    { id: order.id, status: { $in: ["paid", "processing"] } },
    { $set: { status: "pending_fulfillment", deliveryStatus: "pending_fulfillment" } },
  );
  if (transition.matchedCount !== 1) {
    throw new TRPCError({ code: "CONFLICT", message: "Order state changed before fulfillment" });
  }

  if (order.userId) {
    await Notification.create({
      id: await nextId("notifications"),
      userId: order.userId,
      type: "pending_fulfillment",
      title: "Delivery pending",
      message,
    });
  }

  await AuditLog.create({
    id: await nextId("audit_logs"),
    actorId,
    action: "order_pending_fulfillment",
    entityType: "order",
    entityId: order.id,
    metadata: {
      orderNumber: order.orderNumber,
      productId: order.productId,
      planId: order.planId,
      reason,
    },
  });

  return { status: "pending_fulfillment" as const, message };
}

export async function fulfillPaidOrder(orderId: number, actorId?: number) {
  const order = clean(await Order.findOne({ id: orderId }).lean()) as AnyRecord | null;
  if (!order) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Invalid order" });
  }

  if (order.status === "delivered") {
    if (order.userId) await settleReferralCommissionSafely({ sourceType: "order", sourceId: order.id, referredUserId: order.userId, baseAmount: order.finalPrice });
    return { status: "delivered" as const, inventoryItemId: order.inventoryItemId ?? null };
  }

  if (!["paid", "processing", "pending_fulfillment"].includes(order.status)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Order is not paid yet" });
  }

  const product = clean(await Product.findOne({ id: order.productId }).lean()) as AnyRecord | null;
  const fulfillmentType = order.fulfillmentType || product?.fulfillmentType || "credentials";
  if (fulfillmentType === "whatsapp_activation") {
    return markPendingFulfillment(order, actorId, "whatsapp_activation", manualActivationMessage);
  }

  if (!order.userId) {
    return markPendingFulfillment(order, actorId, "customer_account_required");
  }

  const fulfillment = await runInTransaction(async (session) => {
    const currentOrder = clean(await Order.findOne({ id: order.id }).session(session).lean()) as AnyRecord | null;
    if (!currentOrder) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid order" });
    if (!["paid", "processing", "pending_fulfillment", "delivered"].includes(currentOrder.status)) {
      throw new TRPCError({ code: "CONFLICT", message: "Order is no longer eligible for fulfillment" });
    }
    const existing = clean(await DeliveryRecord.findOne({ orderId: order.id, userId: order.userId }).session(session).lean()) as AnyRecord | null;
    if (existing) {
      const restored = await Order.updateOne(
        { id: order.id, status: currentOrder.status },
        { $set: { status: "delivered", deliveryStatus: "delivered", inventoryItemId: existing.inventoryItemId } },
        { session },
      );
      if (restored.matchedCount !== 1) throw new TRPCError({ code: "CONFLICT", message: "Order state changed during fulfillment" });
      return { kind: "existing" as const, inventoryItemId: existing.inventoryItemId ?? null };
    }
    if (currentOrder.status === "delivered") {
      return { kind: "existing" as const, inventoryItemId: currentOrder.inventoryItemId ?? null };
    }

    const now = new Date();
    const inventoryItem = clean(await InventoryItem.findOneAndUpdate(
      {
        productId: currentOrder.productId,
        status: "available",
        $or: [{ planId: currentOrder.planId }, { planId: null }, { planId: { $exists: false } }],
      },
      {
        $set: {
          status: "sold",
          assignedToUserId: currentOrder.userId,
          soldToUserId: currentOrder.userId,
          orderId: currentOrder.id,
          reservedByOrderId: currentOrder.id,
          deliveredAt: now,
          soldAt: now,
        },
      },
      { returnDocument: "after", sort: { id: 1 }, session },
    ).lean()) as AnyRecord | null;
    if (!inventoryItem) return { kind: "missing" as const };

    const plan = clean(await ProductPlan.findOne({ id: currentOrder.planId }).session(session).lean()) as AnyRecord | null;
    const credentials = readInventoryCredentials(inventoryItem);
    const password = protectedFields(credentials.password);
    const twoFaSecret = protectedFields(credentials.twoFaSecret);
    const licenseKey = protectedFields(credentials.licenseKey);
    const activationLink = protectedFields(credentials.activationLink);
    const setupInstructions = setupInstructionsFor(product, inventoryItem);
    const deliveredData = [
      credentials.accountEmail ? `Email: ${credentials.accountEmail}` : "",
      credentials.backupMethod ? `Backup method: ${credentials.backupMethod}` : "",
      inventoryItem.instructions ? `Details:\n${inventoryItem.instructions}` : "",
    ].filter(Boolean).join("\n");

    await DeliveryRecord.create([{
      id: await nextId("delivery_records"),
      orderId: currentOrder.id,
      userId: currentOrder.userId,
      productId: currentOrder.productId,
      inventoryItemId: inventoryItem.id,
      productName: product?.name ?? plan?.name ?? "Product",
      accountEmail: credentials.accountEmail,
      password: password.plaintext,
      passwordEncrypted: password.encrypted,
      twoFaSecret: twoFaSecret.plaintext,
      twoFaSecretEncrypted: twoFaSecret.encrypted,
      backupMethod: credentials.backupMethod,
      licenseKey: licenseKey.plaintext,
      licenseKeyEncrypted: licenseKey.encrypted,
      activationLink: activationLink.plaintext,
      activationLinkEncrypted: activationLink.encrypted,
      setupInstructions,
      deliveredData: deliveredData || inventoryItem.notes || "Account details are available in your dashboard.",
      deliveredAt: now,
    }], { session });
    const delivered = await Order.updateOne(
      { id: currentOrder.id, status: currentOrder.status },
      { $set: { inventoryItemId: inventoryItem.id, status: "delivered", deliveryStatus: "delivered" } },
      { session },
    );
    if (delivered.matchedCount !== 1) throw new TRPCError({ code: "CONFLICT", message: "Order state changed during fulfillment" });
    return { kind: "delivered" as const, inventoryItemId: inventoryItem.id };
  });

  if (fulfillment.kind === "missing") return markPendingFulfillment(order, actorId);
  if (fulfillment.kind === "existing") {
    await settleReferralCommissionSafely({ sourceType: "order", sourceId: order.id, referredUserId: order.userId, baseAmount: order.finalPrice });
    return { status: "delivered" as const, inventoryItemId: fulfillment.inventoryItemId };
  }
  const inventoryItemId = fulfillment.inventoryItemId;

  await Notification.create({
    id: await nextId("notifications"),
    userId: order.userId,
    type: "order_delivered",
    title: "Order delivered",
    message: `Your order ${order.orderNumber} credentials are ready.`,
  });

  await AuditLog.create({
    id: await nextId("audit_logs"),
    actorId,
    action: "account_delivered",
    entityType: "order",
    entityId: order.id,
    metadata: {
      orderNumber: order.orderNumber,
      inventoryItemId,
      userId: order.userId,
    },
  });

  await User.updateOne({ id: order.userId }, { $set: { updatedAt: new Date() } });
  await settleReferralCommissionSafely({ sourceType: "order", sourceId: order.id, referredUserId: order.userId, baseAmount: order.finalPrice });

  return { status: "delivered" as const, inventoryItemId };
}

export async function completeManualOrder(input: { orderId: number; actorId?: number; note: string }) {
  const note = input.note.trim();
  if (!note) throw new TRPCError({ code: "BAD_REQUEST", message: "Completion note is required" });

  const result = await runInTransaction(async (session) => {
    const order = clean(await Order.findOne({ id: input.orderId }).session(session).lean()) as AnyRecord | null;
    if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
    const completionState = manualCompletionState(order);
    if (completionState === "replayed") return { order, replayed: true };
    if (completionState !== "eligible") {
      throw new TRPCError({ code: "CONFLICT", message: "Only pending WhatsApp activation orders can be completed manually" });
    }

    const completedAt = new Date();
    const transition = await Order.findOneAndUpdate(
      { id: input.orderId, status: "pending_fulfillment", fulfillmentType: "whatsapp_activation" },
      { $set: { status: "delivered", deliveryStatus: "delivered", fulfillmentNote: note, deliveredAt: completedAt } },
      { returnDocument: "after", session },
    ).lean();
    if (!transition) throw new TRPCError({ code: "CONFLICT", message: "Order state changed before completion" });
    await AuditLog.create([{
      id: await nextId("audit_logs"),
      actorId: input.actorId,
      action: "manual_activation_completed",
      entityType: "order",
      entityId: input.orderId,
      metadata: { orderNumber: order.orderNumber, note },
    }], { session });
    return { order: clean(transition) as AnyRecord, replayed: false };
  });

  if (!result.replayed && result.order.userId) {
    await Notification.create({
      id: await nextId("notifications"),
      userId: result.order.userId,
      type: "order_delivered",
      title: "Activation completed",
      message: `Your order ${result.order.orderNumber} activation is complete.`,
    });
    await settleReferralCommissionSafely({ sourceType: "order", sourceId: result.order.id, referredUserId: result.order.userId, baseAmount: result.order.finalPrice });
  }
  return { status: "delivered" as const, replayed: result.replayed };
}

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery, publicQuery } from "../middleware";
import { connectDb } from "../queries/connection";
import {
  AuditLog,
  DeliveryRecord,
  Notification,
  Order,
  Product,
  ProductPlan,
  User,
  clean,
  cleanMany,
  nextId,
} from "../mongo/models";
import {
  fulfillPaidOrder,
  manualActivationMessage,
  pendingFulfillmentMessage,
  serializeDeliveryRecord,
} from "../services/account-delivery";
import { applyWalletMutation, centsToMoney, moneyToCents, runInTransaction } from "../services/wallet-ledger";
import { reservePaymentReference } from "../services/payment-reference";

function generateOrderNumber(orderId: number): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `SAS-${dateStr}-${String(orderId).padStart(4, "0")}`;
}

export const orderRouter = createRouter({
  create: authedQuery
    .input(z.object({
      productId: z.number().positive(),
      planId: z.number().positive(),
      idempotencyKey: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const result = await runInTransaction(async (session) => {
        const replay = clean(await Order.findOne({ idempotencyKey: input.idempotencyKey }).session(session).lean()) as any;
        if (replay) {
          if (replay.userId !== ctx.user.id || replay.productId !== input.productId || replay.planId !== input.planId) {
            throw new TRPCError({ code: "CONFLICT", message: "Order idempotency key was already used" });
          }
          const wallet = clean(await User.findOne({ id: ctx.user.id }).session(session).select("walletBalance").lean()) as any;
          return { order: replay, created: false, newBalance: wallet?.walletBalance ?? "0.00" };
        }

        const plan = clean(await ProductPlan.findOne({ id: input.planId }).session(session).lean()) as any;
        if (!plan || !plan.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found or inactive" });
        if (plan.productId !== input.productId) throw new TRPCError({ code: "BAD_REQUEST", message: "Selected plan does not belong to this product" });
        const product = clean(await Product.findOne({ id: input.productId }).session(session).lean()) as any;
        if (!product || product.status !== "active") throw new TRPCError({ code: "NOT_FOUND", message: "Product not found or inactive" });

        const priceCents = moneyToCents(plan.salePrice ?? plan.price);
        const finalPriceCents = Math.round(priceCents * 0.95);
        const discountCents = priceCents - finalPriceCents;
        const orderId = await nextId("orders");
        const orderNumber = generateOrderNumber(orderId);
        const rows = await Order.create([{
          id: orderId,
          orderNumber,
          idempotencyKey: input.idempotencyKey,
          userId: ctx.user.id,
          checkoutType: "wallet",
          productId: input.productId,
          planId: input.planId,
          fulfillmentType: product.fulfillmentType || "credentials",
          originalPrice: centsToMoney(priceCents),
          discountPercent: "5.00",
          discountAmount: centsToMoney(discountCents),
          finalPrice: centsToMoney(finalPriceCents),
          status: "paid",
        }], { session });
        const wallet = await applyWalletMutation({
          session,
          userId: ctx.user.id,
          type: "debit",
          amountCents: finalPriceCents,
          operationKey: `order:${input.idempotencyKey}:debit`,
          referenceType: "order",
          referenceId: orderId,
          note: `Order ${orderNumber}`,
        });
        return { order: clean(rows[0].toObject()) as any, created: true, newBalance: wallet.balance };
      });

      const fulfillment = await fulfillPaidOrder(result.order.id, ctx.user.id);

      if (result.created) {
        await Notification.create({
          id: await nextId("notifications"),
          userId: ctx.user.id,
          type: "order_created",
          title: "Order Placed",
          message: `Your order ${result.order.orderNumber} has been placed successfully.`,
        });
        await AuditLog.create({
          id: await nextId("audit_logs"),
          actorId: ctx.user.id,
          action: "wallet_order_created",
          entityType: "order",
          entityId: result.order.id,
          metadata: { idempotencyKey: input.idempotencyKey, fulfillmentStatus: fulfillment.status },
        });
      }

      return {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        finalPrice: result.order.finalPrice,
        discountAmount: result.order.discountAmount,
        newBalance: result.newBalance,
        deliveryStatus: fulfillment.status,
        fulfillmentType: result.order.fulfillmentType || "credentials",
        idempotentReplay: !result.created,
        message: result.order.fulfillmentType === "whatsapp_activation"
          ? manualActivationMessage
          : fulfillment.status === "pending_fulfillment"
            ? pendingFulfillmentMessage
            : "Your account details are ready in your dashboard.",
      };
    }),

  createGuest: publicQuery
    .input(z.object({
      productId: z.number().positive(),
      planId: z.number().positive(),
      customerName: z.string().min(2).max(120),
      customerEmail: z.string().email(),
      paymentMethod: z.enum(["nayapay", "easypaisa", "jazzcash", "usdt_trc20", "usdt_bep20", "binance_pay"]),
      paymentTxid: z.string().min(4).max(160),
      paymentScreenshotUrl: z.string().max(3_500_000).optional(),
      customerNote: z.string().max(500).optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDb();
      const plan = clean(await ProductPlan.findOne({ id: input.planId }).lean()) as any;
      if (!plan || !plan.isActive) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found or inactive" });
      }
      if (plan.productId !== input.productId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Selected plan does not belong to this product" });
      }
      const product = clean(await Product.findOne({ id: input.productId }).lean()) as any;
      if (!product || product.status !== "active") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found or inactive" });
      }

      const paymentTxid = input.paymentTxid.trim();
      const existingOrder = await Order.findOne({ paymentTxid }).lean();
      if (existingOrder) {
        throw new TRPCError({ code: "CONFLICT", message: "This payment reference has already been used" });
      }

      const screenshotUrl = input.paymentScreenshotUrl?.trim();
      if (!screenshotUrl || !/^data:image\/(png|jpe?g|webp);base64,/i.test(screenshotUrl)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Payment screenshot is required for direct checkout" });
      }

      const price = parseFloat(plan.salePrice ?? plan.price);
      const orderId = await nextId("orders");
      const orderNumber = generateOrderNumber(orderId);

      try {
        await runInTransaction(async (session) => {
          await reservePaymentReference({ session, reference: paymentTxid, sourceType: "direct_order", sourceId: orderId, paymentMethod: input.paymentMethod });
          await Order.create([{
            id: orderId,
            orderNumber,
            checkoutType: "direct",
            guestName: input.customerName,
            guestEmail: input.customerEmail.toLowerCase(),
            paymentMethod: input.paymentMethod,
            paymentTxid,
            paymentScreenshotUrl: screenshotUrl,
            customerNote: input.customerNote,
            productId: input.productId,
            planId: input.planId,
            fulfillmentType: product.fulfillmentType || "credentials",
            originalPrice: price.toFixed(2),
            discountPercent: "0.00",
            discountAmount: "0.00",
            finalPrice: price.toFixed(2),
            status: "payment_review",
            deliveryStatus: "not_delivered",
          }], { session });
        });
      } catch (error: any) {
        if (error?.code === 11000) throw new TRPCError({ code: "CONFLICT", message: "This payment reference has already been used" });
        throw error;
      }

      await AuditLog.create({
        id: await nextId("audit_logs"),
        action: "guest_order_created",
        entityType: "order",
        entityId: orderId,
        metadata: {
          orderNumber,
          customerEmail: input.customerEmail,
          paymentMethod: input.paymentMethod,
        },
      });

      return {
        orderId,
        orderNumber,
        finalPrice: price.toFixed(2),
        fulfillmentType: product.fulfillmentType || "credentials",
        message: product.fulfillmentType === "whatsapp_activation"
          ? "Order submitted for review. Manual activation will be tracked after payment approval."
          : "Order submitted for admin review.",
      };
    }),

  list: authedQuery.query(async ({ ctx }) => {
    await connectDb();
    const orders = cleanMany(await Order.find({ userId: ctx.user.id }).sort({ createdAt: -1 }).lean());
    return Promise.all((orders as any[]).map(async (order) => {
      const product = clean(await Product.findOne({ id: order.productId }).lean()) as any;
      const plan = clean(await ProductPlan.findOne({ id: order.planId }).lean()) as any;
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        productId: order.productId,
        planId: order.planId,
        finalPrice: order.finalPrice,
        status: order.status,
        deliveryStatus: order.deliveryStatus,
        fulfillmentType: order.fulfillmentType || product?.fulfillmentType || "credentials",
        fulfillmentNote: order.fulfillmentNote ?? null,
        deliveredAt: order.deliveredAt ?? null,
        createdAt: order.createdAt,
        productName: product?.name ?? "Product",
        productSlug: product?.slug ?? "",
        planName: plan?.name ?? "Plan",
      };
    }));
  }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      await connectDb();
      const order = clean(await Order.findOne({ id: input.id, userId: ctx.user.id }).lean()) as any;
      if (!order) return null;

      const product = clean(await Product.findOne({ id: order.productId }).lean()) as any;
      const plan = clean(await ProductPlan.findOne({ id: order.planId }).lean()) as any;
      const deliveryAvailable = Boolean(await DeliveryRecord.exists({ orderId: input.id, userId: ctx.user.id }));

      return {
        ...order,
        productName: product?.name ?? "Product",
        productSlug: product?.slug ?? "",
        planName: plan?.name ?? "Plan",
        delivery: null,
        deliveryAvailable,
        fulfillmentType: order.fulfillmentType || product?.fulfillmentType || "credentials",
        pendingFulfillmentMessage: (order.fulfillmentType || product?.fulfillmentType) === "whatsapp_activation"
          ? manualActivationMessage
          : pendingFulfillmentMessage,
      };
    }),

  revealDelivery: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const order = clean(await Order.findOne({ id: input.id, userId: ctx.user.id }).lean()) as any;
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      const delivery = clean(await DeliveryRecord.findOne({ orderId: input.id, userId: ctx.user.id }).lean()) as any;
      if (!delivery) throw new TRPCError({ code: "CONFLICT", message: "Delivery is not ready yet" });
      if (!delivery.viewedAt) {
        await DeliveryRecord.updateOne({ id: delivery.id }, { $set: { viewedAt: new Date() } });
        await Order.updateOne({ id: input.id, userId: ctx.user.id, deliveryStatus: "delivered" }, { $set: { deliveryStatus: "viewed" } });
      }
      return { orderId: input.id, delivery: serializeDeliveryRecord(delivery) };
    }),
});

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, adminQuery } from "../middleware";
import { connectDb } from "../queries/connection";
import {
  AuditLog,
  BinancePayTransaction,
  Category,
  Deposit,
  EasyPaisaTransaction,
  InventoryItem,
  Order,
  Product,
  ProductPlan,
  ProviderApplication,
  ScammerReport,
  SiteSetting,
  SupportReply,
  SupportTicket,
  ThirdPartyOrder,
  ThirdPartyProduct,
  ToolRequest,
  User,
  WalletTransaction,
  clean,
  cleanMany,
  nextId,
} from "../mongo/models";
import {
  completeManualOrder,
  credentialFieldsForWrite,
  fulfillPaidOrder,
  pendingFulfillmentMessage,
  serializeInventoryItem,
} from "../services/account-delivery";
import { listTechnysoftProducts, normalizeTechnysoftProduct } from "../services/technysoft";
import { listCanbosoProducts, normalizeCanbosoProduct } from "../services/canboso";
import { listAkundingProducts, normalizeAkundingProduct } from "../services/akunding";
import { isEditableAdminSettingKey, sanitizeAdminSettings } from "../lib/site-settings-security";
import { approveDepositAndCredit, applyWalletMutation, runInTransaction } from "../services/wallet-ledger";
import { providerDeliveryFields, readProviderDeliveryItems, sanitizeProviderDeliveryItems } from "../lib/provider-delivery";
import { isPlatformApiRealMode } from "../lib/platform-api-mode";
import { settleReferralCommissionSafely } from "../services/referral";
import { applyProviderOutcome, refundLocalWallet } from "../services/third-party-orders";
import { purchaseExternalMarketplaceProduct } from "../services/marketplace-provider-purchase";
import { recordAuditOnce } from "../services/audit-log";
import { sanitizeAdminMarketplaceOrderSummary } from "../lib/admin-marketplace-order";
import {
  effectiveSellingPriceUsd,
  parseUsdToPkrRate,
  pricingDisplayToUsd,
  shouldRepairSellingPrice,
} from "../lib/third-party-pricing";

const supportStatuses = ["open", "waiting_customer", "in_progress", "resolved", "closed"] as const;
const inventoryStatuses = ["available", "reserved", "sold", "disabled"] as const;
const scammerReportStatuses = ["pending", "approved", "rejected"] as const;
async function currentUsdToPkrRate() {
  const setting = await SiteSetting.findOne({ key: "usd_to_pkr" }).select("value").lean<{ value?: string }>();
  return parseUsdToPkrRate(setting?.value);
}

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "product";
}

function duplicateKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(code|card|slot|account|product|warranty|instant)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferredOriginalPriceUsd(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("chatgpt") && normalized.includes("plus")) return 20;
  if (normalized.includes("chatgpt") && normalized.includes("team")) return 30;
  if (normalized.includes("gemini") && normalized.includes("pro")) return 20;
  if (normalized.includes("canva") && normalized.includes("pro")) return 15;
  if (normalized.includes("capcut") && normalized.includes("pro")) return 10;
  if (normalized.includes("notion") && normalized.includes("business")) return 15;
  return 0;
}

async function uniqueProductSlug(name: string, existingProductId?: number) {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let suffix = 2;
  while (await Product.findOne({ slug, ...(existingProductId ? { id: { $ne: existingProductId } } : {}) }).select("id").lean()) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

async function defaultCategoryId() {
  const existing = await Category.findOne().sort({ id: 1 }).lean<{ id: number }>();
  if (existing) return existing.id;
  const category = await Category.create({
    id: await nextId("categories"),
    name: "Digital Products",
    slug: "digital-products",
    description: "Digital products and subscriptions",
  });
  return category.id;
}

function parseBulkAccountRows(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const rowNumber = index + 1;
      if (/^https?:\/\//i.test(line)) {
        return {
          activationLink: line,
        };
      }

      const cells = line
        .split(/\t|\||,/)
        .map((cell) => cell.trim())
        .filter(Boolean);
      const [accountEmail, password, twoFaSecret] = cells;
      if (accountEmail && /^https?:\/\//i.test(accountEmail)) {
        return {
          activationLink: accountEmail,
        };
      }

      if (!accountEmail || !z.string().email().safeParse(accountEmail).success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid email or activation link on account row ${rowNumber}` });
      }
      if (!password) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Missing password on account row ${rowNumber}` });
      }
      if (!twoFaSecret) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Missing 2FA on account row ${rowNumber}` });
      }

      return {
        accountEmail: accountEmail.toLowerCase(),
        password,
        twoFaSecret,
      };
    });
}

async function userSummary(userId?: number) {
  if (!userId) return { userName: "System", userEmail: null };
  const user = await User.findOne({ id: userId }).select("name email").lean<{ name?: string; email?: string }>();
  return {
    userName: user?.name ?? `User #${userId}`,
    userEmail: user?.email ?? null,
  };
}

export const adminRouter = createRouter({
  overview: adminQuery.query(async () => {
    await connectDb();
    const orders = await Order.find().lean<{ finalPrice: string; status: string; createdAt: string }[]>();
    const revenueStatuses = new Set(["paid", "processing", "pending_fulfillment", "delivered"]);
    const revenueOrders = orders.filter((order) => revenueStatuses.has(String(order.status)));
    const totalSales = revenueOrders.reduce((sum, order) => sum + Number(order.finalPrice || 0), 0);
    const marketplaceOrders = await ThirdPartyOrder.find().lean<{ priceUsd: string; providerCostUsd: string; productName: string; userName?: string; status: string; createdAt: string }[]>();
    const deliveredTp = marketplaceOrders.filter((order) => order.status === "delivered");
    const pendingTp = marketplaceOrders.filter((order) => ["pending", "pending_fulfillment", "processing"].includes(order.status));
    const totalMarketplaceRevenue = deliveredTp.reduce((sum, o) => sum + Number(o.priceUsd || 0), 0);
    const totalMarketplaceCost = deliveredTp.reduce((sum, o) => sum + Number(o.providerCostUsd || 0), 0);

    const recentDirect = orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);
    const recentMarketplace = deliveredTp
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map((o, index) => ({ type: "marketplace" as const, id: index, productName: o.productName, userName: o.userName, amount: Number(o.priceUsd || 0), status: "delivered", createdAt: o.createdAt }));

    const dailyTrend: Record<string, { date: string; sales: number; marketplace: number; profit: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyTrend[key] = { date: key, sales: 0, marketplace: 0, profit: 0 };
    }
    for (const o of revenueOrders) {
      const key = new Date(o.createdAt).toISOString().slice(0, 10);
      if (dailyTrend[key]) dailyTrend[key].sales += Number(o.finalPrice || 0);
    }
    for (const o of deliveredTp) {
      const key = new Date(o.createdAt).toISOString().slice(0, 10);
      if (dailyTrend[key]) {
        dailyTrend[key].marketplace += Number(o.priceUsd || 0);
        dailyTrend[key].profit += Number(o.priceUsd || 0) - Number(o.providerCostUsd || 0);
      }
    }

    const statusCounts = orders.reduce((acc, o) => {
      acc[o.status || "unknown"] = (acc[o.status || "unknown"] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSales,
      totalOrders: orders.length + marketplaceOrders.length,
      pendingDeposits: await Deposit.countDocuments({ status: "pending" }),
      pendingOrders: await Order.countDocuments({ status: { $in: ["payment_review", "processing", "pending_fulfillment"] } }),
      pendingFulfillment: await Order.countDocuments({ status: "pending_fulfillment" }),
      pendingMarketplaceOrders: pendingTp.length,
      activeUsers: await User.countDocuments({ role: "user" }),
      totalInventory: await InventoryItem.countDocuments({ status: "available" }),
      openTickets: await SupportTicket.countDocuments({ status: { $in: ["open", "in_progress"] } }),
      pendingProviders: await ProviderApplication.countDocuments({ status: "pending" }),
      totalMarketplaceRevenue,
      totalMarketplaceCost,
      totalMarketplaceProfit: totalMarketplaceRevenue - totalMarketplaceCost,
      marketplaceOrdersDelivered: deliveredTp.length,
      dailyTrend: Object.values(dailyTrend),
      statusCounts,
      recentDirect,
      recentMarketplace,
    };
  }),

  profitReport: adminQuery
    .input(z.object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
      groupBy: z.enum(["day", "week", "month"]).default("day"),
    }).optional())
    .query(async ({ input }) => {
      await connectDb();
      const filter: Record<string, unknown> = { status: "delivered" };
      if (input?.from || input?.to) {
        filter.createdAt = {};
        if (input.from) (filter.createdAt as any).$gte = new Date(input.from);
        if (input.to) (filter.createdAt as any).$lte = new Date(input.to);
      }
      const orders = cleanMany(await ThirdPartyOrder.find(filter).sort({ createdAt: -1 }).lean()) as any[];
      const revenue = orders.reduce((sum, o) => sum + Number(o.priceUsd || 0), 0);
      const cost = orders.reduce((sum, o) => sum + Number(o.providerCostUsd || 0), 0);
      const profit = revenue - cost;

      const byProduct = new Map<string, { name: string; orders: number; revenue: number; cost: number; profit: number }>();
      for (const o of orders) {
        const key = o.productName || "Unknown";
        const existing = byProduct.get(key) || { name: key, orders: 0, revenue: 0, cost: 0, profit: 0 };
        existing.orders += 1;
        existing.revenue += Number(o.priceUsd || 0);
        existing.cost += Number(o.providerCostUsd || 0);
        existing.profit = existing.revenue - existing.cost;
        byProduct.set(key, existing);
      }

      const groupBy = input?.groupBy || "day";
      const trend = new Map<string, { label: string; revenue: number; cost: number; profit: number; orders: number }>();
      for (const o of orders) {
        const date = new Date(o.createdAt);
        let key: string;
        let label: string;
        if (groupBy === "week") {
          const start = new Date(date);
          start.setDate(date.getDate() - date.getDay());
          key = start.toISOString().slice(0, 10);
          label = key;
        } else if (groupBy === "month") {
          key = date.toISOString().slice(0, 7);
          label = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        } else {
          key = date.toISOString().slice(0, 10);
          label = new Date(key).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }
        const existing = trend.get(key) || { label, revenue: 0, cost: 0, profit: 0, orders: 0 };
        existing.revenue += Number(o.priceUsd || 0);
        existing.cost += Number(o.providerCostUsd || 0);
        existing.profit = existing.revenue - existing.cost;
        existing.orders += 1;
        trend.set(key, existing);
      }

      const trendArray = [...trend.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([, value]) => value);

      const statusBreakdown = {
        delivered: orders.length,
        refunded: cleanMany(await ThirdPartyOrder.find({ ...filter, status: "refunded" }).lean()).length,
        failed: cleanMany(await ThirdPartyOrder.find({ ...filter, status: "failed" }).lean()).length,
        cancelled: cleanMany(await ThirdPartyOrder.find({ ...filter, status: "cancelled" }).lean()).length,
      };

      return {
        summary: { revenue, cost, profit, orders: orders.length, avgOrderValue: orders.length ? revenue / orders.length : 0 },
        statusBreakdown,
        trend: trendArray,
        byProduct: [...byProduct.values()].sort((a, b) => b.profit - a.profit),
        orders: orders.map((o) => ({
          id: o.id,
          productName: o.productName,
          userName: o.userName,
          userEmail: o.userEmail,
          priceUsd: o.priceUsd,
          providerCostUsd: o.providerCostUsd,
          profitUsd: Number(o.priceUsd || 0) - Number(o.providerCostUsd || 0),
          createdAt: o.createdAt,
        })),
      };
    }),

  userList: adminQuery
    .input(z.object({
      role: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      await connectDb();
      const filter: Record<string, unknown> = {};
      if (input?.role) filter.role = input.role;
      if (input?.search) {
        filter.$or = [
          { name: { $regex: input.search, $options: "i" } },
          { email: { $regex: input.search, $options: "i" } },
        ];
      }
      return cleanMany(await User.find(filter)
        .select("-passwordHash -unionId")
        .sort({ createdAt: -1 })
        .skip(input?.offset ?? 0)
        .limit(input?.limit ?? 50)
        .lean());
    }),

  depositList: adminQuery
    .input(z.object({
      status: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      await connectDb();
      const filter = input?.status ? { status: input.status } : {};
      const deposits = cleanMany(await Deposit.find(filter).sort({ createdAt: -1 }).skip(input?.offset ?? 0).limit(input?.limit ?? 50).lean());
      return Promise.all((deposits as any[]).map(async (deposit) => ({
        ...deposit,
        ...(await userSummary(deposit.userId)),
      })));
    }),

  depositApprove: adminQuery
    .input(z.object({ id: z.number(), adminNote: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      return approveDepositAndCredit({ depositId: input.id, actorId: ctx.user.id, adminNote: input.adminNote });
    }),

  depositReject: adminQuery
    .input(z.object({ id: z.number(), rejectionReason: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const rejected = await Deposit.updateOne(
        { id: input.id, status: { $in: ["pending", "needs_review"] } },
        { $set: { status: "rejected", rejectionReason: input.rejectionReason } },
      );
      if (rejected.modifiedCount !== 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Deposit not found or already processed" });
      }
      await AuditLog.create({ id: await nextId("audit_logs"), actorId: ctx.user.id, action: "deposit_rejected", entityType: "deposit", entityId: input.id });
      return { success: true };
    }),

  easypaisaTransactionList: adminQuery
    .input(z.object({
      status: z.enum(["pending", "claimed", "rejected"]).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      await connectDb();
      const filter = input?.status ? { status: input.status } : {};
      const rows = cleanMany(await EasyPaisaTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(input?.offset ?? 0)
        .limit(input?.limit ?? 50)
        .lean());
      return Promise.all((rows as any[]).map(async (row) => ({
        ...row,
        ...(await userSummary(row.claimedByUserId)),
      })));
    }),

  binancePayTransactionList: adminQuery
    .input(z.object({
      status: z.enum(["pending", "paid", "claimed", "expired", "rejected"]).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      await connectDb();
      const filter = input?.status ? { status: input.status } : {};
      const rows = cleanMany(await BinancePayTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(input?.offset ?? 0)
        .limit(input?.limit ?? 50)
        .lean());
      return Promise.all((rows as any[]).map(async (row) => ({
        ...row,
        ...(await userSummary(row.userId)),
      })));
    }),

  orderList: adminQuery.query(async () => {
    await connectDb();
    const [directOrders, marketplaceOrders] = await Promise.all([
      (async () => {
        const orders = cleanMany(await Order.find().sort({ createdAt: -1 }).lean());
        return Promise.all((orders as any[]).map(async (order) => {
          const product = await Product.findOne({ id: order.productId }).lean<{ name?: string }>();
          const plan = await ProductPlan.findOne({ id: order.planId }).lean<{ name?: string }>();
          return {
            ...order,
            productName: product?.name,
            planName: plan?.name,
            fulfillmentType: order.fulfillmentType ?? (product as any)?.fulfillmentType ?? "credentials",
            pendingFulfillmentMessage,
            type: "direct",
            ...(order.checkoutType === "direct"
              ? { userName: order.guestName ?? "Guest customer", userEmail: order.guestEmail ?? null }
              : await userSummary(order.userId)),
          };
        }));
      })(),
      (async () => {
        const orders = cleanMany(await ThirdPartyOrder.find().select("-items -itemsEncrypted -rawOrder -providerRaw").sort({ createdAt: -1 }).lean());
        return Promise.all((orders as any[]).map(async (order) => {
          const user = clean(await User.findOne({ id: order.userId }).select("name email").lean()) as any;
          const summary = sanitizeAdminMarketplaceOrderSummary(order);
          return {
            ...summary,
            type: "marketplace",
            userName: user?.name ?? "Customer",
            userEmail: user?.email ?? null,
            productName: order.productName,
            planName: null,
            fulfillmentType: "credentials",
            pendingFulfillmentMessage: null,
          };
        }));
      })(),
    ]);
    const combined = [...directOrders, ...marketplaceOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return combined;
  }),

  orderApproveDirectPayment: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      let order = clean(await Order.findOneAndUpdate(
        { id: input.id, checkoutType: "direct", status: "payment_review" },
        { $set: { status: "paid" } },
        { returnDocument: "after" },
      ).lean()) as any;
      if (!order) {
        order = clean(await Order.findOne({ id: input.id, checkoutType: "direct" }).lean()) as any;
        if (!order || !["paid", "processing", "pending_fulfillment", "delivered"].includes(order.status)) {
          throw new TRPCError({ code: "CONFLICT", message: "Direct payment order was already resolved" });
        }
      }

      const fulfillment = await fulfillPaidOrder(input.id, ctx.user.id);
      await recordAuditOnce({
        operationKey: `direct-payment-approve:${input.id}`,
        actorId: ctx.user.id,
        action: "direct_payment_approved",
        entityType: "order",
        entityId: input.id,
        metadata: { orderNumber: order.orderNumber, fulfillmentStatus: fulfillment.status },
      });
      return {
        success: true,
        deliveryStatus: fulfillment.status,
        message: fulfillment.status === "pending_fulfillment" ? fulfillment.message || pendingFulfillmentMessage : "Account delivered.",
      };
    }),

  orderRejectDirectPayment: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      let order = clean(await Order.findOneAndUpdate(
        { id: input.id, checkoutType: "direct", status: "payment_review" },
        { $set: { status: "failed" } },
        { returnDocument: "after" },
      ).lean()) as any;
      if (!order) {
        order = clean(await Order.findOne({ id: input.id, checkoutType: "direct", status: "failed" }).lean()) as any;
        if (!order) throw new TRPCError({ code: "CONFLICT", message: "Direct payment order was already resolved" });
      }
      await recordAuditOnce({
        operationKey: `direct-payment-reject:${input.id}`,
        actorId: ctx.user.id,
        action: "direct_payment_rejected",
        entityType: "order",
        entityId: input.id,
        metadata: { orderNumber: order.orderNumber },
      });
      return { success: true };
    }),

  orderCompleteManual: adminQuery
    .input(z.object({ id: z.number(), note: z.string().trim().min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      return completeManualOrder({ orderId: input.id, actorId: ctx.user.id, note: input.note });
    }),

  productList: adminQuery.query(async () => {
    await connectDb();
    const products = cleanMany(await Product.find().sort({ createdAt: -1 }).lean());
    return Promise.all((products as any[]).map(async (product) => {
      const [category, plans, available, reserved, sold, disabled] = await Promise.all([
        Category.findOne({ id: product.categoryId }).lean<{ name?: string }>(),
        ProductPlan.find({ productId: product.id, isActive: true }).sort({ id: 1 }).lean(),
        InventoryItem.countDocuments({ productId: product.id, status: "available" }),
        InventoryItem.countDocuments({ productId: product.id, status: "reserved" }),
        InventoryItem.countDocuments({ productId: product.id, status: "sold" }),
        InventoryItem.countDocuments({ productId: product.id, status: "disabled" }),
      ]);
      return {
        ...product,
        categoryName: category?.name ?? "Uncategorized",
        plans: cleanMany(plans),
        inventoryCount: available,
        inventorySummary: { available, reserved, sold, disabled, total: available + reserved + sold + disabled },
      };
    }));
  }),

  productDelete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const product = clean(await Product.findOne({ id: input.id }).lean()) as any;
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      const [orderCount, soldInventoryCount] = await Promise.all([
        Order.countDocuments({ productId: input.id }),
        InventoryItem.countDocuments({ productId: input.id, status: { $in: ["sold", "reserved"] } }),
      ]);
      if (orderCount > 0 || soldInventoryCount > 0) {
        await Product.updateOne({ id: input.id }, { $set: { status: "inactive" } });
        await AuditLog.create({
          id: await nextId("audit_logs"),
          actorId: ctx.user.id,
          action: "product_archived",
          entityType: "product",
          entityId: input.id,
          metadata: { orderCount, soldInventoryCount },
        });
        return { success: true, archived: true };
      }
      await ProductPlan.deleteMany({ productId: input.id });
      await InventoryItem.deleteMany({ productId: input.id });
      await Product.deleteOne({ id: input.id });
      await AuditLog.create({
        id: await nextId("audit_logs"),
        actorId: ctx.user.id,
        action: "product_deleted",
        entityType: "product",
        entityId: input.id,
      });
      return { success: true, archived: false };
    }),

  productUpdate: adminQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      slug: z.string().optional(),
      categoryId: z.number().optional(),
      shortDescription: z.string().optional(),
      description: z.string().optional(),
      features: z.array(z.string()).optional(),
      status: z.enum(["active", "inactive"]).optional(),
      fulfillmentType: z.enum(["credentials", "whatsapp_activation"]).optional(),
      setupInstructions: z.string().max(4000).optional(),
      price: z.coerce.number().positive().optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDb();
      const { id, price, ...updates } = input;
      const product = clean(await Product.findOne({ id }).lean()) as any;
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      await Product.updateOne({ id }, { $set: updates });
      if (price !== undefined && price > 0) {
        const plan = clean(await ProductPlan.findOne({ productId: id, isActive: true }).sort({ id: 1 }).lean()) as any;
        if (plan) {
          await ProductPlan.updateOne({ id: plan.id }, { $set: { price: price.toFixed(2), salePrice: price.toFixed(2) } });
        }
      }
      return { success: true };
    }),

  thirdPartyProductList: adminQuery.query(async () => {
    await connectDb();
    const products = cleanMany(await ThirdPartyProduct.find().sort({ updatedAt: -1 }).lean()) as any[];
    return products.map((product) => {
      const originalPriceUsd = Number(product.originalPriceUsd || 0);
      const originalDisplayAmount = Number(product.originalPriceDisplayAmount || 0);
      const hasOriginalDisplayAmount = Number.isFinite(originalDisplayAmount) && originalDisplayAmount > 0;
      return {
        ...product,
        effectivePriceUsd: effectiveSellingPriceUsd(product.priceUsd, product.sourcePriceUsd),
        originalPriceCurrency: hasOriginalDisplayAmount
          ? product.originalPriceCurrency || product.priceCurrency || "USD"
          : "USD",
        originalPriceDisplayAmount: hasOriginalDisplayAmount
          ? product.originalPriceDisplayAmount
          : originalPriceUsd > 0
            ? originalPriceUsd.toFixed(2)
            : "",
      };
    });
  }),

  thirdPartyProductSync: adminQuery.mutation(async ({ ctx }) => {
    await connectDb();

    const errors: string[] = [];

    // Try each provider individually so one failure doesn't block the rest
    async function safeFetch(
      provider: string,
      fn: () => Promise<any[]>,
    ) {
      try {
        return await fn();
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`${provider}: ${msg}`);
        return [];
      }
    }

    const [technysoft, canboso, akunding] = await Promise.all([
      safeFetch("Technysoft", () =>
        listTechnysoftProducts().then((products) =>
          products.map((product) => ({
            provider: "technysoft" as const,
            raw: product,
            product: normalizeTechnysoftProduct(product),
          })),
        ),
      ),
      safeFetch("Canboso", () =>
        listCanbosoProducts().then((products) =>
          products.map((product) => ({
            provider: "canboso" as const,
            raw: product,
            product: normalizeCanbosoProduct(product),
          })),
        ),
      ),
      safeFetch("Akunding", () =>
        listAkundingProducts().then((products) =>
          products.map((product) => ({
            provider: "akunding" as const,
            raw: product,
            product: normalizeAkundingProduct(product),
          })),
        ),
      ),
    ]);

    const all = [...technysoft, ...canboso, ...akunding].map((item) => ({
      provider: item.provider,
      externalProductId: String(item.product.id),
      key: duplicateKey(item.product.name),
      title: item.product.name,
      description: item.product.description,
      priceUsd: Number(item.product.priceUsd || 0),
      stock: Number(item.product.stock || 0),
      unlimited: Boolean(item.product.unlimited),
      instant: Boolean(item.product.instant),
      categoryName: item.product.categoryName || "3rd Party",
      raw: item.raw,
    })).filter((item) => item.key && item.priceUsd > 0);

    const catalog = all;
    let created = 0;
    let updated = 0;

    for (const item of catalog) {
      const existing = clean(await ThirdPartyProduct.findOne({
        provider: item.provider,
        externalProductId: item.externalProductId,
      }).lean()) as any;
      const sourceFields = {
        duplicateKey: item.key,
        sourceTitle: item.title,
        sourceDescription: item.description || "",
        sourcePriceUsd: item.priceUsd.toFixed(2),
        sourceStock: item.stock,
        originalPriceUsd: existing?.originalPriceUsd ?? inferredOriginalPriceUsd(item.title).toFixed(2),
        categoryName: item.categoryName,
        instant: item.instant,
        unlimited: item.unlimited,
        rawProduct: item.raw,
      };
      if (existing) {
        const repairedSellingFields = shouldRepairSellingPrice(existing.priceUsd, item.priceUsd)
          ? {
              priceUsd: item.priceUsd.toFixed(2),
              priceCurrency: "USD",
              priceDisplayAmount: item.priceUsd.toFixed(2),
            }
          : {};
        await ThirdPartyProduct.updateOne(
          { id: existing.id },
          { $set: { ...sourceFields, ...repairedSellingFields } },
        );
        updated += 1;
      } else {
        await ThirdPartyProduct.create({
          id: await nextId("third_party_products"),
          provider: item.provider,
          externalProductId: item.externalProductId,
          ...sourceFields,
          title: item.title,
          description: item.description || "",
          priceUsd: item.priceUsd.toFixed(2),
          priceCurrency: "USD",
          priceDisplayAmount: item.priceUsd.toFixed(2),
          originalPriceCurrency: "USD",
          originalPriceDisplayAmount: inferredOriginalPriceUsd(item.title) > 0 ? inferredOriginalPriceUsd(item.title).toFixed(2) : "",
          status: "inactive",
        });
        created += 1;
      }
    }

    await AuditLog.create({
      id: await nextId("audit_logs"),
      actorId: ctx.user.id,
      action: "third_party_products_synced",
      entityType: "third_party_product",
      metadata: { created, updated, total: catalog.length },
    });
    return { success: true, created, updated, total: catalog.length };
  }),

  thirdPartyProductUpdate: adminQuery
    .input(z.object({
      id: z.number(),
      title: z.string().trim().min(1).max(180).optional(),
      description: z.string().trim().max(5000).optional(),
      priceUsd: z.coerce.number().positive().optional(),
      originalPriceUsd: z.coerce.number().min(0).optional(),
      originalPriceCurrency: z.enum(["USD", "PKR"]).optional(),
      originalPriceDisplayAmount: z.string().trim().max(40).optional(),
      priceCurrency: z.enum(["USD", "PKR"]).optional(),
      priceDisplayAmount: z.string().trim().max(40).optional(),
      status: z.enum(["active", "inactive"]).optional(),
      providerPurchaseEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const {
        id,
        priceUsd,
        originalPriceUsd,
        priceCurrency,
        priceDisplayAmount,
        originalPriceCurrency,
        originalPriceDisplayAmount,
        ...rest
      } = input;
      const product = clean(await ThirdPartyProduct.findOne({ id }).lean()) as any;
      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "3rd party product not found" });
      }
      const usdToPkrRate = await currentUsdToPkrRate();
      const updates: Record<string, unknown> = { ...rest };
      const parsedSellingDisplay = Number(priceDisplayAmount);
      const parsedOriginalDisplay = Number(originalPriceDisplayAmount);
      if (priceDisplayAmount !== undefined && Number.isFinite(parsedSellingDisplay) && parsedSellingDisplay > 0) {
        const displayCurrency = priceCurrency ?? "USD";
        updates.priceCurrency = displayCurrency;
        updates.priceDisplayAmount = priceDisplayAmount;
        updates.priceUsd = pricingDisplayToUsd(parsedSellingDisplay, displayCurrency, usdToPkrRate).toFixed(2);
      } else if (priceUsd !== undefined) {
        updates.priceUsd = priceUsd.toFixed(2);
      }
      if (priceCurrency !== undefined && priceDisplayAmount === undefined) updates.priceCurrency = priceCurrency;

      if (originalPriceDisplayAmount !== undefined && Number.isFinite(parsedOriginalDisplay) && parsedOriginalDisplay > 0) {
        const displayCurrency = originalPriceCurrency ?? "USD";
        updates.originalPriceCurrency = displayCurrency;
        updates.originalPriceDisplayAmount = originalPriceDisplayAmount;
        updates.originalPriceUsd = pricingDisplayToUsd(parsedOriginalDisplay, displayCurrency, usdToPkrRate).toFixed(2);
      } else if (originalPriceUsd !== undefined) {
        updates.originalPriceUsd = originalPriceUsd.toFixed(2);
        if (originalPriceUsd > 0) {
          updates.originalPriceDisplayAmount = originalPriceUsd.toFixed(2);
          updates.originalPriceCurrency = "USD";
        }
      }
      if (Object.keys(updates).length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nothing to update" });
      }
      if (updates.status === "active") {
        const effectivePrice = effectiveSellingPriceUsd(updates.priceUsd ?? product.priceUsd, product.sourcePriceUsd);
        if (effectivePrice <= 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Set a valid selling price before activating this product" });
        }
      }
      if (updates.status === "inactive") updates.providerPurchaseEnabled = false;
      if (updates.providerPurchaseEnabled === true) {
        if ((updates.status ?? product.status) !== "active") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Activate the product before enabling live provider purchase" });
        }
      }
      await ThirdPartyProduct.updateOne({ id }, { $set: updates });
      if (
        product.duplicateKey &&
        (
          updates.originalPriceUsd !== undefined ||
          updates.originalPriceCurrency !== undefined ||
          updates.originalPriceDisplayAmount !== undefined
        )
      ) {
        const duplicateOriginalPriceUpdates: Record<string, unknown> = {};
        if (updates.originalPriceUsd !== undefined) duplicateOriginalPriceUpdates.originalPriceUsd = updates.originalPriceUsd;
        if (updates.originalPriceCurrency !== undefined) duplicateOriginalPriceUpdates.originalPriceCurrency = updates.originalPriceCurrency;
        if (updates.originalPriceDisplayAmount !== undefined) duplicateOriginalPriceUpdates.originalPriceDisplayAmount = updates.originalPriceDisplayAmount;
        await ThirdPartyProduct.updateMany(
          { duplicateKey: product.duplicateKey, id: { $ne: id } },
          { $set: duplicateOriginalPriceUpdates },
        );
      }
      await AuditLog.create({
        id: await nextId("audit_logs"),
        actorId: ctx.user.id,
        action: "third_party_product_updated",
        entityType: "third_party_product",
        entityId: id,
        metadata: updates,
      });
      return { success: true };
    }),

  thirdPartyOrderList: adminQuery.query(async () => {
    await connectDb();
    const orders = cleanMany(await ThirdPartyOrder.find().sort({ createdAt: -1 }).limit(200).lean()) as any[];
    return Promise.all(orders.map(async (order) => {
      const customer = clean(await User.findOne({ id: order.userId }).select("name email").lean()) as any;
      return {
        id: order.id,
        userId: order.userId,
        userName: customer?.name ?? "Customer",
        userEmail: customer?.email ?? null,
        provider: order.provider,
        productName: order.productName,
        quantity: order.quantity,
        priceUsd: order.priceUsd,
        status: order.status,
        reconciliationStatus: order.reconciliationStatus,
        externalOrderId: order.externalOrderId ?? null,
        items: [],
        errorCode: order.errorCode ?? null,
        errorMessage: order.errorMessage ?? null,
        createdAt: order.createdAt,
        deliveredAt: order.deliveredAt ?? null,
        refundedAt: order.refundedAt ?? null,
      };
    }));
  }),

  thirdPartyOrderRevealDelivery: adminQuery
    .input(z.object({ id: z.number().positive() }))
    .mutation(async ({ input }) => {
      await connectDb();
      const order = clean(await ThirdPartyOrder.findOne({ id: input.id }).lean()) as any;
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Marketplace order not found" });
      if (order.status !== "delivered") {
        throw new TRPCError({ code: "CONFLICT", message: "Delivery is not ready" });
      }
      const items = readProviderDeliveryItems(order);
      if (items.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "No delivery credentials are recorded" });
      return { id: order.id, items };
    }),

  thirdPartyOrderResolve: adminQuery
    .input(z.object({
      id: z.number().positive(),
      resolution: z.enum(["delivered", "refunded", "cancelled"]),
      items: z.array(z.string().trim().min(1).max(5000)).max(100).optional(),
      note: z.string().trim().min(3).max(1000),
    }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      if (input.resolution === "delivered") {
        await runInTransaction(async (session) => {
          const current = clean(await ThirdPartyOrder.findOne({ id: input.id }).session(session).lean()) as any;
          if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Marketplace order not found" });
          if (["refunded", "cancelled", "failed"].includes(String(current.status))) {
            throw new TRPCError({ code: "CONFLICT", message: "A refunded marketplace order cannot be delivered" });
          }
          const items = sanitizeProviderDeliveryItems(input.items ?? readProviderDeliveryItems(current));
          if (items.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Add the delivered account, code, or credential" });
          const now = new Date();
          const transition = await ThirdPartyOrder.updateOne(
            { id: input.id, status: current.status },
            { $set: {
              status: "delivered",
              fulfillmentStatus: "fulfilled",
              ...providerDeliveryFields(items),
              deliveredAt: now,
              reconciliationStatus: "resolved",
              reconciliationNote: input.note,
              reconciledAt: now,
              reconciledBy: ctx.user.id,
            }, $unset: { refundedAt: 1 } },
            { session },
          );
          if (transition.matchedCount !== 1) {
            throw new TRPCError({ code: "CONFLICT", message: "Marketplace order state changed during delivery" });
          }
          return current;
        });
        const deliveredOrder = clean(await ThirdPartyOrder.findOne({ id: input.id, status: "delivered" }).lean()) as any;
        if (!deliveredOrder) {
          throw new TRPCError({ code: "CONFLICT", message: "Marketplace order changed before delivery settlement" });
        }
        await settleReferralCommissionSafely({
          sourceType: "third_party_order",
          sourceId: deliveredOrder.id,
          referredUserId: deliveredOrder.userId,
          baseAmount: deliveredOrder.sellingPriceUsd || deliveredOrder.priceUsd,
        });
      } else {
        await refundLocalWallet({
          orderId: input.id,
          note: input.note,
          terminalStatus: input.resolution,
          actorId: ctx.user.id,
        });
      }
      await AuditLog.create({
        id: await nextId("audit_logs"),
        actorId: ctx.user.id,
        action: "third_party_order_reconciled",
        entityType: "third_party_order",
        entityId: input.id,
        metadata: { resolution: input.resolution, note: input.note },
      });
      return { success: true };
    }),

  inventoryList: adminQuery
    .input(z.object({
      status: z.enum(inventoryStatuses).optional(),
      productId: z.number().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      await connectDb();
      const filter: Record<string, unknown> = {};
      if (input?.status) filter.status = input.status;
      if (input?.productId) filter.productId = input.productId;
      const items = cleanMany(await InventoryItem.find(filter).sort({ createdAt: -1 }).skip(input?.offset ?? 0).limit(input?.limit ?? 50).lean());
      return Promise.all((items as any[]).map(async (item) => {
        const product = await Product.findOne({ id: item.productId }).lean<{ name?: string }>();
        const plan = item.planId ? await ProductPlan.findOne({ id: item.planId }).lean<{ name?: string }>() : null;
        const assignedUserId = item.assignedToUserId ?? item.soldToUserId;
        const orderId = item.orderId ?? item.reservedByOrderId;
        const assignedUser = assignedUserId
          ? await User.findOne({ id: assignedUserId }).select("name email").lean<{ name?: string; email?: string }>()
          : null;
        const order = orderId
          ? await Order.findOne({ id: orderId }).select("orderNumber").lean<{ orderNumber?: string }>()
          : null;
        return {
          ...serializeInventoryItem(item),
          productName: product?.name,
          planName: plan?.name,
          assignedUserName: assignedUser?.name ?? null,
          assignedUserEmail: assignedUser?.email ?? null,
          orderNumber: order?.orderNumber ?? null,
        };
      }));
    }),

  inventoryCreate: adminQuery
    .input(z.object({
      productId: z.number(),
      planId: z.number().optional(),
      accountEmail: z.string().email(),
      password: z.string().min(1),
      twoFaSecret: z.string().min(1),
      backupMethod: z.string().max(500).optional(),
      licenseKey: z.string().optional(),
      activationLink: z.string().optional(),
      instructions: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDb();
      const accountEmail = input.accountEmail.trim().toLowerCase();
      const duplicate = await InventoryItem.findOne({ accountEmail }).lean();
      if (duplicate) {
        throw new TRPCError({ code: "CONFLICT", message: "This account email already exists in inventory" });
      }
      const product = await Product.findOne({ id: input.productId }).lean();
      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }
      const credentials = credentialFieldsForWrite({
        password: input.password,
        twoFaSecret: input.twoFaSecret,
        licenseKey: input.licenseKey,
        activationLink: input.activationLink,
      });
      const item = await InventoryItem.create({
        id: await nextId("inventory_items"),
        status: "available",
        productId: input.productId,
        planId: input.planId,
        accountEmail,
        email: accountEmail,
        ...credentials,
        backupMethod: input.backupMethod,
        instructions: input.instructions,
        notes: input.notes,
      });
      return clean(item);
    }),

  stockCreate: adminQuery
    .input(z.object({
      productName: z.string().trim().min(1).max(160),
      productPrice: z.coerce.number().positive(),
      deliveryMethod: z.enum(["instant", "whatsapp"]),
      accountRows: z.string().trim().max(200_000).optional(),
      instructions: z.string().trim().max(8000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const productName = input.productName.trim();
      const fulfillmentType = input.deliveryMethod === "whatsapp" ? "whatsapp_activation" : "credentials";
      const deliveryTime = input.deliveryMethod === "whatsapp" ? "WhatsApp activation" : "Instant";
      const price = input.productPrice.toFixed(2);
      const setupInstructions = input.instructions?.trim() || "";
      const accountRows = fulfillmentType === "credentials" ? parseBulkAccountRows(input.accountRows || "") : [];
      const credentialRows = accountRows.filter((row) => row.accountEmail);
      const activationLinkRows = accountRows.filter((row) => row.activationLink);

      if (fulfillmentType === "credentials" && accountRows.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Add at least one account row for instant delivery" });
      }

      const duplicateEmailInInput = credentialRows.find((row, index) =>
        credentialRows.findIndex((candidate) => candidate.accountEmail === row.accountEmail) !== index
      );
      if (duplicateEmailInInput) {
        throw new TRPCError({ code: "CONFLICT", message: `Duplicate account in this upload: ${duplicateEmailInInput.accountEmail}` });
      }

      const duplicateLinkInInput = activationLinkRows.find((row, index) =>
        activationLinkRows.findIndex((candidate) => candidate.activationLink === row.activationLink) !== index
      );
      if (duplicateLinkInInput) {
        throw new TRPCError({ code: "CONFLICT", message: "Duplicate activation link in this upload" });
      }

      if (credentialRows.length > 0) {
        const existing = await InventoryItem.find({
          accountEmail: { $in: credentialRows.map((row) => row.accountEmail) },
        }).select("accountEmail").lean<{ accountEmail?: string }[]>();
        if (existing.length > 0) {
          throw new TRPCError({ code: "CONFLICT", message: `Account already exists: ${existing[0].accountEmail}` });
        }
      }

      if (activationLinkRows.length > 0) {
        const fingerprints = activationLinkRows.map((row) =>
          credentialFieldsForWrite({ activationLink: row.activationLink }).activationLinkFingerprint,
        );
        const existing = await InventoryItem.find({
          $or: [
            { activationLinkFingerprint: { $in: fingerprints } },
            { activationLink: { $in: activationLinkRows.map((row) => row.activationLink) } },
          ],
        }).select("id").lean();
        if (existing.length > 0) {
          throw new TRPCError({ code: "CONFLICT", message: "Activation link already exists in inventory" });
        }
      }

      let product = clean(await Product.findOne({
        name: { $regex: `^${productName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
      }).lean()) as any;

      if (!product) {
        const categoryId = await defaultCategoryId();
        product = clean(await Product.create({
          id: await nextId("products"),
          name: productName,
          slug: await uniqueProductSlug(productName),
          categoryId,
          shortDescription: `${productName} subscription access`,
          description: `${productName} subscription access provided by Sasify.`,
          features: input.deliveryMethod === "whatsapp"
            ? ["Manual WhatsApp activation", "Admin assisted setup"]
            : activationLinkRows.length > 0
              ? ["Instant activation link delivery", "Secure activation details"]
              : ["Instant credential delivery", "Secure account details"],
          status: "active",
          fulfillmentType,
          setupInstructions,
        })) as any;
      } else {
        await Product.updateOne(
          { id: product.id },
          {
            $set: {
              fulfillmentType,
              status: "active",
              ...(setupInstructions ? { setupInstructions } : {}),
            },
          },
        );
      }

      let plan = clean(await ProductPlan.findOne({
        productId: product.id,
        isActive: true,
        price,
        deliveryTime,
      }).lean()) as any;

      if (!plan) {
        plan = clean(await ProductPlan.create({
          id: await nextId("product_plans"),
          productId: product.id,
          name: deliveryTime,
          price,
          deliveryTime,
          activationMethod: fulfillmentType,
          isActive: true,
        })) as any;
      }

      const inventoryItems = [];
      if (fulfillmentType === "credentials") {
        for (const row of accountRows) {
          const credentials = credentialFieldsForWrite({
            password: row.password,
            twoFaSecret: row.twoFaSecret,
            activationLink: row.activationLink,
          });
          inventoryItems.push({
            id: await nextId("inventory_items"),
            productId: product.id,
            planId: plan.id,
            status: "available",
            accountEmail: row.accountEmail,
            email: row.accountEmail,
            ...credentials,
            instructions: setupInstructions,
            notes: setupInstructions,
          });
        }
        if (inventoryItems.length > 0) {
          await InventoryItem.insertMany(inventoryItems, { ordered: true });
        }
      }

      await AuditLog.create({
        id: await nextId("audit_logs"),
        actorId: ctx.user.id,
        action: "stock_product_created",
        entityType: "product",
        entityId: product.id,
        metadata: {
          productName,
          productId: product.id,
          planId: plan.id,
          inserted: inventoryItems.length,
          deliveryMethod: input.deliveryMethod,
          price,
        },
      });

      return {
        success: true,
        productId: product.id,
        planId: plan.id,
        inserted: inventoryItems.length,
      };
    }),

  inventoryUpdate: adminQuery
    .input(z.object({
      id: z.number(),
      status: z.enum(inventoryStatuses).optional(),
      accountEmail: z.string().nullable().optional(),
      password: z.string().nullable().optional(),
      twoFaSecret: z.string().nullable().optional(),
      backupMethod: z.string().nullable().optional(),
      licenseKey: z.string().nullable().optional(),
      activationLink: z.string().nullable().optional(),
      instructions: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDb();
      const { id, ...updates } = input;
      const existing = clean(await InventoryItem.findOne({ id }).lean()) as any;
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Inventory item not found" });
      if (existing.status === "sold" && updates.status === "available") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Sold accounts cannot be returned to available stock" });
      }

      const set: Record<string, unknown> = {};
      if (updates.status) set.status = updates.status;
      if (updates.accountEmail !== undefined) {
        const accountEmail = updates.accountEmail?.trim().toLowerCase() || null;
        if (!accountEmail) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Account email is required" });
        }
        const duplicate = await InventoryItem.findOne({ id: { $ne: id }, accountEmail }).lean();
        if (duplicate) {
          throw new TRPCError({ code: "CONFLICT", message: "This account email already exists in inventory" });
        }
        set.accountEmail = accountEmail;
        set.email = accountEmail;
      }
      if (updates.password !== undefined) {
        const password = credentialFieldsForWrite({ password: updates.password, twoFaSecret: undefined });
        set.password = password.password ?? null;
        set.passwordEncrypted = password.passwordEncrypted ?? null;
      }
      if (updates.twoFaSecret !== undefined) {
        const twoFaSecret = credentialFieldsForWrite({ password: undefined, twoFaSecret: updates.twoFaSecret });
        set.twoFaSecret = twoFaSecret.twoFaSecret ?? null;
        set.twoFaSecretEncrypted = twoFaSecret.twoFaSecretEncrypted ?? null;
      }
      if (updates.backupMethod !== undefined) set.backupMethod = updates.backupMethod;
      if (updates.licenseKey !== undefined) {
        const license = credentialFieldsForWrite({ licenseKey: updates.licenseKey });
        set.licenseKey = license.licenseKey ?? null;
        set.licenseKeyEncrypted = license.licenseKeyEncrypted ?? null;
        set.licenseKeyFingerprint = license.licenseKeyFingerprint ?? null;
      }
      if (updates.activationLink !== undefined) {
        const activation = credentialFieldsForWrite({ activationLink: updates.activationLink });
        set.activationLink = activation.activationLink ?? null;
        set.activationLinkEncrypted = activation.activationLinkEncrypted ?? null;
        set.activationLinkFingerprint = activation.activationLinkFingerprint ?? null;
      }
      if (updates.instructions !== undefined) set.instructions = updates.instructions;
      if (updates.notes !== undefined) set.notes = updates.notes;

      if (Object.keys(set).length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nothing to update" });
      }

      await InventoryItem.updateOne({ id }, { $set: set });
      return { success: true };
    }),

  inventoryDelete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await connectDb();
      const result = await InventoryItem.deleteOne({ id: input.id, status: { $in: ["available", "disabled"] } });
      if (result.deletedCount === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only available or disabled accounts can be removed" });
      }
      return { success: true };
    }),

  auditLogList: adminQuery
    .input(z.object({ limit: z.number().default(100), offset: z.number().default(0) }).optional())
    .query(async ({ input }) => {
      await connectDb();
      return cleanMany(await AuditLog.find().sort({ createdAt: -1 }).skip(input?.offset ?? 0).limit(input?.limit ?? 100).lean());
    }),

  providerList: adminQuery.query(async () => {
    await connectDb();
    return cleanMany(await ProviderApplication.find().sort({ createdAt: -1 }).lean());
  }),

  providerApprove: adminQuery
    .input(z.object({ id: z.number(), adminNote: z.string().optional() }))
    .mutation(async ({ input }) => {
      await connectDb();
      const application = clean(await ProviderApplication.findOne({ id: input.id }).lean()) as any;
      if (!application) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      await ProviderApplication.updateOne({ id: input.id }, { $set: { status: "approved", adminNote: input.adminNote } });
      await User.updateOne({ id: application.userId }, { $set: { role: "provider", providerStatus: "approved" } });
      return { success: true };
    }),

  providerReject: adminQuery
    .input(z.object({ id: z.number(), adminNote: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await connectDb();
      const application = clean(await ProviderApplication.findOne({ id: input.id }).lean()) as any;
      await ProviderApplication.updateOne({ id: input.id }, { $set: { status: "rejected", adminNote: input.adminNote } });
      if (application) await User.updateOne({ id: application.userId }, { $set: { providerStatus: "rejected" } });
      return { success: true };
    }),

  supportList: adminQuery
    .input(z.object({
      status: z.enum(supportStatuses).optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      await connectDb();
      const filter: Record<string, unknown> = {};
      if (input?.status) filter.status = input.status;
      if (input?.search) filter.$or = [
        { subject: { $regex: input.search, $options: "i" } },
        { message: { $regex: input.search, $options: "i" } },
      ];
      const tickets = cleanMany(await SupportTicket.find(filter).sort({ createdAt: -1 }).skip(input?.offset ?? 0).limit(input?.limit ?? 50).lean());
      return Promise.all((tickets as any[]).map(async (ticket) => {
        const order = ticket.orderId ? await Order.findOne({ id: ticket.orderId }).select("orderNumber").lean<{ orderNumber?: string }>() : null;
        return {
          ...ticket,
          orderNumber: order?.orderNumber ?? null,
          ...(await userSummary(ticket.userId)),
        };
      }));
    }),

  supportGet: adminQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      await connectDb();
      const ticket = clean(await SupportTicket.findOne({ id: input.id }).lean()) as any;
      if (!ticket) return null;
      const replies = cleanMany(await SupportReply.find({ ticketId: input.id }).sort({ createdAt: 1 }).lean());
      return { ...ticket, replies };
    }),

  supportReply: adminQuery
    .input(z.object({ ticketId: z.number(), message: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      await SupportReply.create({ id: await nextId("support_replies"), ticketId: input.ticketId, senderId: ctx.user.id, message: input.message });
      await SupportTicket.updateOne({ id: input.ticketId }, { $set: { status: "waiting_customer" } });
      return { success: true };
    }),

  supportUpdateStatus: adminQuery
    .input(z.object({ id: z.number().optional(), ticketId: z.number().optional(), status: z.enum(supportStatuses) }))
    .mutation(async ({ input }) => {
      await connectDb();
      const id = input.id ?? input.ticketId;
      if (!id) throw new TRPCError({ code: "BAD_REQUEST", message: "Ticket id is required" });
      await SupportTicket.updateOne({ id }, { $set: { status: input.status } });
      return { success: true };
    }),

  supportDelete: adminQuery
    .input(z.object({ id: z.number().optional(), ticketId: z.number().optional() }))
    .mutation(async ({ input }) => {
      await connectDb();
      const id = input.id ?? input.ticketId;
      if (!id) throw new TRPCError({ code: "BAD_REQUEST", message: "Ticket id is required" });
      await SupportReply.deleteMany({ ticketId: id });
      await SupportTicket.deleteOne({ id });
      return { success: true };
    }),

  toolRequestList: adminQuery
    .input(z.object({
      status: z.enum(["new", "reviewing", "available", "replied", "closed"]).optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      await connectDb();
      const filter: Record<string, unknown> = {};
      if (input?.status) filter.status = input.status;
      if (input?.search) {
        filter.$or = [
          { requesterName: { $regex: input.search, $options: "i" } },
          { requesterEmail: { $regex: input.search, $options: "i" } },
          { itemName: { $regex: input.search, $options: "i" } },
          { desiredPlan: { $regex: input.search, $options: "i" } },
        ];
      }

      return cleanMany(await ToolRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(input?.offset ?? 0)
        .limit(input?.limit ?? 50)
        .lean());
    }),

  toolRequestUpdate: adminQuery
    .input(z.object({
      id: z.number(),
      status: z.enum(["new", "reviewing", "available", "replied", "closed"]).optional(),
      adminReply: z.string().trim().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const updates: Record<string, unknown> = {};
      if (input.status) updates.status = input.status;
      if (input.adminReply !== undefined) {
        updates.adminReply = input.adminReply;
        updates.repliedAt = new Date();
        if (!input.status) updates.status = "replied";
      }
      if (Object.keys(updates).length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nothing to update" });
      }

      await ToolRequest.updateOne({ id: input.id }, { $set: updates });
      await AuditLog.create({
        id: await nextId("audit_logs"),
        actorId: ctx.user.id,
        action: "tool_request_updated",
        entityType: "tool_request",
        entityId: input.id,
        metadata: updates,
      });
      return { success: true };
    }),

  scammerReportList: adminQuery
    .input(z.object({
      status: z.enum(scammerReportStatuses).optional(),
      search: z.string().optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      await connectDb();
      const filter: Record<string, unknown> = {};
      if (input?.status) filter.status = input.status;
      if (input?.search) {
        filter.$or = [
          { phoneNumber: { $regex: input.search, $options: "i" } },
          { scammerName: { $regex: input.search, $options: "i" } },
          { platform: { $regex: input.search, $options: "i" } },
          { description: { $regex: input.search, $options: "i" } },
        ];
      }

      const reports = cleanMany(await ScammerReport.find(filter)
        .sort({ createdAt: -1 })
        .skip(input?.offset ?? 0)
        .limit(input?.limit ?? 100)
        .lean());

      return Promise.all((reports as any[]).map(async (report) => ({
        ...report,
        ...(await userSummary(report.userId)),
      })));
    }),

  scammerReportUpdate: adminQuery
    .input(z.object({
      id: z.number(),
      status: z.enum(scammerReportStatuses),
      adminNote: z.string().trim().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const updates: Record<string, unknown> = {
        status: input.status,
        adminNote: input.adminNote,
      };
      if (input.status === "approved") {
        updates.approvedAt = new Date();
        updates.approvedBy = ctx.user.id;
      }

      await ScammerReport.updateOne({ id: input.id }, { $set: updates });
      await AuditLog.create({
        id: await nextId("audit_logs"),
        actorId: ctx.user.id,
        action: "scammer_report_updated",
        entityType: "scammer_report",
        entityId: input.id,
        metadata: updates,
      });
      return { success: true };
    }),

  scammerReportDelete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      await ScammerReport.deleteOne({ id: input.id });
      await AuditLog.create({
        id: await nextId("audit_logs"),
        actorId: ctx.user.id,
        action: "scammer_report_deleted",
        entityType: "scammer_report",
        entityId: input.id,
      });
      return { success: true };
    }),

  settingsList: adminQuery.query(async () => {
    await connectDb();
    const settings = cleanMany(await SiteSetting.find().sort({ key: 1 }).lean());
    return sanitizeAdminSettings(settings as any[]);
  }),

  settingsUpdate: adminQuery
    .input(z.object({
      key: z.string().min(1).refine(isEditableAdminSettingKey, "Unsupported or sensitive setting key"),
      value: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const existing = await SiteSetting.findOne({ key: input.key }).lean();
      if (existing) {
        await SiteSetting.updateOne({ key: input.key }, { $set: { value: input.value } });
      } else {
        await SiteSetting.create({ id: await nextId("site_settings"), key: input.key, value: input.value });
      }
      await AuditLog.create({
        id: await nextId("audit_logs"),
        actorId: ctx.user.id,
        action: "site_setting_updated",
        entityType: "site_setting",
        metadata: { key: input.key, value: input.value === "true" || input.value === "false" ? input.value : "[redacted]" },
      });
      return { success: true };
    }),

  platformApiRealModeGet: adminQuery.query(async () => {
    await connectDb();
    const setting = await SiteSetting.findOne({ key: "platform_api_real_mode" }).select("value").lean<{ value?: string }>();
    return setting?.value === "true";
  }),

  platformApiRealModeSet: adminQuery
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const key = "platform_api_real_mode";
      const value = input.enabled ? "true" : "false";
      const existing = await SiteSetting.findOne({ key }).lean();
      if (existing) {
        await SiteSetting.updateOne({ key }, { $set: { value } });
      } else {
        await SiteSetting.create({ id: await nextId("site_settings"), key, value });
      }
      await AuditLog.create({
        id: await nextId("audit_logs"),
        actorId: ctx.user.id,
        action: "platform_api_real_mode_set",
        entityType: "site_setting",
        metadata: { enabled: input.enabled },
      });
      return { enabled: input.enabled };
    }),

  userById: adminQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      await connectDb();
      const user = clean(await User.findOne({ id: input.id }).select("-passwordHash -unionId").lean()) as any;
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      const walletTransactions = cleanMany(await WalletTransaction.find({ userId: input.id }).sort({ createdAt: -1 }).limit(100).lean()) as any[];
      const directOrders = cleanMany(await Order.find({ userId: input.id }).sort({ createdAt: -1 }).limit(100).lean()) as any[];
      const marketplaceOrders = cleanMany(await ThirdPartyOrder.find({ userId: input.id }).sort({ createdAt: -1 }).limit(100).lean()) as any[];
      const directOrderRows = await Promise.all(directOrders.map(async (order) => {
        const product = await Product.findOne({ id: order.productId }).select("name").lean<{ name?: string }>();
        return { ...order, productName: product?.name ?? "Product", type: "direct" };
      }));
      return {
        user,
        walletTransactions,
        directOrders: directOrderRows,
        marketplaceOrders: marketplaceOrders.map((order) => ({
          id: order.id,
          type: "marketplace",
          productName: order.productName,
          quantity: order.quantity,
          priceUsd: order.priceUsd,
          status: order.status,
          createdAt: order.createdAt,
          deliveredAt: order.deliveredAt ?? null,
          items: order.status === "delivered" && order.credentialsReleasedAt ? readProviderDeliveryItems(order) : [],
        })),
      };
    }),

  walletAdjust: adminQuery
    .input(z.object({
      userId: z.number(),
      type: z.enum(["credit", "debit"]),
      amount: z.number().positive(),
      note: z.string().min(1).max(500),
      idempotencyKey: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const operationKey = `manual:${input.idempotencyKey}`;
      let result: any;
      await runInTransaction(async (session) => {
        result = await applyWalletMutation({
          session,
          userId: input.userId,
          type: input.type,
          amountCents: Math.round(input.amount * 100),
          operationKey,
          referenceType: input.type === "credit" ? "manual_credit" : "manual_debit",
          note: input.note,
        });
        if (!result.replayed) {
          await AuditLog.create([{
            id: await nextId("audit_logs"),
            actorId: ctx.user.id,
            action: "wallet_adjusted",
            entityType: "wallet",
            entityId: input.userId,
            metadata: { type: input.type, amount: input.amount, note: input.note, balanceAfter: result.balance, operationKey },
          }], { session });
        }
      });
      return { success: true, balance: result.balance, replayed: result.replayed };
    }),

  thirdPartyOrderDetail: adminQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      await connectDb();
      const order = clean(await ThirdPartyOrder.findOne({ id: input.id }).lean()) as any;
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Marketplace order not found" });
      const customer = clean(await User.findOne({ id: order.userId }).select("name email").lean()) as any;
      const items = order.status === "delivered" && order.credentialsReleasedAt ? readProviderDeliveryItems(order) : [];
      return {
        id: order.id,
        userId: order.userId,
        userName: customer?.name ?? "Customer",
        userEmail: customer?.email ?? null,
        provider: order.provider,
        productName: order.productName,
        quantity: order.quantity,
        priceUsd: order.priceUsd,
        status: order.status,
        reconciliationStatus: order.reconciliationStatus,
        externalOrderId: order.externalOrderId ?? null,
        items,
        providerRaw: order.providerRaw ? JSON.stringify(order.providerRaw) : null,
        errorCode: order.errorCode ?? null,
        errorMessage: order.errorMessage ?? null,
        createdAt: order.createdAt,
        deliveredAt: order.deliveredAt ?? null,
        refundedAt: order.refundedAt ?? null,
      };
    }),

  thirdPartyOrderRetryProvider: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const order = clean(await ThirdPartyOrder.findOne({ id: input.id }).lean()) as any;
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Marketplace order not found" });
      if (!["processing", "pending"].includes(order.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Order is not in a retryable state" });
      }
      const product = clean(await ThirdPartyProduct.findOne({
        id: order.thirdPartyProductId,
        status: "active",
        providerPurchaseEnabled: true,
      }).lean()) as any;
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Live purchase is not enabled for this product" });
      const realMode = await isPlatformApiRealMode();
      if (!realMode) throw new TRPCError({ code: "BAD_REQUEST", message: "Enable real API mode to retry provider purchase" });

      let external: Awaited<ReturnType<typeof purchaseExternalMarketplaceProduct>>;
      try {
        external = await purchaseExternalMarketplaceProduct(
          product.provider,
          product.externalProductId,
          order.quantity,
          order.idempotencyKey,
        );
      } catch (error) {
        await applyProviderOutcome({
          orderId: order.id,
          status: "processing",
          reconciliationStatus: "needs_review",
          reconciliationNote: "Provider retry outcome requires reconciliation",
          errorCode: "provider_retry_unknown",
          errorMessage: "Provider retry outcome requires reconciliation",
        });
        throw new TRPCError({ code: "TIMEOUT", message: "Provider outcome is still pending reconciliation. No second wallet debit was made.", cause: error });
      }

      if (["refunded", "cancelled", "failed"].includes(String(external.status))) {
        await refundLocalWallet({
          orderId: order.id,
          note: `Provider retry returned ${external.status}`,
          terminalStatus: external.status as "refunded" | "cancelled" | "failed",
          actorId: ctx.user.id,
        });
      } else {
        await applyProviderOutcome({
          orderId: order.id,
          status: external.status === "delivered" ? "delivered" : "processing",
          externalOrderId: external.externalOrderId ? String(external.externalOrderId) : undefined,
          items: sanitizeProviderDeliveryItems(external.items),
          reconciliationStatus: external.status === "delivered" ? "resolved" : "none",
          reconciliationNote: external.status === "delivered" ? "Provider retry returned delivery" : undefined,
        });
        if (external.status === "delivered") {
          await settleReferralCommissionSafely({
            sourceType: "third_party_order",
            sourceId: order.id,
            referredUserId: order.userId,
            baseAmount: String(order.priceUsd),
          });
        }
      }
      await AuditLog.create({
        id: await nextId("audit_logs"),
        actorId: ctx.user.id,
        action: "third_party_provider_retried",
        entityType: "third_party_order",
        entityId: order.id,
        metadata: { status: external.status, idempotencyKeyReused: true },
      });
      return { success: true, status: external.status };
    }),

  thirdPartyOrderRefund: adminQuery
    .input(z.object({ id: z.number(), note: z.string().min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      await refundLocalWallet({ orderId: input.id, note: input.note, terminalStatus: "refunded", actorId: ctx.user.id });
      await AuditLog.create({
        id: await nextId("audit_logs"),
        actorId: ctx.user.id,
        action: "third_party_order_refunded",
        entityType: "third_party_order",
        entityId: input.id,
        metadata: { note: input.note },
      });
      return { success: true };
    }),

});

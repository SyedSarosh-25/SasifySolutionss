import { createRouter, authedQuery } from "../middleware";
import { connectDb } from "../queries/connection";
import { Deposit, Notification, Order, Product, SupportTicket, ThirdPartyOrder, User, cleanMany } from "../mongo/models";

export const dashboardRouter = createRouter({
  summary: authedQuery.query(async ({ ctx }) => {
    await connectDb();
    const userId = ctx.user.id;
    const activeStatuses = ["paid", "processing", "pending", "pending_fulfillment"];

    const [
      user,
      directTotal,
      marketplaceTotal,
      directActive,
      marketplaceActive,
      directDelivered,
      marketplaceDelivered,
      openTickets,
      directRows,
      marketplaceRows,
      recentDeposits,
      recentNotifications,
    ] = await Promise.all([
      User.findOne({ id: userId }).lean<{ walletBalance?: string }>(),
      Order.countDocuments({ userId }),
      ThirdPartyOrder.countDocuments({ userId }),
      Order.countDocuments({ userId, status: { $in: activeStatuses } }),
      ThirdPartyOrder.countDocuments({ userId, status: { $in: activeStatuses } }),
      Order.countDocuments({ userId, status: "delivered" }),
      ThirdPartyOrder.countDocuments({ userId, status: "delivered" }),
      SupportTicket.countDocuments({ userId, status: { $in: ["open", "in_progress"] } }),
      Order.find({ userId }).sort({ createdAt: -1 }).limit(6).lean(),
      ThirdPartyOrder.find({ userId }).sort({ createdAt: -1 }).limit(6).lean(),
      Deposit.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
      Notification.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const directOrders = cleanMany(directRows) as any[];
    const recentDirect = await Promise.all(directOrders.map(async (order) => {
      const product = await Product.findOne({ id: order.productId }).select("name").lean<{ name?: string }>();
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        productName: product?.name ?? "Product",
        finalPrice: order.finalPrice,
        amount: order.finalPrice,
        status: order.status,
        channel: "direct" as const,
        createdAt: order.createdAt,
      };
    }));

    const recentMarketplace = (cleanMany(marketplaceRows) as any[]).map((order) => ({
      id: order.id,
      orderNumber: `Marketplace #${order.id}`,
      productName: order.productName || "Marketplace product",
      finalPrice: order.priceUsd,
      amount: order.priceUsd,
      status: order.status,
      channel: "marketplace" as const,
      createdAt: order.createdAt,
    }));

    const recentOrders = [...recentDirect, ...recentMarketplace]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);

    return {
      walletBalance: user?.walletBalance ?? "0",
      totalOrders: directTotal + marketplaceTotal,
      activeOrders: directActive + marketplaceActive,
      deliveredOrders: directDelivered + marketplaceDelivered,
      directOrders: directTotal,
      marketplaceOrders: marketplaceTotal,
      openTickets,
      recentOrders,
      recentDeposits: cleanMany(recentDeposits),
      recentNotifications: cleanMany(recentNotifications),
    };
  }),
});

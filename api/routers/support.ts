import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "../middleware";
import { connectDb } from "../queries/connection";
import { Order, SupportReply, SupportTicket, ThirdPartyOrder, User, clean, cleanMany, nextId } from "../mongo/models";

export const supportRouter = createRouter({
  createTicket: authedQuery
    .input(z.object({
      subject: z.string().min(1).max(200),
      message: z.string().min(1),
      orderId: z.number().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
      attachmentName: z.string().max(200).optional(),
      attachmentType: z.string().max(100).optional(),
      attachmentSize: z.number().max(3 * 1024 * 1024).optional(),
      attachmentUrl: z.string().max(4_500_000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const purchasedOrderFilter = {
        userId: ctx.user.id,
        status: { $in: ["paid", "processing", "pending_fulfillment", "delivered"] },
      };

      if (input.orderId) {
        const order = await Order.findOne({ id: input.orderId, ...purchasedOrderFilter }).lean();
        if (!order) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only open tickets for your own paid orders" });
        }
      } else {
        const [hasDirectPurchase, hasMarketplacePurchase] = await Promise.all([
          Order.exists(purchasedOrderFilter),
          ThirdPartyOrder.exists({
            userId: ctx.user.id,
            status: { $in: ["processing", "pending_fulfillment", "delivered"] },
          }),
        ]);
        if (!hasDirectPurchase && !hasMarketplacePurchase) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Support tickets are available after your first purchase" });
        }
      }

      const ticket = await SupportTicket.create({
        id: await nextId("support_tickets"),
        userId: ctx.user.id,
        orderId: input.orderId,
        subject: input.subject,
        message: input.message,
        attachmentName: input.attachmentName,
        attachmentType: input.attachmentType,
        attachmentSize: input.attachmentSize,
        attachmentUrl: input.attachmentUrl,
        priority: input.priority,
      });
      return { id: ticket.id };
    }),

  listTickets: authedQuery.query(async ({ ctx }) => {
    await connectDb();
    return cleanMany(await SupportTicket.find({ userId: ctx.user.id }).sort({ createdAt: -1 }).lean());
  }),

  getTicket: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      await connectDb();
      const ticket = clean(await SupportTicket.findOne({ id: input.id, userId: ctx.user.id }).lean()) as any;
      if (!ticket) return null;
      const replies = cleanMany(await SupportReply.find({ ticketId: input.id }).sort({ createdAt: -1 }).lean());
      const repliesWithSenders = await Promise.all((replies as any[]).map(async (reply) => {
        const sender = await User.findOne({ id: reply.senderId }).select("name role").lean<{ name?: string; role?: string }>();
        return {
          ...reply,
          senderName: sender?.role === "admin" ? "Sasify Support" : sender?.name ?? "Customer",
          senderRole: sender?.role ?? "user",
        };
      }));
      return { ...ticket, replies: repliesWithSenders };
    }),

  addReply: authedQuery
    .input(z.object({
      ticketId: z.number(),
      message: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const ticket = await SupportTicket.findOne({ id: input.ticketId, userId: ctx.user.id }).lean();
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });

      await SupportReply.create({
        id: await nextId("support_replies"),
        ticketId: input.ticketId,
        senderId: ctx.user.id,
        message: input.message,
      });
      await SupportTicket.updateOne({ id: input.ticketId }, { $set: { status: "in_progress" } });
      return { success: true };
    }),
});

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "../middleware";
import { connectDb } from "../queries/connection";
import { ProviderApplication, User, clean, nextId } from "../mongo/models";

export const providerRouter = createRouter({
  submitApplication: authedQuery
    .input(z.object({
      fullName: z.string().min(1).max(255),
      email: z.string().email(),
      whatsappNumber: z.string().min(1).max(50),
      serviceName: z.string().min(1).max(200),
      availableStock: z.number().int().positive(),
      wholesalePrice: z.string().min(1).max(100),
      deliveryMethod: z.string().min(1).max(500),
      proofReviews: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const existing = await ProviderApplication.findOne({ userId: ctx.user.id, status: "pending" }).lean();
      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You already have a pending provider application" });
      }
      if (ctx.user.role === "provider") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You are already a verified provider" });
      }

      const application = await ProviderApplication.create({
        id: await nextId("provider_applications"),
        userId: ctx.user.id,
        ...input,
      });
      await User.updateOne({ id: ctx.user.id }, { $set: { providerStatus: "pending" } });
      return { id: application.id };
    }),

  myApplication: authedQuery.query(async ({ ctx }) => {
    await connectDb();
    return clean(await ProviderApplication.findOne({ userId: ctx.user.id }).sort({ createdAt: -1 }).lean()) ?? null;
  }),
});

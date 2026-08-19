import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authedQuery, createRouter, publicQuery } from "../middleware";
import { connectDb } from "../queries/connection";
import { AuditLog, ReferralProfile, ResellerApplication, clean, nextId } from "../mongo/models";
import {
  convertAvailableReferralCommissions,
  convertReferralCommission,
  ensureReferralProfile,
  referralDashboard,
  resolveReferralCode,
} from "../services/referral";

export const referralRouter = createRouter({
  validateCode: publicQuery
    .input(z.object({ code: z.string().trim().min(4).max(40) }))
    .query(async ({ input }) => {
      await connectDb();
      const profile = await resolveReferralCode(input.code);
      return { valid: Boolean(profile), code: profile?.code ?? null };
    }),

  dashboard: authedQuery.query(async ({ ctx }) => {
    await connectDb();
    return referralDashboard(ctx.user.id);
  }),

  applyReseller: authedQuery
    .input(z.object({
      promotionChannels: z.string().trim().min(3).max(500),
      audienceSize: z.number().int().min(0).max(100_000_000),
      experience: z.string().trim().min(20).max(2_000),
      notes: z.string().trim().max(1_000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const profile = await ensureReferralProfile(ctx.user.id);
      if (profile.resellerStatus === "approved") throw new TRPCError({ code: "BAD_REQUEST", message: "Your reseller referral tier is already approved" });
      const existing = clean(await ResellerApplication.findOne({ userId: ctx.user.id }).lean()) as any;
      if (existing?.status === "pending") throw new TRPCError({ code: "CONFLICT", message: "Your reseller application is already under review" });
      let application: any;
      if (existing) {
        application = await ResellerApplication.findOneAndUpdate(
          { userId: ctx.user.id },
          { $set: { ...input, status: "pending", adminNote: "", reviewedAt: null, reviewedBy: null } },
          { returnDocument: "after" },
        ).lean();
      } else {
        application = await ResellerApplication.create({ id: await nextId("reseller_applications"), userId: ctx.user.id, ...input, status: "pending" });
      }
      await ReferralProfile.updateOne({ userId: ctx.user.id }, { $set: { resellerStatus: "pending", tier: "user" } });
      await AuditLog.create({
        id: await nextId("audit_logs"), actorId: ctx.user.id, action: "reseller_referral_applied",
        entityType: "reseller_application", entityId: application.id, metadata: { audienceSize: input.audienceSize },
      });
      return clean(application);
    }),

  convertCommission: authedQuery
    .input(z.object({ commissionId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      return convertReferralCommission({ commissionId: input.commissionId, userId: ctx.user.id });
    }),

  convertAvailable: authedQuery.mutation(async ({ ctx }) => {
    await connectDb();
    return convertAvailableReferralCommissions(ctx.user.id);
  }),
});

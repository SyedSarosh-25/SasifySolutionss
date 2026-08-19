import { z } from "zod";
import mongoose from "mongoose";
import { TRPCError } from "@trpc/server";
import { adminQuery, createRouter } from "../middleware";
import { connectDb } from "../queries/connection";
import {
  AuditLog,
  ReferralAttribution,
  ReferralCommission,
  ReferralProfile,
  ResellerApplication,
  User,
  clean,
  cleanMany,
  nextId,
} from "../mongo/models";
import { referralSettingsInputSchema } from "../lib/referral-policy";
import {
  getReferralSettings,
  reverseReferralCommission,
  saveReferralSettings,
  syncReferralCommissions,
} from "../services/referral";

export const referralAdminRouter = createRouter({
  settings: adminQuery.query(async () => {
    await connectDb();
    return getReferralSettings();
  }),

  updateSettings: adminQuery
    .input(referralSettingsInputSchema)
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      return saveReferralSettings(input, ctx.user.id);
    }),

  overview: adminQuery.query(async () => {
    await connectDb();
    await syncReferralCommissions();
    const [pendingApplications, profiles, referredUsers, commissions] = await Promise.all([
      ResellerApplication.countDocuments({ status: "pending" }),
      ReferralProfile.countDocuments({ tier: "reseller", resellerStatus: "approved" }),
      ReferralAttribution.countDocuments(),
      ReferralCommission.find().lean(),
    ]);
    const totals = { pending: 0, available: 0, converted: 0, reversed: 0 } as Record<string, number>;
    for (const row of commissions as any[]) totals[row.status] = (totals[row.status] || 0) + Number(row.amount || 0);
    return { pendingApplications, approvedResellers: profiles, referredUsers, commissionCount: commissions.length, totals };
  }),

  applications: adminQuery
    .input(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }).optional())
    .query(async ({ input }) => {
      await connectDb();
      const rows = cleanMany(await ResellerApplication.find(input?.status ? { status: input.status } : {}).sort({ createdAt: -1 }).limit(200).lean()) as any[];
      return Promise.all(rows.map(async (row) => {
        const user = clean(await User.findOne({ id: row.userId }).select("name email").lean()) as any;
        return { ...row, userName: user?.name ?? "User", userEmail: user?.email ?? "" };
      }));
    }),

  reviewApplication: adminQuery
    .input(z.object({
      applicationId: z.number().int().positive(),
      decision: z.enum(["approved", "rejected"]),
      adminNote: z.string().trim().min(3).max(1_000),
    }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const application = clean(await ResellerApplication.findOne({ id: input.applicationId, status: "pending" }).session(session).lean()) as any;
          if (!application) throw new TRPCError({ code: "CONFLICT", message: "Application was already reviewed or does not exist" });
          const reviewedAt = new Date();
          const updated = await ResellerApplication.updateOne(
            { id: input.applicationId, status: "pending" },
            { $set: { status: input.decision, adminNote: input.adminNote, reviewedAt, reviewedBy: ctx.user.id } },
            { session },
          );
          if (updated.modifiedCount !== 1) throw new TRPCError({ code: "CONFLICT", message: "Application changed while it was being reviewed" });
          const profile = await ReferralProfile.updateOne(
            { userId: application.userId },
            { $set: input.decision === "approved"
              ? { tier: "reseller", resellerStatus: "approved", approvedAt: reviewedAt, approvedBy: ctx.user.id }
              : { tier: "user", resellerStatus: "rejected", approvedAt: null, approvedBy: null } },
            { session },
          );
          if (profile.matchedCount !== 1) throw new TRPCError({ code: "CONFLICT", message: "Referral profile is missing" });
          await AuditLog.create([{
            id: await nextId("audit_logs"), actorId: ctx.user.id, action: `reseller_referral_${input.decision}`,
            entityType: "reseller_application", entityId: application.id, metadata: { userId: application.userId, note: input.adminNote },
          }], { session });
        });
      } finally {
        await session.endSession();
      }
      return { success: true, status: input.decision };
    }),

  commissions: adminQuery
    .input(z.object({ status: z.enum(["pending", "available", "converted", "reversed"]).optional() }).optional())
    .query(async ({ input }) => {
      await connectDb();
      await syncReferralCommissions();
      const rows = cleanMany(await ReferralCommission.find(input?.status ? { status: input.status } : {}).sort({ createdAt: -1 }).limit(300).lean()) as any[];
      return Promise.all(rows.map(async (row) => {
        const [owner, customer] = await Promise.all([
          User.findOne({ id: row.referrerUserId }).select("name email").lean(),
          User.findOne({ id: row.referredUserId }).select("name email").lean(),
        ]);
        return { ...row, ownerName: (owner as any)?.name ?? "User", ownerEmail: (owner as any)?.email ?? "", customerName: (customer as any)?.name ?? "Customer" };
      }));
    }),

  reverseCommission: adminQuery
    .input(z.object({ commissionId: z.number().int().positive(), reason: z.string().trim().min(5).max(500) }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const result = await reverseReferralCommission(input.commissionId, input.reason, ctx.user.id);
      await AuditLog.create({
        id: await nextId("audit_logs"), actorId: ctx.user.id, action: "referral_commission_reversed",
        entityType: "referral_commission", entityId: input.commissionId, metadata: { reason: input.reason },
      });
      return result;
    }),
});

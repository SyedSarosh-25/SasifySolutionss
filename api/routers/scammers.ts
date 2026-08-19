import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authedQuery, createRouter, publicQuery } from "../middleware";
import { connectDb } from "../queries/connection";
import { ScammerReport, User, clean, cleanMany, nextId } from "../mongo/models";

const proofScreenshotSchema = z
  .string()
  .startsWith("data:image/")
  .max(4_500_000);

const proofScreenshotsSchema = z
  .array(proofScreenshotSchema)
  .min(1, "At least one proof screenshot is required")
  .max(5, "Upload up to 5 proof screenshots");

function validateScreenshots(screenshots: string[]) {
  for (const screenshot of screenshots) {
    if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(screenshot)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Proof screenshots must be PNG, JPG, or WebP images" });
    }
  }
}

async function withReporter(report: any) {
  const user = report.userId
    ? await User.findOne({ id: report.userId }).select("name").lean<{ name?: string }>()
    : null;
  return {
    ...report,
    reporterName: user?.name || "Sasify user",
  };
}

export const scammersRouter = createRouter({
  publicList: publicQuery
    .input(z.object({
      search: z.string().trim().max(80).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      await connectDb();
      const filter: Record<string, unknown> = { status: "approved" };
      if (input?.search) {
        filter.$or = [
          { phoneNumber: { $regex: input.search, $options: "i" } },
          { scammerName: { $regex: input.search, $options: "i" } },
          { platform: { $regex: input.search, $options: "i" } },
        ];
      }
      const reports = cleanMany(await ScammerReport.find(filter)
        .sort({ approvedAt: -1, createdAt: -1 })
        .skip(input?.offset ?? 0)
        .limit(input?.limit ?? 50)
        .lean());
      return Promise.all((reports as any[]).map(withReporter));
    }),

  myReports: authedQuery.query(async ({ ctx }) => {
    await connectDb();
    return cleanMany(await ScammerReport.find({ userId: ctx.user.id }).sort({ createdAt: -1 }).lean());
  }),

  submit: authedQuery
    .input(z.object({
      scammerName: z.string().trim().max(120).optional(),
      phoneNumber: z.string().trim().regex(/^(03\d{9}|\+92\d{10})$/, "Use a valid Pakistan mobile number like 03116185711 or +923116185711"),
      platform: z.string().trim().max(80).optional(),
      amountLost: z.string().trim().regex(/^\d{1,9}(\.\d{1,2})?$/, "Amount lost must be a valid number").optional(),
      description: z.string().trim().min(20).max(2000),
      proofScreenshots: proofScreenshotsSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      validateScreenshots(input.proofScreenshots);
      const report = await ScammerReport.create({
        id: await nextId("scammer_reports"),
        userId: ctx.user.id,
        ...input,
        status: "pending",
      });
      return clean(report);
    }),
});

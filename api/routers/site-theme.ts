import { z } from "zod";
import { adminQuery, createRouter } from "../middleware";
import { AuditLog, SiteSetting, clean, nextId } from "../mongo/models";
import { connectDb } from "../queries/connection";
import {
  DEFAULT_SITE_TEMPLATE,
  dashboardTemplatePreferenceSchema,
  resolveSiteTemplate,
  siteTemplateSchema,
} from "../../src/site-theme/templates";

const SETTING_KEYS = {
  site: "site_template",
  user: "user_dashboard_template",
  admin: "admin_dashboard_template",
} as const;

async function upsertSetting(key: string, value: string) {
  const previous = clean(await SiteSetting.findOne({ key }).select("value").lean()) as any;
  const id = await nextId("site_settings");
  try {
    await SiteSetting.updateOne(
      { key },
      { $set: { value }, $setOnInsert: { id, key } },
      { upsert: true },
    );
  } catch (error) {
    if (!(error instanceof Error) || !/duplicate key|E11000/i.test(error.message)) throw error;
    await SiteSetting.updateOne({ key }, { $set: { value } });
  }
  return previous?.value ?? null;
}

export const siteThemeRouter = createRouter({
  current: adminQuery.query(async () => {
    await connectDb();
    const rows = await SiteSetting.find({ key: { $in: Object.values(SETTING_KEYS) } }).select("key value").lean<any[]>();
    const record = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return {
      template: resolveSiteTemplate(record.site_template ?? DEFAULT_SITE_TEMPLATE),
      userDashboardTemplate: dashboardTemplatePreferenceSchema.safeParse(record.user_dashboard_template).success ? record.user_dashboard_template : "follow-site",
      adminDashboardTemplate: dashboardTemplatePreferenceSchema.safeParse(record.admin_dashboard_template).success ? record.admin_dashboard_template : "follow-site",
    };
  }),

  activate: adminQuery
    .input(z.object({ template: siteTemplateSchema }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const previous = await upsertSetting(SETTING_KEYS.site, input.template);
      await AuditLog.create({ id: await nextId("audit_logs"), actorId: ctx.user.id, action: "site_template_activated", entityType: "site_setting", metadata: { previous, active: input.template } });
      return { template: input.template };
    }),

  activateDashboard: adminQuery
    .input(z.object({
      surface: z.enum(["user", "admin"]),
      template: dashboardTemplatePreferenceSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const key = input.surface === "user" ? SETTING_KEYS.user : SETTING_KEYS.admin;
      const previous = await upsertSetting(key, input.template);
      await AuditLog.create({
        id: await nextId("audit_logs"), actorId: ctx.user.id,
        action: `${input.surface}_dashboard_template_activated`, entityType: "site_setting",
        metadata: { previous, active: input.template, surface: input.surface },
      });
      return { surface: input.surface, template: input.template };
    }),
});

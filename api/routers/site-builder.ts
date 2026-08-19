import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createDefaultSiteBuilderDocument } from "../../src/site-builder/default-document";
import { siteBuilderDocumentSchema } from "../../src/site-builder/schema";
import { validateSiteBuilderDocument, toPublicSiteBuilderPayload } from "../lib/site-builder";
import { AuditLog, SiteBuilderState, SiteBuilderVersion, nextId } from "../mongo/models";
import { adminQuery, createRouter, publicQuery } from "../middleware";
import { connectDb } from "../queries/connection";

const stateKey = "default";

function conflict(message = "The site draft changed in another session. Reload before saving again.") {
  return new TRPCError({ code: "CONFLICT", message });
}

async function audit(actorId: number, action: string, metadata: Record<string, unknown>) {
  await AuditLog.create({
    id: await nextId("audit_logs"),
    actorId,
    action,
    entityType: "site_builder",
    metadata,
  });
}

export const siteBuilderRouter = createRouter({
  published: publicQuery.query(async () => {
    await connectDb();
    const row = await SiteBuilderState.findOne({ key: stateKey })
      .select("published publishedRevision publishedAt")
      .lean();
    return toPublicSiteBuilderPayload(row);
  }),

  getWorkspace: adminQuery.query(async () => {
    await connectDb();
    const row = await SiteBuilderState.findOne({ key: stateKey }).lean() as any;
    if (!row) {
      return {
        draft: createDefaultSiteBuilderDocument(),
        draftRevision: 0,
        publishedRevision: 0,
        publishedAt: null,
        hasPublished: false,
      };
    }
    let draft;
    try {
      draft = validateSiteBuilderDocument(row.draft);
    } catch {
      draft = createDefaultSiteBuilderDocument();
    }
    return {
      draft,
      draftRevision: Number(row.draftRevision || 0),
      publishedRevision: Number(row.publishedRevision || 0),
      publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null,
      hasPublished: Boolean(row.published),
    };
  }),

  saveDraft: adminQuery
    .input(z.object({ document: siteBuilderDocumentSchema, baseRevision: z.number().int().min(0) }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const document = validateSiteBuilderDocument(input.document);
      const current = await SiteBuilderState.findOne({ key: stateKey }).select("draftRevision").lean() as any;
      let revision: number;

      if (!current) {
        if (input.baseRevision !== 0) throw conflict();
        try {
          await SiteBuilderState.create({
            id: 1,
            key: stateKey,
            draft: document,
            draftRevision: 1,
            publishedRevision: 0,
            updatedBy: ctx.user.id,
          });
          revision = 1;
        } catch (error: any) {
          if (error?.code === 11000) throw conflict();
          throw error;
        }
      } else {
        const updated = await SiteBuilderState.findOneAndUpdate(
          { key: stateKey, draftRevision: input.baseRevision },
          { $set: { draft: document, updatedBy: ctx.user.id }, $inc: { draftRevision: 1 } },
          { returnDocument: "after" },
        ).select("draftRevision").lean() as any;
        if (!updated) throw conflict();
        revision = Number(updated.draftRevision);
      }

      await audit(ctx.user.id, "site_builder_draft_saved", { revision });
      return { success: true, draftRevision: revision };
    }),

  publish: adminQuery
    .input(z.object({ baseRevision: z.number().int().min(1), note: z.string().max(240).default("") }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const current = await SiteBuilderState.findOne({ key: stateKey }).lean() as any;
      if (!current || Number(current.draftRevision) !== input.baseRevision) throw conflict();
      const document = validateSiteBuilderDocument(current.draft);
      const publishedRevision = Number(current.publishedRevision || 0) + 1;
      const publishedAt = new Date();

      const updated = await SiteBuilderState.findOneAndUpdate(
        { key: stateKey, draftRevision: input.baseRevision, publishedRevision: Number(current.publishedRevision || 0) },
        { $set: { published: document, publishedRevision, publishedAt, publishedBy: ctx.user.id } },
        { returnDocument: "after" },
      ).select("publishedRevision").lean();
      if (!updated) throw conflict("The published site changed in another session. Reload before publishing.");

      await SiteBuilderVersion.create({
        id: await nextId("site_builder_versions"),
        version: publishedRevision,
        document,
        publishedBy: ctx.user.id,
        note: input.note,
        publishedAt,
      });
      await audit(ctx.user.id, "site_builder_published", { draftRevision: input.baseRevision, publishedRevision });
      return { success: true, publishedRevision, publishedAt: publishedAt.toISOString() };
    }),

  versionList: adminQuery.query(async () => {
    await connectDb();
    const rows = await SiteBuilderVersion.find()
      .select("id version note publishedAt publishedBy")
      .sort({ version: -1 })
      .limit(50)
      .lean() as any[];
    return rows.map((row) => ({
      id: Number(row.id),
      version: Number(row.version),
      note: String(row.note || ""),
      publishedAt: new Date(row.publishedAt).toISOString(),
      publishedBy: row.publishedBy ? Number(row.publishedBy) : null,
    }));
  }),

  restoreVersion: adminQuery
    .input(z.object({ version: z.number().int().min(1), baseRevision: z.number().int().min(0) }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const version = await SiteBuilderVersion.findOne({ version: input.version }).lean() as any;
      if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Published site version not found." });
      const document = validateSiteBuilderDocument(version.document);
      const updated = await SiteBuilderState.findOneAndUpdate(
        { key: stateKey, draftRevision: input.baseRevision },
        { $set: { draft: document, updatedBy: ctx.user.id }, $inc: { draftRevision: 1 } },
        { returnDocument: "after" },
      ).select("draftRevision").lean() as any;
      if (!updated) throw conflict();
      const draftRevision = Number(updated.draftRevision);
      await audit(ctx.user.id, "site_builder_version_restored_to_draft", { sourceVersion: input.version, draftRevision });
      return { success: true, draftRevision };
    }),
});

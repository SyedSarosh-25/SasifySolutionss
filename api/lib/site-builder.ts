import { SITE_BUILDER_MAX_BYTES, parseSiteBuilderDocument, type SiteBuilderDocument } from "../../src/site-builder/schema";
import { hydrateSystemSectionContent } from "../../src/site-builder/system-content";

export type PublicSiteBuilderPayload = {
  revision: number;
  publishedAt: string | null;
  document: SiteBuilderDocument;
};

function assertPayloadSize(value: unknown) {
  const bytes = Buffer.byteLength(JSON.stringify(value), "utf8");
  if (bytes > SITE_BUILDER_MAX_BYTES) throw new Error(`Site builder payload exceeds ${SITE_BUILDER_MAX_BYTES} bytes`);
}

export function validateSiteBuilderDocument(value: unknown): SiteBuilderDocument {
  assertPayloadSize(value);
  return hydrateSystemSectionContent(parseSiteBuilderDocument(value));
}

export function toPublicSiteBuilderPayload(row: any): PublicSiteBuilderPayload | null {
  if (!row?.published) return null;
  try {
    const document = validateSiteBuilderDocument(row.published);
    return {
      revision: Number(row.publishedRevision || 0),
      publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null,
      document,
    };
  } catch {
    return null;
  }
}

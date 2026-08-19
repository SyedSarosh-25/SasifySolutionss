import { describe, expect, it } from "vitest";
import { createDefaultSiteBuilderDocument } from "../../src/site-builder/default-document";
import { parseSiteBuilderDocument } from "../../src/site-builder/schema";
import { toPublicSiteBuilderPayload } from "./site-builder";

describe("site builder contract", () => {
  it("validates the complete default public-site document", () => {
    const document = createDefaultSiteBuilderDocument();
    expect(parseSiteBuilderDocument(document).pages.home.sections).toHaveLength(9);
    expect(Object.keys(document.pages)).toHaveLength(10);
  });

  it("rejects unsafe links and arbitrary fields", () => {
    const document = createDefaultSiteBuilderDocument();
    document.pages.home.sections.push({
      id: "bad",
      type: "cta",
      variant: "solid",
      visible: true,
      content: { eyebrow: "", title: "Bad", body: "", primaryLabel: "Go", primaryHref: "javascript:alert(1)", secondaryLabel: "", secondaryHref: "", imageUrl: "", items: [] },
      style: { surface: "brand", width: "wide", spacing: "normal", align: "center" },
    });
    expect(() => parseSiteBuilderDocument(document)).toThrow();
  });

  it("returns only validated published data and never draft state", () => {
    const published = createDefaultSiteBuilderDocument();
    const payload = toPublicSiteBuilderPayload({ draft: { secret: "draft-only" }, published, publishedRevision: 3, publishedAt: "2026-07-22T00:00:00Z", actorId: 99 });
    expect(payload?.revision).toBe(3);
    expect(JSON.stringify(payload)).not.toContain("draft-only");
    expect(JSON.stringify(payload)).not.toContain("actorId");
  });

  it("fails closed when the stored published document is malformed", () => {
    expect(toPublicSiteBuilderPayload({ published: { schemaVersion: 999 } })).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_TEMPLATE, SITE_TEMPLATES, resolveSiteTemplate, siteTemplateSchema } from "../../src/site-theme/templates";

describe("site template contract", () => {
  it("ships exactly ten distinct allow-listed full-site templates", () => {
    expect(SITE_TEMPLATES).toHaveLength(10);
    expect(new Set(SITE_TEMPLATES.map((template) => template.id)).size).toBe(10);
    for (const template of SITE_TEMPLATES) expect(siteTemplateSchema.parse(template.id)).toBe(template.id);
  });

  it("falls back safely when the stored template is missing or invalid", () => {
    expect(resolveSiteTemplate(undefined)).toBe(DEFAULT_SITE_TEMPLATE);
    expect(resolveSiteTemplate("javascript:alert(1)")).toBe(DEFAULT_SITE_TEMPLATE);
    expect(resolveSiteTemplate("frost-glass")).toBe("frost-glass");
  });
});

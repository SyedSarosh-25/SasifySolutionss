import { z } from "zod";

export const SITE_BUILDER_SCHEMA_VERSION = 1 as const;
export const SITE_BUILDER_MAX_BYTES = 500_000;

export const publicPageKeySchema = z.enum([
  "home",
  "tools",
  "product-detail",
  "scammers",
  "faq",
  "reviews",
  "contact",
  "request-tool",
  "provider-apply",
  "legal",
]);
export type PublicPageKey = z.infer<typeof publicPageKeySchema>;

export const sectionTypeSchema = z.enum([
  "system",
  "hero",
  "cards",
  "slider",
  "stats",
  "steps",
  "faq",
  "cta",
  "rich-text",
  "trust",
  "spacer",
]);
export type SectionType = z.infer<typeof sectionTypeSchema>;

const safeHref = z.string().max(500).refine(
  (value) => value === "" || value.startsWith("/") || value.startsWith("#") || /^https:\/\//i.test(value) || /^(mailto|tel):/i.test(value),
  "Links must be relative, HTTPS, mailto, or tel URLs",
);
const safeAssetUrl = z.string().max(2_000).refine(
  (value) => value === "" || value.startsWith("/") || /^https:\/\//i.test(value),
  "Assets must use a local path or HTTPS URL",
);

export const builderItemSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().max(180).default(""),
  text: z.string().max(2_000).default(""),
  label: z.string().max(100).default(""),
  href: safeHref.default(""),
  imageUrl: safeAssetUrl.default(""),
  value: z.string().max(100).default(""),
}).strict();
export type BuilderItem = z.infer<typeof builderItemSchema>;

export const builderSectionSchema = z.object({
  id: z.string().min(1).max(80),
  type: sectionTypeSchema,
  systemKey: z.string().max(100).optional(),
  variant: z.string().min(1).max(60).default("default"),
  visible: z.boolean().default(true),
  content: z.object({
    eyebrow: z.string().max(120).default(""),
    title: z.string().max(240).default(""),
    body: z.string().max(10_000).default(""),
    primaryLabel: z.string().max(100).default(""),
    primaryHref: safeHref.default(""),
    secondaryLabel: z.string().max(100).default(""),
    secondaryHref: safeHref.default(""),
    imageUrl: safeAssetUrl.default(""),
    items: z.array(builderItemSchema).max(24).default([]),
  }).strict(),
  style: z.object({
    surface: z.enum(["default", "muted", "brand", "dark"]).default("default"),
    width: z.enum(["narrow", "content", "wide", "full"]).default("wide"),
    spacing: z.enum(["none", "compact", "normal", "spacious"]).default("normal"),
    align: z.enum(["left", "center"]).default("left"),
  }).strict(),
}).strict().superRefine((section, ctx) => {
  if (section.type === "system" && !section.systemKey) {
    ctx.addIssue({ code: "custom", message: "System sections require systemKey", path: ["systemKey"] });
  }
});
export type BuilderSection = z.infer<typeof builderSectionSchema>;

export const sitePageSchema = z.object({
  label: z.string().min(1).max(80),
  sections: z.array(builderSectionSchema).max(60),
}).strict();
export type SitePage = z.infer<typeof sitePageSchema>;

export const siteBuilderDocumentSchema = z.object({
  schemaVersion: z.literal(SITE_BUILDER_SCHEMA_VERSION),
  theme: z.object({
    accent: z.enum(["blue", "violet", "ink"]).default("blue"),
    radius: z.enum(["compact", "soft", "rounded"]).default("soft"),
    density: z.enum(["compact", "comfortable", "spacious"]).default("comfortable"),
  }).strict(),
  pages: z.record(publicPageKeySchema, sitePageSchema),
}).strict();
export type SiteBuilderDocument = z.infer<typeof siteBuilderDocumentSchema>;

export function parseSiteBuilderDocument(value: unknown): SiteBuilderDocument {
  const bytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
  if (bytes > SITE_BUILDER_MAX_BYTES) throw new Error("Site builder payload exceeds 500 KB");
  return siteBuilderDocumentSchema.parse(value);
}

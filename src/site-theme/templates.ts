import { z } from "zod";

export const siteTemplateSchema = z.enum([
  "classic-blue",
  "atlas-3d",
  "frost-glass",
  "signal-retro",
  "obsidian-executive",
  "aurora-commerce",
  "editorial-luxe",
  "nordic-minimal",
  "neo-brutal",
  "botanical-calm",
]);

export type SiteTemplateId = z.infer<typeof siteTemplateSchema>;
export const DEFAULT_SITE_TEMPLATE: SiteTemplateId = "classic-blue";

export type SiteTemplateDefinition = {
  id: SiteTemplateId;
  name: string;
  category: string;
  description: string;
  signature: string;
  palette: readonly [string, string, string, string];
  traits: readonly string[];
};

export const SITE_TEMPLATES: readonly SiteTemplateDefinition[] = [
  { id: "classic-blue", name: "Professional Blue", category: "Clean commerce", description: "The trusted Sasify design: bright surfaces, focused cobalt actions, and familiar marketplace clarity.", signature: "Fast, clear and conversion-led", palette: ["#f7f9ff", "#ffffff", "#155cff", "#050816"], traits: ["Clean navigation", "Soft cards", "Marketplace-first"] },
  { id: "atlas-3d", name: "Atlas 3D", category: "Dimensional premium", description: "Layered depth, sculpted cobalt surfaces, elevated product tiles, and restrained spatial motion.", signature: "A premium interface with physical depth", palette: ["#eef4ff", "#ffffff", "#3157ff", "#101b4d"], traits: ["3D elevation", "Sculpted controls", "Spatial hover"] },
  { id: "frost-glass", name: "Frost Glass", category: "Atmospheric glass", description: "A dark aurora canvas with crisp translucent layers, luminous controls, and high-contrast content.", signature: "Glass used as structure, not decoration", palette: ["#07121f", "#12273a", "#45d7ff", "#f2fbff"], traits: ["Translucent shell", "Aurora depth", "Luminous focus"] },
  { id: "signal-retro", name: "Signal Retro", category: "Modern retro-tech", description: "Sharp editorial blocks, ink-black structure, electric orange actions, and disciplined terminal-era character.", signature: "Retro energy without novelty clutter", palette: ["#f4f1e8", "#fffdf6", "#f04a22", "#101010"], traits: ["Sharp geometry", "Offset edges", "Utility typography"] },
  { id: "obsidian-executive", name: "Obsidian Executive", category: "Executive dark", description: "Near-black restraint, champagne accents, precise borders, and a boardroom-grade digital storefront.", signature: "Quiet authority for premium inventory", palette: ["#080a0d", "#14171c", "#c9a968", "#f5f2ea"], traits: ["Executive contrast", "Fine borders", "Measured motion"] },
  { id: "aurora-commerce", name: "Aurora Commerce", category: "Chromatic modern", description: "Deep navy architecture, controlled spectral light, and crisp commerce surfaces with energetic focus states.", signature: "Modern energy with disciplined conversion paths", palette: ["#071126", "#10244a", "#28d7c4", "#f4f8ff"], traits: ["Chromatic light", "Dark commerce", "Crisp focus"] },
  { id: "editorial-luxe", name: "Editorial Luxe", category: "Magazine luxury", description: "Ivory-neutral pages, oxblood actions, editorial typography, and refined catalogue spacing inspired by premium publishing.", signature: "A composed editorial storefront", palette: ["#f6f5f2", "#ffffff", "#7b1f32", "#211b1d"], traits: ["Editorial rhythm", "Serif headlines", "Refined catalogue"] },
  { id: "nordic-minimal", name: "Nordic Minimal", category: "Quiet utility", description: "Cool neutral structure, restrained teal actions, generous negative space, and precise functional hierarchy.", signature: "Calm clarity for high-frequency browsing", palette: ["#f2f5f5", "#ffffff", "#087f72", "#162321"], traits: ["Quiet surfaces", "Teal utility", "Minimal chrome"] },
  { id: "neo-brutal", name: "Neo Brutal", category: "Bold commerce", description: "High-contrast blocks, confident yellow actions, hard geometry, and direct product-first information hierarchy.", signature: "Unmissable actions without visual confusion", palette: ["#f8f7f2", "#ffffff", "#f5c518", "#111111"], traits: ["Hard geometry", "Bold actions", "Direct hierarchy"] },
  { id: "botanical-calm", name: "Botanical Calm", category: "Organic premium", description: "Forest green structure, soft sage surfaces, copper details, and natural proportions tuned for professional readability.", signature: "Organic confidence with commerce discipline", palette: ["#edf3ee", "#ffffff", "#176b4d", "#183128"], traits: ["Organic palette", "Soft geometry", "Natural depth"] },
] as const;

export function resolveSiteTemplate(value: unknown): SiteTemplateId {
  const result = siteTemplateSchema.safeParse(value);
  return result.success ? result.data : DEFAULT_SITE_TEMPLATE;
}

export const dashboardTemplatePreferenceSchema = z.union([z.literal("follow-site"), siteTemplateSchema]);
export type DashboardTemplatePreference = z.infer<typeof dashboardTemplatePreferenceSchema>;

export function resolveDashboardTemplate(value: unknown, siteTemplate: SiteTemplateId): SiteTemplateId {
  if (value === "follow-site" || value == null || value === "") return siteTemplate;
  return resolveSiteTemplate(value);
}

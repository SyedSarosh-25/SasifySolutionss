import { createDefaultSiteBuilderDocument } from "./default-document";
import type { BuilderSection, SiteBuilderDocument } from "./schema";

function isLegacyEmptyContent(content: BuilderSection["content"]) {
  return !content.eyebrow
    && !content.title
    && !content.body
    && !content.primaryLabel
    && !content.primaryHref
    && !content.secondaryLabel
    && !content.secondaryHref
    && !content.imageUrl
    && content.items.length === 0;
}

export function hydrateSystemSectionContent(input: SiteBuilderDocument): SiteBuilderDocument {
  const defaults = createDefaultSiteBuilderDocument();
  const defaultByKey = new Map<string, BuilderSection>();
  for (const page of Object.values(defaults.pages)) {
    for (const section of page.sections) {
      if (section.systemKey) defaultByKey.set(section.systemKey, section);
    }
  }

  const document = structuredClone(input);
  for (const page of Object.values(document.pages)) {
    page.sections = page.sections.map((section) => {
      if (section.type !== "system" || !section.systemKey || !isLegacyEmptyContent(section.content)) return section;
      const fallback = defaultByKey.get(section.systemKey);
      return fallback ? { ...section, content: structuredClone(fallback.content) } : section;
    });
  }
  return document;
}

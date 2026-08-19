import { describe, expect, it } from "vitest";
import { createDefaultSiteBuilderDocument } from "../../src/site-builder/default-document";
import { hydrateSystemSectionContent } from "../../src/site-builder/system-content";

describe("existing system section content", () => {
  it("ships editable copy for every existing homepage section", () => {
    const sections = createDefaultSiteBuilderDocument().pages.home.sections;
    expect(sections).toHaveLength(9);
    for (const section of sections) {
      expect(section.type).toBe("system");
      expect(section.content.title.trim().length).toBeGreaterThan(0);
    }
    expect(sections.find((section) => section.systemKey === "home.hero")?.content.body).toContain("Access leading AI");
    expect(sections.find((section) => section.systemKey === "home.stats")?.content.items).toHaveLength(4);
    expect(sections.find((section) => section.systemKey === "home.faq")?.content.items.length).toBeGreaterThan(4);
  });

  it("hydrates legacy empty system content without replacing a saved override", () => {
    const legacy = createDefaultSiteBuilderDocument();
    const hero = legacy.pages.home.sections.find((section) => section.systemKey === "home.hero")!;
    hero.content = { eyebrow: "", title: "", body: "", primaryLabel: "", primaryHref: "", secondaryLabel: "", secondaryHref: "", imageUrl: "", items: [] };
    const features = legacy.pages.home.sections.find((section) => section.systemKey === "home.features")!;
    features.content.title = "My custom feature heading";

    const hydrated = hydrateSystemSectionContent(legacy);
    expect(hydrated.pages.home.sections.find((section) => section.systemKey === "home.hero")?.content.title).toContain("Your One-Stop");
    expect(hydrated.pages.home.sections.find((section) => section.systemKey === "home.features")?.content.title).toBe("My custom feature heading");
  });
});

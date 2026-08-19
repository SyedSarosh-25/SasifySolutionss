import { type ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import AmbientBackground from "./AmbientBackground";
import SitePageRenderer from "@/site-builder/SitePageRenderer";
import { usePublishedSitePage } from "@/site-builder/SiteBuilderProvider";
import type { PublicPageKey } from "@/site-builder/schema";
import { trpc } from "@/providers/trpc";
import { resolveSiteTemplate } from "@/site-theme/templates";

interface LayoutProps {
  children: ReactNode;
  showFooter?: boolean;
  pageKey?: PublicPageKey;
}

export default function Layout({ children, showFooter = true, pageKey }: LayoutProps) {
  const { data: siteSettings } = trpc.public.siteSettings.useQuery(undefined, { staleTime: 30_000, refetchOnWindowFocus: false });
  const activeTemplate = resolveSiteTemplate(siteSettings?.site_template);
  const configuredPage = usePublishedSitePage(pageKey);
  const systemIndex = configuredPage?.sections.findIndex((section) => section.type === "system") ?? -1;
  const systemSection = systemIndex >= 0 ? configuredPage?.sections[systemIndex] : null;
  const beforeSections = systemIndex >= 0 ? configuredPage?.sections.slice(0, systemIndex) : [];
  const afterSections = systemIndex >= 0 ? configuredPage?.sections.slice(systemIndex + 1) : configuredPage?.sections ?? [];
  const showSystemContent = !configuredPage || !systemSection || systemSection.visible;

  return (
    <div className="sas-site relative min-h-screen overflow-x-hidden bg-[#f7f9ff] text-[#080914]" data-site-template={activeTemplate}>
      <a href="#public-main" className="public-shell-primary fixed left-4 top-3 z-[100] -translate-y-24 rounded-xl px-4 py-2.5 text-sm font-black text-white transition-transform focus:translate-y-0">Skip to main content</a>
      <AmbientBackground />
      <div className="relative z-10">
        <Navbar />
        <main id="public-main" tabIndex={-1} className="pt-[4.75rem]">
          <SitePageRenderer sections={beforeSections} />
          {showSystemContent && children}
          <SitePageRenderer sections={afterSections} />
        </main>
        {showFooter && <Footer />}
      </div>
    </div>
  );
}

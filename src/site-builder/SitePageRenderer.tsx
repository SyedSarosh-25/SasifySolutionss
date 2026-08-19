import { useCallback } from "react";
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import HeroSection from "@/components/home/HeroSection";
import StatsStrip from "@/components/home/StatsStrip";
import FeatureCards from "@/components/home/FeatureCards";
import PopularTools from "@/components/home/PopularTools";
import HowItWorks from "@/components/home/HowItWorks";
import WalletSection from "@/components/home/WalletSection";
import FAQSection from "@/components/home/FAQSection";
import AnswerEngineSection from "@/components/home/AnswerEngineSection";
import ProviderCtaSection from "@/components/home/ProviderCtaSection";
import type { BuilderSection, SitePage } from "./schema";

const systemSections: Record<string, (section: BuilderSection) => React.ReactNode> = {
  "home.hero": (section) => <HeroSection content={section.content} />,
  "home.stats": (section) => <StatsStrip content={section.content} />,
  "home.features": (section) => <FeatureCards content={section.content} />,
  "home.answer-engine": (section) => <AnswerEngineSection content={section.content} />,
  "home.popular-tools": (section) => <PopularTools content={section.content} />,
  "home.how-it-works": (section) => <HowItWorks content={section.content} />,
  "home.wallet": (section) => <WalletSection content={section.content} />,
  "home.provider-cta": (section) => <ProviderCtaSection content={section.content} />,
  "home.faq": (section) => <FAQSection content={section.content} />,
};

const widthClasses = { narrow: "max-w-3xl", content: "max-w-5xl", wide: "max-w-7xl", full: "max-w-none" } as const;
const spacingClasses = { none: "py-0", compact: "py-6 sm:py-8", normal: "py-10 sm:py-14", spacious: "py-16 sm:py-24" } as const;
const surfaceClasses = {
  default: "bg-transparent text-[#050816]",
  muted: "bg-white/70 text-[#050816]",
  brand: "bg-[#155cff] text-white",
  dark: "bg-[#0a1128] text-white",
} as const;

function SectionShell({ section, children }: { section: BuilderSection; children: React.ReactNode }) {
  return (
    <section data-site-section={section.id} className={`${surfaceClasses[section.style.surface]} ${spacingClasses[section.style.spacing]} px-4 sm:px-6`}>
      <div className={`mx-auto ${widthClasses[section.style.width]} ${section.style.align === "center" ? "text-center" : "text-left"}`}>
        {children}
      </div>
    </section>
  );
}

function Heading({ section }: { section: BuilderSection }) {
  return (
    <div className={section.style.align === "center" ? "mx-auto max-w-3xl" : "max-w-3xl"}>
      {section.content.eyebrow && <p className="text-xs font-black uppercase tracking-[0.15em] opacity-65">{section.content.eyebrow}</p>}
      {section.content.title && <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{section.content.title}</h2>}
      {section.content.body && <p className="mt-4 whitespace-pre-line text-base font-medium leading-7 opacity-75 sm:text-lg">{section.content.body}</p>}
    </div>
  );
}

function ActionLinks({ section }: { section: BuilderSection }) {
  if (!section.content.primaryLabel && !section.content.secondaryLabel) return null;
  return (
    <div className={`mt-7 flex flex-wrap gap-3 ${section.style.align === "center" ? "justify-center" : ""}`}>
      {section.content.primaryLabel && section.content.primaryHref && (
        <a href={section.content.primaryHref} className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black ${section.style.surface === "brand" || section.style.surface === "dark" ? "bg-white text-[#0a1128]" : "bg-[#155cff] text-white"}`}>
          {section.content.primaryLabel}<ArrowRight className="h-4 w-4" />
        </a>
      )}
      {section.content.secondaryLabel && section.content.secondaryHref && (
        <a href={section.content.secondaryHref} className="inline-flex items-center rounded-xl border border-current/20 px-5 py-3 text-sm font-black">
          {section.content.secondaryLabel}
        </a>
      )}
    </div>
  );
}

function HeroBlock({ section }: { section: BuilderSection }) {
  const split = section.variant === "split" && section.content.imageUrl;
  return (
    <SectionShell section={section}>
      <div className={split ? "grid items-center gap-10 lg:grid-cols-2" : ""}>
        <div><Heading section={section} /><ActionLinks section={section} /></div>
        {split && <img src={section.content.imageUrl} alt="" className="aspect-[4/3] w-full rounded-2xl object-cover ring-1 ring-black/5" />}
      </div>
    </SectionShell>
  );
}

function CardsBlock({ section }: { section: BuilderSection }) {
  const columns = section.variant === "three-column" ? "md:grid-cols-3" : section.variant === "pricing" ? "md:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <SectionShell section={section}>
      <Heading section={section} />
      <div className={`mt-8 grid gap-4 ${columns}`}>
        {section.content.items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-[#dfe6ff] bg-white p-5 text-left text-[#050816] shadow-[0_8px_24px_rgba(12,37,104,0.06)]">
            {item.imageUrl && <img src={item.imageUrl} alt="" className="mb-4 aspect-[16/9] w-full rounded-xl object-cover" />}
            <h3 className="text-lg font-black">{item.title}</h3>
            <p className="mt-2 text-sm font-medium leading-6 text-[#596176]">{item.text}</p>
            {item.href && <a href={item.href} className="mt-4 inline-flex text-sm font-black text-[#155cff]">{item.label || "Learn more"}</a>}
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

function SliderBlock({ section }: { section: BuilderSection }) {
  const [viewportRef, api] = useEmblaCarousel({ align: "start", loop: section.content.items.length > 2 });
  const prev = useCallback(() => api?.scrollPrev(), [api]);
  const next = useCallback(() => api?.scrollNext(), [api]);
  return (
    <SectionShell section={section}>
      <div className="flex items-end justify-between gap-4"><Heading section={section} /><div className="flex gap-2"><button onClick={prev} aria-label="Previous slide" className="rounded-lg border border-current/15 p-2"><ChevronLeft className="h-4 w-4" /></button><button onClick={next} aria-label="Next slide" className="rounded-lg border border-current/15 p-2"><ChevronRight className="h-4 w-4" /></button></div></div>
      <div ref={viewportRef} className="mt-8 overflow-hidden"><div className="flex -ml-4">{section.content.items.map((item) => <div key={item.id} className="min-w-0 flex-[0_0_86%] pl-4 sm:flex-[0_0_48%] lg:flex-[0_0_32%]"><article className="h-full rounded-2xl border border-[#dfe6ff] bg-white p-5 text-[#050816]"><h3 className="text-lg font-black">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[#596176]">{item.text}</p></article></div>)}</div></div>
    </SectionShell>
  );
}

function ItemsBlock({ section }: { section: BuilderSection }) {
  const isStats = section.type === "stats";
  return (
    <SectionShell section={section}>
      <Heading section={section} />
      <div className={`mt-8 grid gap-4 ${isStats ? "grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
        {section.content.items.map((item, index) => <article key={item.id} className="rounded-2xl border border-current/10 bg-white/90 p-5 text-left text-[#050816]">{isStats ? <p className="text-3xl font-black text-[#155cff]">{item.value || item.title}</p> : <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#eef3ff] text-sm font-black text-[#155cff]">{section.type === "steps" ? index + 1 : <CheckCircle2 className="h-5 w-5" />}</div>}<h3 className="mt-1 font-black">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[#596176]">{item.text}</p></article>)}
      </div>
    </SectionShell>
  );
}

function FaqBlock({ section }: { section: BuilderSection }) {
  return <SectionShell section={section}><Heading section={section} /><div className="mt-8 space-y-3">{section.content.items.map((item) => <details key={item.id} className="rounded-xl border border-[#dfe6ff] bg-white px-5 py-4 text-left text-[#050816]"><summary className="cursor-pointer font-black">{item.title}</summary><p className="mt-3 text-sm leading-6 text-[#596176]">{item.text}</p></details>)}</div></SectionShell>;
}

function CtaBlock({ section }: { section: BuilderSection }) {
  return <SectionShell section={section}><div className={section.variant === "split" ? "flex flex-col justify-between gap-6 md:flex-row md:items-center" : ""}><Heading section={section} /><ActionLinks section={section} /></div></SectionShell>;
}

function TrustBlock({ section }: { section: BuilderSection }) {
  return <SectionShell section={section}><div className="flex flex-col gap-6 md:flex-row md:items-center"><ShieldCheck className="h-12 w-12 shrink-0 text-[#155cff]" /><div className="flex-1"><Heading section={section} /></div><div className="flex flex-wrap gap-2">{section.content.items.map((item) => <span key={item.id} className="rounded-full border border-current/15 px-4 py-2 text-xs font-black">{item.title}</span>)}</div></div></SectionShell>;
}

export function BuilderSectionRenderer({ section, preview = false }: { section: BuilderSection; preview?: boolean }) {
  if (!section.visible) return null;
  if (section.type === "system") {
    const render = section.systemKey ? systemSections[section.systemKey] : undefined;
    if (render) return <>{render(section)}</>;
    return preview ? <section className="m-4 rounded-xl border border-dashed border-[#a9b8e8] bg-[#f7f9ff] px-5 py-8 text-center text-sm font-bold text-[#596176]">Protected live component: {section.systemKey}</section> : null;
  }
  if (section.type === "hero") return <HeroBlock section={section} />;
  if (section.type === "cards") return <CardsBlock section={section} />;
  if (section.type === "slider") return <SliderBlock section={section} />;
  if (["stats", "steps"].includes(section.type)) return <ItemsBlock section={section} />;
  if (section.type === "faq") return <FaqBlock section={section} />;
  if (section.type === "cta" || section.type === "rich-text") return <CtaBlock section={section} />;
  if (section.type === "trust") return <TrustBlock section={section} />;
  if (section.type === "spacer") return section.variant === "line" ? <div className="mx-auto max-w-7xl border-t border-[#dfe6ff]" /> : <div className="h-10 sm:h-16" />;
  return null;
}

export default function SitePageRenderer({ page, preview = false, sections }: { page?: SitePage | null; preview?: boolean; sections?: BuilderSection[] }) {
  const rows = sections ?? page?.sections ?? [];
  return <>{rows.map((section) => <BuilderSectionRenderer key={section.id} section={section} preview={preview} />)}</>;
}

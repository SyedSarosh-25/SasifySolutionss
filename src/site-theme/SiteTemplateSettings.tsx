import { useState } from "react";
import { Check, ExternalLink, Loader2, Palette, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SITE_TEMPLATES, type SiteTemplateId } from "./templates";

function TemplateMiniature({ template }: { template: SiteTemplateId }) {
  return (
    <div className={`template-miniature template-miniature--${template}`} aria-hidden="true">
      <div className="template-miniature__nav"><span /><span /><i /><i /><b /></div>
      <div className="template-miniature__hero">
        <div><small>Premium marketplace</small><strong>Digital tools,<br />designed differently.</strong><em /><em /></div>
        <div className="template-miniature__orb"><span /><span /><span /></div>
      </div>
      <div className="template-miniature__cards"><span /><span /><span /></div>
    </div>
  );
}

export default function SiteTemplateSettings() {
  const utils = trpc.useUtils();
  const current = trpc.siteTheme.current.useQuery();
  const [activating, setActivating] = useState<SiteTemplateId | null>(null);
  const [activeOverride, setActiveOverride] = useState<SiteTemplateId | null>(null);
  const activate = trpc.siteTheme.activate.useMutation({
    onSuccess: async (data) => {
      setActiveOverride(data.template);
      setActivating(null);
      toast.success(`${SITE_TEMPLATES.find((item) => item.id === data.template)?.name ?? "Template"} activated`);
      await Promise.all([
        utils.siteTheme.current.invalidate(),
        utils.public.siteSettings.invalidate(),
      ]);
    },
    onError: (error) => {
      setActiveOverride(null);
      setActivating(null);
      toast.error(error.message || "Template activation failed");
    },
  });

  const activeTemplate = activeOverride ?? current.data?.template ?? "classic-blue";

  return (
    <section className="space-y-5" aria-labelledby="site-template-heading">
      <header className="flex flex-col gap-4 rounded-2xl bg-white p-6 ring-1 ring-black/[0.05] sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef3ff] text-[#155cff]">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h2 id="site-template-heading" className="text-base font-bold text-[#0a1128]">Website templates</h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[#5c6478]">Activate one complete visual system across the public website. Content, product data, checkout, and customer actions stay unchanged.</p>
          </div>
        </div>
        <a href="/" target="_blank" rel="noreferrer" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#dfe6ff] px-3.5 text-xs font-bold text-[#155cff] hover:bg-[#f4f7ff]">
          Open website <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </header>

      <div className="grid gap-5 xl:grid-cols-2">
        {SITE_TEMPLATES.map((template) => {
          const isActive = activeTemplate === template.id;
          const isActivating = activating === template.id;
          return (
            <article key={template.id} className={`overflow-hidden rounded-2xl bg-white transition-[box-shadow,transform] duration-200 ${isActive ? "ring-2 ring-[#155cff] shadow-[0_8px_24px_rgba(21,92,255,0.12)]" : "ring-1 ring-black/[0.06] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(12,37,104,0.08)]"}`}>
              <TemplateMiniature template={template.id} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-bold text-[#0a1128]">{template.name}</h3>
                      {isActive && <span className="inline-flex items-center gap-1 rounded-full bg-[#eafff0] px-2.5 py-1 text-[10px] font-bold text-[#0b8f34]"><Check className="h-3 w-3" /> Active</span>}
                    </div>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[#8b94a9]">{template.category}</p>
                  </div>
                  <div className="flex -space-x-1.5" aria-label="Template color palette">
                    {template.palette.map((color) => <span key={color} className="h-6 w-6 rounded-full ring-2 ring-white" style={{ backgroundColor: color }} />)}
                  </div>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-[#5c6478]">{template.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">{template.traits.map((trait) => <span key={trait} className="rounded-md bg-[#f4f6ff] px-2 py-1 text-[10px] font-semibold text-[#58627a]">{trait}</span>)}</div>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#eef1f8] pt-4">
                  <p className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-[#7c8498]"><Sparkles className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{template.signature}</span></p>
                  <button
                    type="button"
                    disabled={isActive || activate.isPending}
                    onClick={() => { setActivating(template.id); activate.mutate({ template: template.id }); }}
                    className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-xs font-bold transition-colors ${isActive ? "cursor-default bg-[#eef3ff] text-[#155cff]" : "bg-[#0a1128] text-white hover:bg-[#1b2340] disabled:cursor-wait disabled:opacity-60"}`}
                  >
                    {isActivating ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Activating</> : isActive ? "Active template" : "Activate"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

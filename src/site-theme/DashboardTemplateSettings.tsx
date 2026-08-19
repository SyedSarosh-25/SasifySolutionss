import { useMemo } from "react";
import { MonitorCog, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { SITE_TEMPLATES, type DashboardTemplatePreference } from "./templates";

function SurfaceSelector({
  surface,
  value,
  onChange,
  pending,
}: {
  surface: "user" | "admin";
  value: DashboardTemplatePreference;
  onChange: (value: DashboardTemplatePreference) => void;
  pending: boolean;
}) {
  const selected = useMemo(() => SITE_TEMPLATES.find((item) => item.id === value) ?? SITE_TEMPLATES[0], [value]);
  const Icon = surface === "user" ? UserRound : ShieldCheck;
  return (
    <section className="overflow-hidden rounded-2xl border border-[#dfe6ff] bg-white shadow-[0_12px_34px_rgba(12,37,104,0.06)]">
      <div className="flex items-start gap-3 border-b border-[#edf1ff] p-5">
        <span className="rounded-xl bg-[#eef3ff] p-2 text-[#155cff]"><Icon className="h-5 w-5" /></span>
        <div><h3 className="text-sm font-black text-[#0a1128]">{surface === "user" ? "User Dashboard" : "Admin Dashboard"}</h3><p className="mt-1 text-xs leading-5 text-[#7c8498]">Choose an independent design or keep it synchronized with the public site template.</p></div>
      </div>
      <div className={`dashboard-template-preview dashboard-template-preview--${value === "follow-site" ? "classic-blue" : value}`} aria-hidden="true">
        <div className="dashboard-template-preview__rail"><span /><span /><span /><span /></div>
        <div className="dashboard-template-preview__body"><div className="dashboard-template-preview__top" /><div className="dashboard-template-preview__stats"><span /><span /><span /></div><div className="dashboard-template-preview__panel" /></div>
      </div>
      <div className="p-5">
        <label className="block text-xs font-black uppercase tracking-[0.08em] text-[#596176]" htmlFor={`${surface}-dashboard-template`}>Design system</label>
        <select id={`${surface}-dashboard-template`} value={value} disabled={pending} onChange={(event) => onChange(event.target.value as DashboardTemplatePreference)} className="mt-2 h-11 w-full rounded-xl border border-[#dfe6ff] bg-white px-3 text-sm font-bold text-[#0a1128] outline-none focus:border-[#155cff] focus:ring-2 focus:ring-[#155cff]/10 disabled:opacity-60">
          <option value="follow-site">Follow public site template</option>
          {SITE_TEMPLATES.map((template) => <option key={template.id} value={template.id}>{template.name} — {template.category}</option>)}
        </select>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-[#f7f9ff] px-4 py-3">
          <div><p className="text-xs font-black text-[#0a1128]">{value === "follow-site" ? "Automatically synchronized" : selected.name}</p><p className="mt-0.5 text-[11px] text-[#7c8498]">{value === "follow-site" ? "Changes whenever the public template changes." : selected.signature}</p></div>
          <div className="flex shrink-0 gap-1">{selected.palette.map((color) => <span key={color} className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ background: color }} />)}</div>
        </div>
      </div>
    </section>
  );
}

export default function DashboardTemplateSettings() {
  const utils = trpc.useUtils();
  const current = trpc.siteTheme.current.useQuery();
  const mutation = trpc.siteTheme.activateDashboard.useMutation({
    onSuccess: async (result) => {
      await Promise.all([utils.siteTheme.current.invalidate(), utils.public.siteSettings.invalidate()]);
      toast.success(`${result.surface === "user" ? "User" : "Admin"} dashboard design updated`);
    },
    onError: (error) => toast.error(error.message || "Dashboard design could not be updated"),
  });
  if (current.isLoading) return <div className="h-64 animate-pulse rounded-2xl bg-[#eef3ff]" />;
  const userValue = (current.data?.userDashboardTemplate ?? "follow-site") as DashboardTemplatePreference;
  const adminValue = (current.data?.adminDashboardTemplate ?? "follow-site") as DashboardTemplatePreference;
  return (
    <div>
      <div className="mb-5 flex items-start gap-3"><span className="rounded-xl bg-[#0a1128] p-2.5 text-white"><MonitorCog className="h-5 w-5" /></span><div><h2 className="text-base font-black text-[#0a1128]">Dashboard Templates</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#7c8498]">User and admin dashboards are scoped independently. Public template CSS never leaks into operational screens.</p></div></div>
      <div className="grid gap-5 xl:grid-cols-2">
        <SurfaceSelector surface="user" value={userValue} pending={mutation.isPending} onChange={(template) => mutation.mutate({ surface: "user", template })} />
        <SurfaceSelector surface="admin" value={adminValue} pending={mutation.isPending} onChange={(template) => mutation.mutate({ surface: "admin", template })} />
      </div>
    </div>
  );
}

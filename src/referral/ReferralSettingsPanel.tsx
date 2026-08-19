import { useState } from "react";
import { Percent, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";

type ReferralSettingsForm = {
  enabled: boolean;
  userPercent: string;
  resellerPercent: string;
  holdDays: string;
  minConversion: string;
};

function SettingsForm({ initial, refetch }: { initial: ReferralSettingsForm; refetch: () => Promise<unknown> }) {
  const [form, setForm] = useState(initial);
  const save = trpc.referralAdmin.updateSettings.useMutation({
    onSuccess: async () => { toast.success("Referral settings saved"); await refetch(); },
    onError: (error) => toast.error(error.message),
  });
  const saveForm = () => {
    const payload = {
      enabled: form.enabled,
      userPercent: Number(form.userPercent),
      resellerPercent: Number(form.resellerPercent),
      holdDays: Number(form.holdDays),
      minConversion: Number(form.minConversion),
    };
    if (Object.values(payload).some((value) => typeof value === "number" && !Number.isFinite(value))) {
      toast.error("Complete every referral setting before saving");
      return;
    }
    save.mutate(payload);
  };
  const inputClass = "mt-2 h-11 w-full rounded-xl border border-[#dfe6ff] px-4 text-sm font-bold text-[#0a1128] outline-none focus:border-[#155cff]";
  return <div className="space-y-5">
    <div className="flex items-start gap-3"><span className="rounded-xl bg-[#eaf8ef] p-2.5 text-[#0b8f34]"><Percent className="h-5 w-5" /></span><div><h2 className="text-base font-black text-[#0a1128]">Referral Program</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#7c8498]">Server-validated percentages are snapshotted on each delivered order. Changing a rate never rewrites prior commissions.</p></div></div>
    <section className="rounded-2xl border border-[#dfe6ff] bg-white p-5 shadow-[0_10px_32px_rgba(12,37,104,.05)]">
      <label className="flex items-center justify-between gap-4 rounded-xl bg-[#f7f9ff] p-4"><span><span className="block text-sm font-black text-[#0a1128]">Referral earning enabled</span><span className="mt-1 block text-xs text-[#7c8498]">Disabling prevents new commissions; existing ledger entries remain intact.</span></span><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="h-5 w-5 accent-[#155cff]" /></label>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-xs font-black text-[#596176]">Standard user commission (%)<input type="number" min="0" max="30" step="0.1" value={form.userPercent} onChange={(e) => setForm({ ...form, userPercent: e.target.value })} className={inputClass} /><span className="mt-1.5 block text-[11px] font-medium text-[#9aa0b4]">Allowed range: 0–30%</span></label>
        <label className="text-xs font-black text-[#596176]">Approved reseller commission (%)<input type="number" min="0" max="40" step="0.1" value={form.resellerPercent} onChange={(e) => setForm({ ...form, resellerPercent: e.target.value })} className={inputClass} /><span className="mt-1.5 block text-[11px] font-medium text-[#9aa0b4]">Must be at least the standard user rate; maximum 40%.</span></label>
        <label className="text-xs font-black text-[#596176]">Commission hold period (days)<input type="number" min="0" max="90" step="1" value={form.holdDays} onChange={(e) => setForm({ ...form, holdDays: e.target.value })} className={inputClass} /><span className="mt-1.5 block text-[11px] font-medium text-[#9aa0b4]">Use the refund window; allowed range: 0–90 days.</span></label>
        <label className="text-xs font-black text-[#596176]">Minimum wallet conversion (USD)<input type="number" min="0" max="10000" step="0.01" value={form.minConversion} onChange={(e) => setForm({ ...form, minConversion: e.target.value })} className={inputClass} /><span className="mt-1.5 block text-[11px] font-medium text-[#9aa0b4]">Applied to total available earnings; allowed range: $0–$10,000.</span></label>
      </div>
      <div className="mt-5 flex flex-col gap-3 border-t border-[#edf1ff] pt-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-xs text-[#596176]"><ShieldCheck className="h-4 w-4 text-[#0b8f34]" /> Every change is written to the admin audit log.</div><button onClick={saveForm} disabled={save.isPending} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#155cff] px-5 text-sm font-black text-white disabled:opacity-50"><Save className="h-4 w-4" />{save.isPending ? "Saving..." : "Save referral settings"}</button></div>
    </section>
  </div>;
}

export default function ReferralSettingsPanel() {
  const settings = trpc.referralAdmin.settings.useQuery();
  if (settings.isLoading || !settings.data) return <div className="h-72 animate-pulse rounded-2xl bg-[#eef3ff]" />;
  const initial = {
    enabled: settings.data.enabled,
    userPercent: String(settings.data.userPercent),
    resellerPercent: String(settings.data.resellerPercent),
    holdDays: String(settings.data.holdDays),
    minConversion: String(settings.data.minConversion),
  };
  return <SettingsForm key={JSON.stringify(initial)} initial={initial} refetch={() => settings.refetch()} />;
}

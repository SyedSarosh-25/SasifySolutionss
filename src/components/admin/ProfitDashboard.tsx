import { useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import { useCurrency } from "@/hooks/useCurrency";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Download,
  Package,
  Percent,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(value: string) {
  const date = new Date(`${value}T00:00:00`);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: string) {
  const date = new Date(`${value}T23:59:59.999`);
  date.setHours(23, 59, 59, 999);
  return date;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function percent(value: number) {
  return `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`;
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof TrendingUp;
  tone: "navy" | "orange" | "green" | "blue";
}) {
  const tones = {
    navy: {
      card: "border-[#263861] bg-[linear-gradient(145deg,#18284e_0%,#0a1128_72%)] text-white shadow-[0_7px_0_#050816,0_17px_30px_rgba(10,17,40,0.24)]",
      icon: "border-white/15 bg-white/10 text-white",
      label: "text-white/65",
      detail: "text-white/55",
    },
    orange: {
      card: "border-[#ffd9bc] bg-[linear-gradient(145deg,#fffaf5_0%,#fff1e6_72%)] text-[#0a1128] shadow-[0_7px_0_#ffd5b5,0_17px_30px_rgba(249,115,22,0.10)]",
      icon: "border-[#ffd5b5] bg-white text-[#f97316]",
      label: "text-[#b45309]",
      detail: "text-[#9a6b4b]",
    },
    green: {
      card: "border-[#0a7b2f] bg-[linear-gradient(145deg,#14a244_0%,#08742a_76%)] text-white shadow-[0_7px_0_#075921,0_17px_30px_rgba(11,143,52,0.20)]",
      icon: "border-white/20 bg-white/12 text-white",
      label: "text-white/70",
      detail: "text-white/60",
    },
    blue: {
      card: "border-[#cad8ff] bg-[linear-gradient(145deg,#ffffff_0%,#eef3ff_74%)] text-[#0a1128] shadow-[0_7px_0_#ccd9fb,0_17px_30px_rgba(21,92,255,0.10)]",
      icon: "border-[#d6e1ff] bg-white text-[#155cff]",
      label: "text-[#155cff]",
      detail: "text-[#7c8498]",
    },
  }[tone];

  return (
    <article className={`group relative isolate min-h-[142px] overflow-hidden rounded-xl border p-4 transition-transform duration-200 hover:-translate-y-0.5 ${tones.card}`}>
      <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full border border-current opacity-[0.06]" />
      <div className="pointer-events-none absolute -right-2 -top-3 h-16 w-16 rounded-full border border-current opacity-[0.08]" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${tones.label}`}>{label}</p>
          <p className="mt-3 truncate text-2xl font-black tracking-[-0.035em] tabular-nums">{value}</p>
          <p className={`mt-2 text-[11px] font-medium ${tones.detail}`}>{detail}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border shadow-sm ${tones.icon}`}>
          <Icon className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}

function ChartTooltip({ active, payload, label, format }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[160px] rounded-lg border border-[#dfe6ff] bg-white/95 p-3 shadow-[0_12px_28px_rgba(12,37,104,0.14)] backdrop-blur-xl">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#8992aa]">{label}</p>
      <div className="mt-2 space-y-1.5">
        {payload.map((item: any) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-5 text-xs">
            <span className="flex items-center gap-2 capitalize text-[#596176]"><span className="h-2 w-2 rounded-sm" style={{ background: item.color || item.fill }} />{item.name}</span>
            <span className="font-bold tabular-nums text-[#0a1128]">{format(Number(item.value || 0))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfitDashboard() {
  const { format } = useCurrency();
  const today = new Date();
  const [from, setFrom] = useState(formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(formatDateInput(today));
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

  const query = trpc.admin.profitReport.useQuery({
    from: startOfDay(from).toISOString(),
    to: endOfDay(to).toISOString(),
    groupBy,
  });

  const summary = query.data?.summary;
  const byProduct = query.data?.byProduct || [];
  const orders = query.data?.orders || [];
  const trend = query.data?.trend || [];
  const status = useMemo(() => query.data?.statusBreakdown || { delivered: 0, refunded: 0, failed: 0, cancelled: 0 }, [query.data?.statusBreakdown]);

  const health = useMemo(() => {
    const revenue = Number(summary?.revenue || 0);
    const cost = Number(summary?.cost || 0);
    const profit = Number(summary?.profit || 0);
    const delivered = Number(status.delivered || 0);
    const totalOutcomes = delivered + Number(status.refunded || 0) + Number(status.failed || 0) + Number(status.cancelled || 0);
    return {
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      costRatio: revenue > 0 ? (cost / revenue) * 100 : 0,
      averageProfit: Number(summary?.orders || 0) > 0 ? profit / Number(summary?.orders || 0) : 0,
      deliveryRate: totalOutcomes > 0 ? (delivered / totalOutcomes) * 100 : 0,
      refundRate: totalOutcomes > 0 ? (Number(status.refunded || 0) / totalOutcomes) * 100 : 0,
      totalOutcomes,
    };
  }, [summary, status]);

  const marginData = useMemo(() => {
    const profit = Math.max(0, Number(summary?.profit || 0));
    const cost = Math.max(0, Number(summary?.cost || 0));
    if (profit + cost === 0) return [];
    return [
      { name: "Net profit", value: profit, color: "#0b8f34" },
      { name: "Provider cost", value: cost, color: "#dfe6ff" },
    ];
  }, [summary]);

  const statusRows = [
    { label: "Delivered", value: Number(status.delivered || 0), color: "#0b8f34" },
    { label: "Refunded", value: Number(status.refunded || 0), color: "#d11f4a" },
    { label: "Failed", value: Number(status.failed || 0), color: "#f97316" },
    { label: "Cancelled", value: Number(status.cancelled || 0), color: "#8992aa" },
  ];

  function applyPreset(preset: "7d" | "30d" | "month" | "quarter") {
    const end = new Date();
    const start = new Date(end);
    if (preset === "7d") start.setDate(end.getDate() - 6);
    if (preset === "30d") start.setDate(end.getDate() - 29);
    if (preset === "month") start.setDate(1);
    if (preset === "quarter") {
      start.setMonth(Math.floor(end.getMonth() / 3) * 3, 1);
    }
    setFrom(formatDateInput(start));
    setTo(formatDateInput(end));
    setGroupBy(preset === "quarter" ? "week" : "day");
  }

  function downloadCSV() {
    if (!orders.length) return;
    const rows = [
      ["Order ID", "Product", "Customer", "Revenue", "Provider Cost", "Profit", "Margin %", "Date"],
      ...orders.map((order: any) => {
        const revenue = Number(order.priceUsd || 0);
        const profit = Number(order.profitUsd || 0);
        return [order.id, order.productName, order.userName || order.userEmail || "", revenue, Number(order.providerCostUsd || 0), profit, revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : "0.00", new Date(order.createdAt).toISOString()];
      }),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `profit-report-${from}-to-${to}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Profit report downloaded");
  }

  const maxProductProfit = Math.max(...byProduct.map((row: any) => Number(row.profit || 0)), 0);

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#dfe6ff] bg-white p-4 shadow-[0_8px_24px_rgba(12,37,104,0.06)]" aria-label="Profit report controls">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8992aa]">Reporting period</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {([
                ["7d", "7 days"],
                ["30d", "30 days"],
                ["month", "This month"],
                ["quarter", "This quarter"],
              ] as const).map(([id, label]) => (
                <button key={id} type="button" onClick={() => applyPreset(id)} className="rounded-lg border border-[#dfe6ff] bg-[#f8faff] px-3 py-2 text-xs font-bold text-[#596176] transition-colors hover:border-[#b9caff] hover:bg-white hover:text-[#155cff]">{label}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#8992aa]">From</span>
              <input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs font-semibold text-[#0a1128] outline-none focus:border-[#155cff] sm:w-[145px]" />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#8992aa]">To</span>
              <input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs font-semibold text-[#0a1128] outline-none focus:border-[#155cff] sm:w-[145px]" />
            </label>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#8992aa]">Group by</span>
              <div className="mt-1 flex h-10 rounded-lg border border-[#dfe6ff] bg-[#f8faff] p-1">
                {(["day", "week", "month"] as const).map((item) => <button key={item} type="button" onClick={() => setGroupBy(item)} className={`rounded-md px-2.5 text-[11px] font-bold capitalize ${groupBy === item ? "bg-[#0a1128] text-white shadow-sm" : "text-[#7c8498] hover:text-[#0a1128]"}`}>{item}</button>)}
              </div>
            </div>
            <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs font-bold text-[#596176] hover:bg-[#f8faff] disabled:opacity-50" aria-label="Refresh profit report"><RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} /> Refresh</button>
            <button type="button" onClick={downloadCSV} disabled={!orders.length} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0a1128] px-4 text-xs font-bold text-white hover:bg-[#1a2040] disabled:cursor-not-allowed disabled:opacity-40"><Download className="h-3.5 w-3.5" /> Export CSV</button>
          </div>
        </div>
      </section>

      {query.isLoading && (
        <div className="space-y-5" aria-busy="true" aria-label="Loading profit report">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-[149px] animate-pulse rounded-xl bg-[#e9efff]" />)}</div>
          <div className="grid gap-4 lg:grid-cols-3"><div className="h-[380px] animate-pulse rounded-xl bg-[#e9efff] lg:col-span-2" /><div className="h-[380px] animate-pulse rounded-xl bg-[#e9efff]" /></div>
        </div>
      )}

      {!query.isLoading && query.error && (
        <div className="rounded-xl border border-[#f2c6d1] bg-[#fff7f9] p-8 text-center">
          <p className="text-sm font-bold text-[#d11f4a]">Profit report could not be loaded.</p>
          <p className="mt-1 text-xs text-[#7c8498]">{query.error.message}</p>
          <button type="button" onClick={() => query.refetch()} className="mt-3 rounded-lg bg-[#0a1128] px-4 py-2 text-xs font-bold text-white">Try again</button>
        </div>
      )}

      {!query.isLoading && !query.error && summary && (
        <>
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Profit metrics">
            <MetricCard label="Gross revenue" value={format(summary.revenue)} detail={`${summary.orders} delivered order${summary.orders === 1 ? "" : "s"}`} icon={CircleDollarSign} tone="navy" />
            <MetricCard label="Provider cost" value={format(summary.cost)} detail={`${percent(health.costRatio)} of revenue`} icon={Package} tone="orange" />
            <MetricCard label="Net profit" value={format(summary.profit)} detail={`${percent(health.margin)} net margin`} icon={TrendingUp} tone="green" />
            <MetricCard label="Orders" value={String(summary.orders)} detail={`${format(summary.avgOrderValue || 0)} average value`} icon={ShoppingBag} tone="blue" />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <article className="overflow-hidden rounded-xl border border-[#dfe6ff] bg-white shadow-[0_10px_30px_rgba(12,37,104,0.07)] lg:col-span-2">
              <div className="flex flex-col gap-3 border-b border-[#e7ecff] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-[#155cff]" /><h2 className="text-sm font-bold text-[#0a1128]">Financial performance</h2></div>
                  <p className="mt-1 text-[11px] text-[#8992aa]">Revenue, provider cost, and retained profit over the selected period</p>
                </div>
                <div className="flex flex-wrap gap-3 text-[10px] font-bold text-[#596176]">
                  <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#155cff]" />Revenue</span>
                  <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#f97316]" />Cost</span>
                  <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#0b8f34]" />Profit</span>
                </div>
              </div>
              <div className="h-[330px] px-2 pb-3 pt-5 sm:px-4">
                {trend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f82ff" /><stop offset="100%" stopColor="#155cff" /></linearGradient>
                        <linearGradient id="profitBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#23b953" /><stop offset="100%" stopColor="#0b8f34" /></linearGradient>
                        <linearGradient id="costBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff9c54" /><stop offset="100%" stopColor="#f97316" /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 5" stroke="#e7ecff" vertical={false} />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8992aa" }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} width={58} tick={{ fontSize: 10, fill: "#8992aa" }} tickFormatter={(value) => `$${Number(value).toFixed(Number(value) < 1 ? 2 : 0)}`} />
                      <Tooltip content={<ChartTooltip format={format} />} cursor={{ fill: "rgba(21,92,255,0.035)" }} />
                      <Bar dataKey="revenue" name="Revenue" fill="url(#revenueBar)" radius={[5, 5, 2, 2]} barSize={20} />
                      <Bar dataKey="cost" name="Cost" fill="url(#costBar)" radius={[5, 5, 2, 2]} barSize={20} />
                      <Bar dataKey="profit" name="Profit" fill="url(#profitBar)" radius={[5, 5, 2, 2]} barSize={20} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : <div className="flex h-full items-center justify-center text-xs text-[#8992aa]">No delivered-order activity in this period.</div>}
              </div>
            </article>

            <article className="rounded-xl border border-[#dfe6ff] bg-[linear-gradient(160deg,#ffffff_0%,#f7faff_100%)] p-5 shadow-[0_10px_30px_rgba(12,37,104,0.07)]">
              <div className="flex items-center justify-between gap-3">
                <div><div className="flex items-center gap-2"><Percent className="h-4 w-4 text-[#0b8f34]" /><h2 className="text-sm font-bold text-[#0a1128]">Margin health</h2></div><p className="mt-1 text-[11px] text-[#8992aa]">Profit retained after provider cost</p></div>
                <span className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase ${health.margin >= 30 ? "border-[#bde9ca] bg-[#f2fcf5] text-[#0b8f34]" : "border-[#eadfb8] bg-[#fffaf0] text-[#9b6200]"}`}>{health.margin >= 30 ? "Healthy" : "Watch"}</span>
              </div>
              <div className="relative mx-auto mt-3 h-[188px] max-w-[230px]">
                {marginData.length > 0 ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={marginData} dataKey="value" startAngle={90} endAngle={-270} innerRadius={64} outerRadius={82} paddingAngle={2} stroke="none">{marginData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip formatter={(value: number) => format(value)} /></PieChart></ResponsiveContainer> : null}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-black tracking-tight tabular-nums text-[#0a1128]">{percent(health.margin)}</span><span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#8992aa]">Net margin</span></div>
              </div>
              <div className="space-y-3 border-t border-[#e7ecff] pt-4">
                {statusRows.map((row) => {
                  const share = health.totalOutcomes > 0 ? (row.value / health.totalOutcomes) * 100 : 0;
                  return <div key={row.label}><div className="flex items-center justify-between text-[11px]"><span className="font-semibold text-[#596176]">{row.label}</span><span className="font-bold tabular-nums text-[#0a1128]">{row.value}</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#e9edfa]"><div className="h-full rounded-full" style={{ width: `${clampPercent(share)}%`, background: row.color }} /></div></div>;
                })}
              </div>
            </article>
          </section>

          <section className="grid gap-3 sm:grid-cols-3" aria-label="Profit insights">
            {[
              { label: "Profit per order", value: format(health.averageProfit), note: "Average retained amount", icon: ReceiptText, tone: "text-[#155cff] bg-[#eef3ff]" },
              { label: "Delivery rate", value: percent(health.deliveryRate), note: `${status.delivered} of ${health.totalOutcomes} final outcomes`, icon: ArrowUpRight, tone: "text-[#0b8f34] bg-[#eafff0]" },
              { label: "Refund rate", value: percent(health.refundRate), note: `${status.refunded} refunded order${status.refunded === 1 ? "" : "s"}`, icon: RefreshCw, tone: "text-[#d11f4a] bg-[#fff0f4]" },
            ].map((item) => <article key={item.label} className="flex items-center gap-3 rounded-xl border border-[#dfe6ff] bg-white p-4 shadow-[0_4px_16px_rgba(12,37,104,0.04)]"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.tone}`}><item.icon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-[#8992aa]">{item.label}</p><p className="mt-1 text-lg font-black tabular-nums text-[#0a1128]">{item.value}</p><p className="mt-0.5 truncate text-[10px] text-[#8992aa]">{item.note}</p></div></article>)}
          </section>

          <section className="overflow-hidden rounded-xl border border-[#dfe6ff] bg-white shadow-[0_10px_30px_rgba(12,37,104,0.06)]">
            <div className="flex flex-col gap-2 border-b border-[#e7ecff] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-[#155cff]" /><h2 className="text-sm font-bold text-[#0a1128]">Product performance</h2></div><p className="mt-1 text-[11px] text-[#8992aa]">Profit contribution and unit economics by product</p></div>
              <span className="text-[11px] text-[#7c8498]">{byProduct.length} product{byProduct.length === 1 ? "" : "s"}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#f8faff] text-[10px] font-bold uppercase tracking-[0.1em] text-[#7c8498]"><tr><th className="px-5 py-3">Product</th><th className="px-4 py-3">Orders</th><th className="px-4 py-3">Revenue</th><th className="px-4 py-3">Cost</th><th className="px-4 py-3">Margin</th><th className="px-5 py-3 text-right">Net profit</th></tr></thead>
                <tbody className="divide-y divide-[#e7ecff]">
                  {byProduct.map((row: any) => {
                    const rowMargin = Number(row.revenue || 0) > 0 ? (Number(row.profit || 0) / Number(row.revenue || 0)) * 100 : 0;
                    const contribution = maxProductProfit > 0 ? (Number(row.profit || 0) / maxProductProfit) * 100 : 0;
                    return <tr key={row.name} className="hover:bg-[#fbfcff]"><td className="px-5 py-3.5"><p className="max-w-[260px] truncate text-xs font-bold text-[#0a1128]">{row.name}</p><div className="mt-2 h-1.5 max-w-[220px] overflow-hidden rounded-full bg-[#e9edfa]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#155cff,#6d35ff)]" style={{ width: `${clampPercent(contribution)}%` }} /></div></td><td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-[#596176]">{row.orders}</td><td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-[#0a1128]">{format(row.revenue)}</td><td className="px-4 py-3.5 text-xs tabular-nums text-[#7c8498]">{format(row.cost)}</td><td className="px-4 py-3.5"><span className="rounded-md border border-[#bde9ca] bg-[#f2fcf5] px-2 py-1 text-[10px] font-bold tabular-nums text-[#0b8f34]">{percent(rowMargin)}</span></td><td className="px-5 py-3.5 text-right text-xs font-black tabular-nums text-[#0b8f34]">{format(row.profit)}</td></tr>;
                  })}
                  {byProduct.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-xs text-[#8992aa]">No product profit data in this period.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-[#dfe6ff] bg-white shadow-[0_10px_30px_rgba(12,37,104,0.06)]">
            <div className="flex flex-col gap-2 border-b border-[#e7ecff] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#155cff]" /><h2 className="text-sm font-bold text-[#0a1128]">Delivered order ledger</h2></div><p className="mt-1 text-[11px] text-[#8992aa]">Order-level revenue, provider cost, and realized margin</p></div>
              <span className="rounded-md bg-[#f4f6ff] px-2.5 py-1.5 text-[10px] font-bold text-[#596176]">Latest {Math.min(50, orders.length)} rows</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="bg-[#f8faff] text-[10px] font-bold uppercase tracking-[0.1em] text-[#7c8498]"><tr><th className="px-5 py-3">Order</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Revenue</th><th className="px-4 py-3">Cost</th><th className="px-4 py-3">Profit</th><th className="px-4 py-3">Margin</th><th className="px-5 py-3 text-right">Date</th></tr></thead>
                <tbody className="divide-y divide-[#e7ecff]">
                  {orders.slice(0, 50).map((order: any) => {
                    const revenue = Number(order.priceUsd || 0);
                    const margin = revenue > 0 ? (Number(order.profitUsd || 0) / revenue) * 100 : 0;
                    return <tr key={order.id} className="text-[#596176] hover:bg-[#fbfcff]"><td className="px-5 py-3.5 font-mono text-[11px] font-bold text-[#0a1128]">#{order.id}</td><td className="px-4 py-3.5"><p className="max-w-[190px] truncate text-xs font-semibold text-[#0a1128]">{order.productName}</p></td><td className="px-4 py-3.5"><p className="max-w-[170px] truncate text-xs">{order.userName || order.userEmail || "Customer"}</p></td><td className="px-4 py-3.5 text-xs font-semibold tabular-nums text-[#0a1128]">{format(order.priceUsd)}</td><td className="px-4 py-3.5 text-xs tabular-nums text-[#7c8498]">{format(order.providerCostUsd)}</td><td className="px-4 py-3.5 text-xs font-black tabular-nums text-[#0b8f34]">{format(order.profitUsd)}</td><td className="px-4 py-3.5 text-xs font-semibold tabular-nums">{percent(margin)}</td><td className="px-5 py-3.5 text-right text-[11px] text-[#7c8498]">{new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td></tr>;
                  })}
                  {orders.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-xs text-[#8992aa]">No delivered orders in this reporting period.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

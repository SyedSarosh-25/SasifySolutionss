import { cloneElement, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import {
  LayoutDashboard, Users, ShoppingBag, MessageSquare,
  Package, Settings, LogOut,
  DollarSign, CheckCircle, XCircle, Trash2, Boxes, ClipboardList, Paperclip,
  WalletCards, Headphones,
  ShieldAlert,
  Check, Loader2, PanelsTopLeft, Search, Eye, RefreshCw, RotateCcw, Copy
} from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { useCurrency } from "@/hooks/useCurrency";
import { currencyToUsd, formatCurrency, getExchangeRate } from "@/lib/currency";
import { normalizeAdminOrders } from "@/lib/admin-orders";
import { toast } from "sonner";
import UserDetailAdminPage from "@/components/admin/UserDetailAdminPage";
import ProfitDashboard from "@/components/admin/ProfitDashboard";
import PlatformApiToggle from "@/components/admin/PlatformApiToggle";
import SiteCustomizer from "@/components/admin/site-builder/SiteCustomizer";
import SiteTemplateSettings from "@/site-theme/SiteTemplateSettings";
import DashboardTemplateSettings from "@/site-theme/DashboardTemplateSettings";
import AdminReferralPanel from "@/referral/AdminReferralPanel";
import ReferralSettingsPanel from "@/referral/ReferralSettingsPanel";
import { resolveDashboardTemplate, resolveSiteTemplate } from "@/site-theme/templates";

/* ── Custom 3D-style SVG Icons ── */

function GeneralIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className}>
      <defs>
        <linearGradient id="gg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#155cff" />
          <stop offset="1" stopColor="#6d35ff" />
        </linearGradient>
        <filter id="gs"><feDropShadow dx="0" dy="2" stdDeviation="2.5" floodOpacity=".15" /></filter>
      </defs>
      {/* Globe base */}
      <circle cx="20" cy="20" r="16" fill="url(#gg)" filter="url(#gs)" />
      {/* Horizontal line */}
      <ellipse cx="20" cy="20" rx="13" ry="5" fill="none" stroke="white" strokeWidth="1.6" opacity=".75" />
      {/* Vertical arc */}
      <ellipse cx="20" cy="20" rx="5" ry="13" fill="none" stroke="white" strokeWidth="1.6" opacity=".75" />
      {/* Meridian lines */}
      <path d="M10 14Q14 20 10 26" fill="none" stroke="white" strokeWidth="1.2" opacity=".45" />
      <path d="M30 14Q26 20 30 26" fill="none" stroke="white" strokeWidth="1.2" opacity=".45" />
    </svg>
  );
}

function WalletsIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className}>
      <defs>
        <linearGradient id="wi" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0b8f34" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
        <filter id="ws"><feDropShadow dx="0" dy="2" stdDeviation="2.5" floodOpacity=".15" /></filter>
      </defs>
      {/* Main wallet body */}
      <rect x="5" y="10" width="24" height="20" rx="5" fill="url(#wi)" filter="url(#gs)" />
      {/* Card stripe */}
      <rect x="9" y="15" width="16" height="3" rx="1.5" fill="white" opacity=".85" />
      <rect x="9" y="21" width="11" height="2" rx="1" fill="white" opacity=".55" />
      {/* Coming-out card */}
      <rect x="23" y="21" width="13" height="9" rx="3" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1.5" />
      {/* Chip on card */}
      <rect x="27" y="24" width="5" height="3.5" rx="1" fill="#0b8f34" opacity=".3" />
      {/* Circle indicator */}
      <circle cx="33" cy="27.5" r="2" fill="#0b8f34" />
    </svg>
  );
}

function BinanceIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className}>
      <defs>
        <linearGradient id="bi" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f0b90b" />
          <stop offset="1" stopColor="#f7931a" />
        </linearGradient>
        <filter id="bs"><feDropShadow dx="0" dy="2" stdDeviation="2.5" floodOpacity=".2" /></filter>
      </defs>
      {/* Coin circle */}
      <circle cx="20" cy="20" r="16" fill="url(#bi)" filter="url(#bs)" />
      {/* Inner ring */}
      <circle cx="20" cy="20" r="11" fill="none" stroke="white" strokeWidth="1" opacity=".35" />
      {/* Dollar sign */}
      <text x="20" y="25" textAnchor="middle" fill="white" fontSize="16" fontWeight="800" fontFamily="system-ui" opacity=".95">$</text>
      {/* Top accent arc */}
      <path d="M8 12Q14 4 20 4Q26 4 32 12" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity=".45" />
      {/* Bottom accent arc */}
      <path d="M8 28Q14 36 20 36Q26 36 32 28" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity=".2" />
    </svg>
  );
}

function AdvancedIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className}>
      <defs>
        <linearGradient id="ai" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#596176" />
          <stop offset="1" stopColor="#2a3145" />
        </linearGradient>
        <filter id="as"><feDropShadow dx="0" dy="2" stdDeviation="2.5" floodOpacity=".12" /></filter>
      </defs>
      {/* Gear body */}
      <circle cx="20" cy="20" r="14" fill="url(#ai)" filter="url(#as)" />
      {/* Gear teeth */}
      <g stroke="white" strokeWidth="2" opacity=".8">
        <line x1="20" y1="4" x2="20" y2="7.5" strokeLinecap="round" />
        <line x1="20" y1="32.5" x2="20" y2="36" strokeLinecap="round" />
        <line x1="4" y1="20" x2="7.5" y2="20" strokeLinecap="round" />
        <line x1="32.5" y1="20" x2="36" y2="20" strokeLinecap="round" />
        <line x1="8.7" y1="8.7" x2="10.9" y2="10.9" strokeLinecap="round" />
        <line x1="29.1" y1="29.1" x2="31.3" y2="31.3" strokeLinecap="round" />
        <line x1="8.7" y1="31.3" x2="10.9" y2="29.1" strokeLinecap="round" />
        <line x1="29.1" y1="10.9" x2="31.3" y2="8.7" strokeLinecap="round" />
      </g>
      {/* Inner circle */}
      <circle cx="20" cy="20" r="8" fill="white" opacity=".15" />
      <circle cx="20" cy="20" r="5" fill="white" opacity=".3" />
    </svg>
  );
}

function ProvidersIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className}>
      <defs>
        <linearGradient id="pi" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#155cff" />
          <stop offset="1" stopColor="#f0b90b" />
        </linearGradient>
        <filter id="prs"><feDropShadow dx="0" dy="2" stdDeviation="2.5" floodOpacity=".15" /></filter>
      </defs>
      <circle cx="20" cy="20" r="16" fill="url(#pi)" filter="url(#prs)" />
      {/* Key shape */}
      <circle cx="20" cy="12" r="4" fill="white" opacity=".9" />
      <rect x="17" y="15" width="6" height="14" rx="2" fill="white" opacity=".85" />
      <path d="M18 20l3 3 4-5" stroke="#155cff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity=".9" fill="none" />
    </svg>
  );
}

const SECTION_ICONS: Record<string, ReactNode> = {
  general: <GeneralIcon className="h-12 w-12" />,
  wallet: <WalletsIcon className="h-12 w-12" />,
  binance: <BinanceIcon className="h-12 w-12" />,
  providers: <ProvidersIcon className="h-12 w-12" />,
  custom: <AdvancedIcon className="h-12 w-12" />,
};

// Grayscale sidebar icons — same SVGs but no color fill
const SIDEBAR_ICONS: Record<string, ReactNode> = {
  general: <GeneralIcon className="h-7 w-7 grayscale opacity-60" />,
  wallet: <WalletsIcon className="h-7 w-7 grayscale opacity-60" />,
  binance: <BinanceIcon className="h-7 w-7 grayscale opacity-60" />,
  providers: <ProvidersIcon className="h-7 w-7 grayscale opacity-60" />,
  custom: <AdvancedIcon className="h-7 w-7 grayscale opacity-60" />,
};

const navItems = [
  { label: "Overview", icon: LayoutDashboard, href: "/admin" },
  { label: "Users", icon: Users, href: "/admin/users" },
  { label: "Orders", icon: ShoppingBag, href: "/admin/orders" },
  { label: "Profit", icon: DollarSign, href: "/admin/profit" },
  { label: "Deposits", icon: DollarSign, href: "/admin/deposits" },
  { label: "Products", icon: Package, href: "/admin/products" },
  { label: "3rd Party Products", icon: ClipboardList, href: "/admin/third-party-products" },
  { label: "Inventory", icon: Boxes, href: "/admin/inventory" },
  { label: "Providers", icon: WalletCards, href: "/admin/providers" },
  { label: "Requests", icon: Headphones, href: "/admin/requests" },
  { label: "Support", icon: MessageSquare, href: "/admin/support" },
  { label: "Scammers", icon: ShieldAlert, href: "/admin/scammer-reports" },
  { label: "Audit Logs", icon: ClipboardList, href: "/admin/logs" },
  { label: "Referrals", icon: DollarSign, href: "/admin/referrals" },
  { label: "Site Customize", icon: PanelsTopLeft, href: "/admin/site-customize" },
  { label: "Settings", icon: Settings, href: "/admin/settings" },
] as const;

const PROVIDER_LIST = ["technysoft", "canboso", "akunding", "zoomstore", "ssondigital"] as const;
type ProviderName = (typeof PROVIDER_LIST)[number];

const routeTitles: Record<string, string> = {
  ...Object.fromEntries(navItems.map((item) => [item.href, item.label])),
  "/admin/pending-fulfillment": "Pending Fulfillment",
  "/admin/users/detail": "User Detail",
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[#dfe6ff] bg-white shadow-[12px_0_40px_rgba(12,37,104,0.06)] lg:flex">
      <div className="border-b border-[#e7ecff] px-5 py-5">
        <Link to="/admin" className="flex items-center gap-3">
          <img
            src="/brand/sasify-logo.jpg"
            alt="Sasify"
            width="44"
            height="44"
            decoding="async"
            className="h-11 w-11 rounded-2xl border border-[#dfe6ff] bg-white object-cover shadow-sm"
          />
          <span>
            <span className="block text-lg font-black tracking-tight text-[#050816]" style={{ fontFamily: "Space Grotesk" }}>SASIFY</span>
            <span className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#155cff]">Admin</span>
          </span>
        </Link>
        <div className="mt-5 rounded-2xl border border-[#dfe6ff] bg-[#f7f9ff] px-3 py-2 text-xs font-semibold text-[#596176]">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#0b8f34]" />
            Admin access active
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-2">
        {navItems.map((item) => {
          const isActive = item.href === "/admin" ? location.pathname === item.href : location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              to={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`tap-target flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-[linear-gradient(135deg,#075dff,#6d35ff)] text-white shadow-[0_12px_26px_rgba(21,92,255,0.22)]"
                  : "text-[#596176] hover:bg-[#eef3ff] hover:text-[#155cff]"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="p-4">
        <button
          onClick={logout}
          className="tap-target flex w-full items-center gap-3 rounded-2xl border border-[#ffd6df] bg-white px-3 py-2.5 text-sm font-bold text-[#d11f4a] hover:bg-[#fff0f4]"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

function MobileAdminNav() {
  const location = useLocation();

  return (
    <nav className="-mx-4 mt-4 overflow-x-auto border-y border-[#dfe6ff] bg-white/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:hidden" aria-label="Admin sections">
      <div className="flex min-w-max gap-2">
        {navItems.map((item) => {
          const isActive = item.href === "/admin" ? location.pathname === item.href : location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              to={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`tap-target inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition-colors ${
                isActive
                  ? "bg-[linear-gradient(135deg,#075dff,#6d35ff)] text-white shadow-[0_10px_24px_rgba(21,92,255,0.25)]"
                  : "bg-[#eef3ff] text-[#39415d] hover:text-[#155cff]"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Overview() {
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = trpc.admin.overview.useQuery();
  const { data: orders, isLoading: ordersLoading, error: ordersError, refetch: refetchOrders } = trpc.admin.orderList.useQuery();
  const { format } = useCurrency();
  const [refreshing, setRefreshing] = useState(false);

  const ordersList = useMemo(() => normalizeAdminOrders(orders), [orders]);
  const totalDirectRevenue = Number(stats?.totalSales || 0);
  const marketplaceRevenue = Number(stats?.totalMarketplaceRevenue || 0);
  const marketplaceCost = Number(stats?.totalMarketplaceCost || 0);
  const marketplaceProfit = Number(stats?.totalMarketplaceProfit || 0);
  const grossRevenue = totalDirectRevenue + marketplaceRevenue;
  const totalOrders = Number(stats?.totalOrders ?? ordersList.length);
  const marketplaceMargin = marketplaceRevenue > 0 ? (marketplaceProfit / marketplaceRevenue) * 100 : 0;
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const order of ordersList) {
      const status = String(order.status || "unknown");
      counts[status] = (counts[status] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [ordersList]);
  const maxStatusCount = Math.max(1, ...statusCounts.map(([, count]) => count));
  const chartData = useMemo(() => ((stats?.dailyTrend ?? []) as any[]).map((row) => ({
    label: new Date(`${row.date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    direct: Number(row.sales || 0),
    marketplace: Number(row.marketplace || 0),
    profit: Number(row.profit || 0),
  })), [stats?.dailyTrend]);
  const recentOrders = useMemo(() => ordersList.slice(0, 8).map((order: any) => ({
    ...order,
    amount: order.type === "marketplace" ? Number(order.priceUsd || 0) : Number(order.finalPrice || 0),
  })), [ordersList]);
  const queueItems = [
    { label: "Direct fulfillment", value: Number(stats?.pendingFulfillment || 0), note: "Awaiting inventory or manual delivery", href: "/admin/orders", tone: "border-[#cbd9ff] bg-[#f4f7ff] text-[#155cff]" },
    { label: "Marketplace queue", value: Number(stats?.pendingMarketplaceOrders || 0), note: "Provider purchase or reconciliation", href: "/admin/orders", tone: "border-[#e1d4ff] bg-[#f8f3ff] text-[#6d35ff]" },
    { label: "Deposit review", value: Number(stats?.pendingDeposits || 0), note: "Wallet credits awaiting decision", href: "/admin/deposits", tone: "border-[#ffe0a8] bg-[#fff9ea] text-[#9b6200]" },
    { label: "Support queue", value: Number(stats?.openTickets || 0), note: "Open or in-progress tickets", href: "/admin/support", tone: "border-[#ffc4d2] bg-[#fff5f7] text-[#b0163a]" },
    { label: "Provider review", value: Number(stats?.pendingProviders || 0), note: "Applications awaiting review", href: "/admin/providers", tone: "border-[#bde9ca] bg-[#f2fff5] text-[#0b8f34]" },
    { label: "Customer accounts", value: Number(stats?.activeUsers || 0), note: "Registered customer-role users", href: "/admin/users", tone: "border-[#d8ddea] bg-[#f7f8fb] text-[#596176]" },
  ];

  async function refreshOverview() {
    setRefreshing(true);
    try { await Promise.all([refetchStats(), refetchOrders()]); }
    finally { setRefreshing(false); }
  }
  function statusTone(status: string) {
    const value = status.toLowerCase();
    if (["delivered", "completed", "paid"].includes(value)) return "border-[#bde9ca] bg-[#edfff2] text-[#0b8f34]";
    if (["refunded", "failed", "cancelled", "rejected"].includes(value)) return "border-[#ffc4d2] bg-[#fff3f6] text-[#b0163a]";
    if (["pending_fulfillment", "payment_review", "pending", "processing"].includes(value)) return "border-[#ffe0a8] bg-[#fff8e8] text-[#9b6200]";
    return "border-[#d8ddea] bg-[#f4f6fa] text-[#596176]";
  }

  return (
    <div className="space-y-5">
      <section aria-label="Overview controls" className="flex flex-col gap-3 rounded-xl border border-[#dfe6ff] bg-white/85 px-4 py-3 shadow-[0_8px_24px_rgba(12,37,104,0.05)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-black text-[#050816]">Live operational snapshot</p><p className="mt-1 text-xs text-[#7c8498]">Revenue, fulfillment queues, stock, and customer activity from current platform data.</p></div>
        <button type="button" onClick={refreshOverview} disabled={refreshing} className="tap-target inline-flex items-center justify-center gap-2 rounded-lg border border-[#dfe6ff] bg-white px-4 py-2 text-xs font-bold text-[#596176] disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />{refreshing ? "Refreshing..." : "Refresh dashboard"}</button>
      </section>

      {(statsError || ordersError) && <div role="alert" className="rounded-xl border border-[#ffc4d2] bg-[#fff3f6] p-4 text-sm text-[#b0163a]">Some overview data could not be loaded. <button type="button" onClick={refreshOverview} className="font-black underline">Try again</button></div>}

      <section aria-label="Overview metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Gross revenue", value: format(grossRevenue), note: `${format(totalDirectRevenue)} direct · ${format(marketplaceRevenue)} marketplace`, icon: DollarSign, tone: "border-[#263861] bg-[linear-gradient(145deg,#18284e,#0a1128)] text-white shadow-[0_6px_0_#050816,0_14px_24px_rgba(10,17,40,0.18)]", valueTone: "text-white", noteTone: "text-white/55", labelTone: "text-white/60", iconTone: "border-white/15 bg-white/10 text-white" },
          { label: "Total orders", value: totalOrders.toLocaleString(), note: `${Number(stats?.marketplaceOrdersDelivered || 0)} marketplace delivered`, icon: ShoppingBag, tone: "border-[#cbd9ff] bg-[linear-gradient(145deg,#ffffff,#eef3ff)] shadow-[0_6px_0_#c7d5f8,0_14px_24px_rgba(21,92,255,0.08)]", valueTone: "text-[#155cff]", noteTone: "text-[#7c8498]", labelTone: "text-[#8992aa]", iconTone: "border-white bg-white/80 text-[#155cff]" },
          { label: "Marketplace profit", value: format(marketplaceProfit), note: `${marketplaceMargin.toFixed(1)}% margin · ${format(marketplaceCost)} cost`, icon: WalletCards, tone: "border-[#bde9ca] bg-[linear-gradient(145deg,#ffffff,#edfff2)] shadow-[0_6px_0_#bfe8ca,0_14px_24px_rgba(11,143,52,0.08)]", valueTone: marketplaceProfit >= 0 ? "text-[#0b8f34]" : "text-[#b0163a]", noteTone: "text-[#7c8498]", labelTone: "text-[#8992aa]", iconTone: "border-white bg-white/80 text-[#0b8f34]" },
          { label: "Available inventory", value: Number(stats?.totalInventory || 0).toLocaleString(), note: "Credential items ready to deliver", icon: Boxes, tone: "border-[#ffe0a8] bg-[linear-gradient(145deg,#fffdf7,#fff6df)] shadow-[0_6px_0_#f2ddb9,0_14px_24px_rgba(184,120,0,0.08)]", valueTone: "text-[#9b6200]", noteTone: "text-[#7c8498]", labelTone: "text-[#8992aa]", iconTone: "border-white bg-white/80 text-[#9b6200]" },
        ].map((metric) => <article key={metric.label} className={`rounded-xl border p-4 ${metric.tone}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className={`text-[10px] font-bold uppercase tracking-[0.1em] ${metric.labelTone}`}>{metric.label}</p><p className={`mt-3 text-xl font-black leading-tight tabular-nums sm:text-2xl ${metric.valueTone}`}>{statsLoading ? "—" : metric.value}</p><p className={`mt-1 text-[11px] leading-4 ${metric.noteTone}`}>{metric.note}</p></div><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-sm ${metric.iconTone}`}><metric.icon className="h-4 w-4" /></span></div></article>)}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
        <article className="rounded-xl border border-[#dfe6ff] bg-white p-4 shadow-[0_12px_30px_rgba(12,37,104,0.06)] sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-sm font-black text-[#050816]">7-day financial activity</h2><p className="mt-1 text-xs text-[#7c8498]">Real direct revenue, marketplace revenue, and tracked marketplace profit.</p></div><div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-wide text-[#7c8498]"><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#155cff]" />Direct</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#6d35ff]" />Marketplace</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#0b8f34]" />Profit</span></div></div>
          <div className="mt-5 h-[270px] w-full" data-chart="financial-activity">
            {statsLoading ? <div className="h-full animate-pulse rounded-xl bg-[#f3f6ff]" /> : chartData.length > 0 ? <ResponsiveContainer width="100%" height="100%"><ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}><CartesianGrid stroke="#edf0fa" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fill: "#7c8498", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#9aa3b8", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => format(Number(value))} width={74} /><Tooltip formatter={(value: any, name: any) => [format(Number(value)), name === "direct" ? "Direct revenue" : name === "marketplace" ? "Marketplace revenue" : "Marketplace profit"]} contentStyle={{ borderRadius: 12, border: "1px solid #dfe6ff", boxShadow: "0 12px 30px rgba(12,37,104,.12)", fontSize: 12 }} /><Bar dataKey="direct" stackId="revenue" fill="#155cff" radius={[0,0,4,4]} maxBarSize={34} /><Bar dataKey="marketplace" stackId="revenue" fill="#6d35ff" radius={[4,4,0,0]} maxBarSize={34} /><Line type="monotone" dataKey="profit" stroke="#0b8f34" strokeWidth={2.5} dot={{ r: 3, fill: "#0b8f34", strokeWidth: 0 }} activeDot={{ r: 5 }} /></ComposedChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-[#7c8498]">No financial activity in the last seven days.</div>}
          </div>
        </article>

        <article className="rounded-xl border border-[#dfe6ff] bg-white p-4 shadow-[0_12px_30px_rgba(12,37,104,0.06)] sm:p-5"><h2 className="text-sm font-black text-[#050816]">Unified order status</h2><p className="mt-1 text-xs text-[#7c8498]">Direct and marketplace orders in one distribution.</p><div className="mt-5 space-y-3">{ordersLoading ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-9 animate-pulse rounded-lg bg-[#f3f6ff]" />) : statusCounts.length > 0 ? statusCounts.slice(0, 8).map(([status, count]) => <div key={status}><div className="flex items-center justify-between gap-3 text-xs"><span className="font-semibold capitalize text-[#596176]">{status.replace(/_/g, " ")}</span><span className="font-black tabular-nums text-[#050816]">{count}</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#edf1fb]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#155cff,#6d35ff)]" style={{ width: `${Math.max(5, (count / maxStatusCount) * 100)}%` }} /></div></div>) : <p className="py-12 text-center text-sm text-[#7c8498]">No order data yet.</p>}</div></article>
      </section>

      <section className="rounded-xl border border-[#dfe6ff] bg-white p-4 shadow-[0_10px_28px_rgba(12,37,104,0.05)] sm:p-5"><div><h2 className="text-sm font-black text-[#050816]">Operational queues</h2><p className="mt-1 text-xs text-[#7c8498]">Open work and platform capacity. Counts link directly to their operating workspace.</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{queueItems.map((item) => <Link key={item.label} to={item.href} className={`group rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${item.tone}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-[#050816]">{item.label}</p><p className="mt-1 text-[11px] leading-4 text-[#7c8498]">{item.note}</p></div><span className="text-2xl font-black tabular-nums">{statsLoading ? "—" : item.value}</span></div><p className="mt-3 text-[10px] font-black uppercase tracking-wide opacity-75">Open workspace →</p></Link>)}</div></section>

      <section className="overflow-hidden rounded-xl border border-[#dfe6ff] bg-white shadow-[0_10px_28px_rgba(12,37,104,0.05)]"><div className="flex flex-col gap-2 border-b border-[#e8edff] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><h2 className="text-sm font-black text-[#050816]">Recent order activity</h2><p className="mt-1 text-xs text-[#7c8498]">Latest direct and marketplace purchases with correctly normalized amounts.</p></div><Link to="/admin/orders" className="rounded-lg bg-[#0a1128] px-3 py-2 text-center text-xs font-bold text-white">Open all orders</Link></div><div className="overflow-x-auto"><table className="w-full min-w-[60rem] text-left"><thead className="bg-[#f8faff] text-[10px] font-bold uppercase tracking-[0.1em] text-[#7c8498]"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Channel</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Created</th></tr></thead><tbody className="divide-y divide-[#edf0fa] text-xs">{ordersLoading ? Array.from({ length: 5 }).map((_, index) => <tr key={index}><td colSpan={6} className="px-4 py-3"><div className="h-9 animate-pulse rounded-lg bg-[#f2f5fd]" /></td></tr>) : recentOrders.map((order: any) => <tr key={`${order.type}-${order.id}`} className="hover:bg-[#fbfcff]"><td className="px-4 py-3"><p className="font-bold text-[#050816]">{order.orderNumber || `#${order.id}`}</p><p className="mt-1 text-[11px] text-[#7c8498]">{order.productName || "Product"}{order.planName ? ` · ${order.planName}` : ""}</p></td><td className="px-4 py-3"><p className="font-semibold text-[#050816]">{order.userName || order.guestName || "Customer"}</p><p className="mt-1 text-[11px] text-[#7c8498]">{order.userEmail || order.guestEmail || "No email"}</p></td><td className="px-4 py-3"><span className="rounded-full border border-[#dfe6ff] bg-[#f6f8ff] px-2 py-1 text-[10px] font-black uppercase text-[#596176]">{order.type === "marketplace" ? "Marketplace" : "Direct"}</span></td><td className="px-4 py-3"><span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusTone(String(order.status || "unknown"))}`}>{String(order.status || "unknown").replace(/_/g, " ")}</span></td><td className="px-4 py-3 font-black tabular-nums text-[#050816]">{format(order.amount)}</td><td className="px-4 py-3 text-[#596176]">{order.createdAt ? formatDate(order.createdAt) : "—"}</td></tr>)}{!ordersLoading && recentOrders.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-[#7c8498]">No order activity yet.</td></tr>}</tbody></table></div><div className="border-t border-[#e8edff] px-4 py-3 text-xs text-[#7c8498]">Showing {recentOrders.length} most recent orders</div></section>
    </div>
  );
}

function UsersPage() {
  const { data: users, isLoading, error } = trpc.admin.userList.useQuery();
  const { format } = useCurrency();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");
  const [walletFilter, setWalletFilter] = useState<"all" | "funded" | "zero">("all");

  const userRows = useMemo(() => (users ?? []) as any[], [users]);
  const metrics = useMemo(() => ({
    total: userRows.length,
    customers: userRows.filter((user) => user.role !== "admin").length,
    admins: userRows.filter((user) => user.role === "admin").length,
    funded: userRows.filter((user) => Number(user.walletBalance || 0) > 0).length,
    walletValue: userRows.reduce((sum, user) => sum + Number(user.walletBalance || 0), 0),
  }), [userRows]);
  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return userRows.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      const funded = Number(user.walletBalance || 0) > 0;
      if (walletFilter === "funded" && !funded) return false;
      if (walletFilter === "zero" && funded) return false;
      if (!query) return true;
      return [user.id, user.name, user.email, user.role].some((value) => String(value ?? "").toLowerCase().includes(query));
    });
  }, [userRows, roleFilter, walletFilter, search]);
  const refreshUsers = () => utils.admin.userList.invalidate();

  return (
    <div className="space-y-4">
      <section aria-label="User metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Total accounts", value: metrics.total, note: `${metrics.customers} customer accounts`, icon: Users, tone: "border-[#263861] bg-[linear-gradient(145deg,#18284e,#0a1128)] text-white shadow-[0_6px_0_#050816,0_14px_24px_rgba(10,17,40,0.18)]" },
          { label: "Wallet balance", value: format(metrics.walletValue), note: "Across listed accounts", icon: WalletCards, tone: "border-[#bde9ca] bg-[linear-gradient(145deg,#f8fff9,#eafff0)] shadow-[0_6px_0_#b9e5c5,0_14px_24px_rgba(11,143,52,0.09)]" },
          { label: "Funded wallets", value: metrics.funded, note: "Balance above zero", icon: DollarSign, tone: "border-[#d6e1ff] bg-[linear-gradient(145deg,#ffffff,#eef3ff)] shadow-[0_6px_0_#ccd9fb,0_14px_24px_rgba(21,92,255,0.08)]" },
          { label: "Admin accounts", value: metrics.admins, note: "Privileged users", icon: ShieldAlert, tone: "border-[#ffdfad] bg-[linear-gradient(145deg,#fffdf7,#fff5df)] shadow-[0_6px_0_#f5dfb9,0_14px_24px_rgba(184,120,0,0.09)]" },
        ].map((item) => <article key={item.label} className={`rounded-xl border p-4 ${item.tone}`}><div className="flex items-start justify-between gap-3"><div><p className={`text-[10px] font-bold uppercase tracking-[0.1em] ${item.label === "Total accounts" ? "text-white/60" : "text-[#8992aa]"}`}>{item.label}</p><p className={`mt-3 text-2xl font-black tabular-nums ${item.label === "Total accounts" ? "text-white" : item.label === "Wallet balance" ? "text-[#0b8f34]" : "text-[#0a1128]"}`}>{item.value}</p><p className={`mt-1 text-[11px] ${item.label === "Total accounts" ? "text-white/50" : "text-[#7c8498]"}`}>{item.note}</p></div><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${item.label === "Total accounts" ? "border-white/15 bg-white/10 text-white" : "border-white bg-white/80 text-[#155cff] shadow-sm"}`}><item.icon className="h-4 w-4" /></span></div></article>)}
      </section>

      <section className="overflow-hidden rounded-xl border border-[#dfe6ff] bg-white shadow-[0_10px_30px_rgba(12,37,104,0.06)]">
        <div className="border-b border-[#e7ecff] p-4">
          <div className="flex flex-col gap-2 md:flex-row">
            <label className="relative min-w-0 flex-1"><span className="sr-only">Search users</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8992aa]" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, user ID, or role" className="h-10 w-full rounded-lg border border-[#dfe6ff] bg-[#f8faff] pl-9 pr-3 text-sm text-[#0a1128] outline-none placeholder:text-[#9aa0b4] focus:border-[#155cff] focus:bg-white" /></label>
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as any)} className="h-10 rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs font-semibold text-[#596176] outline-none focus:border-[#155cff] md:w-40"><option value="all">All roles</option><option value="user">Customers</option><option value="admin">Admins</option></select>
            <select value={walletFilter} onChange={(event) => setWalletFilter(event.target.value as any)} className="h-10 rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs font-semibold text-[#596176] outline-none focus:border-[#155cff] md:w-44"><option value="all">All wallet states</option><option value="funded">Funded wallets</option><option value="zero">Zero balance</option></select>
            <button type="button" onClick={refreshUsers} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs font-bold text-[#596176] hover:bg-[#f8faff]"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[62rem] text-left">
            <thead className="bg-[#f8faff] text-[10px] font-bold uppercase tracking-[0.1em] text-[#7c8498]"><tr><th className="px-4 py-3">Account</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Wallet</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3">Wallet state</th><th className="px-4 py-3 text-right">Profile</th></tr></thead>
            <tbody className="divide-y divide-[#e7ecff]">
              {isLoading && Array.from({ length: 5 }).map((_, index) => <tr key={index}><td colSpan={7} className="px-4 py-3"><div className="h-11 animate-pulse rounded-lg bg-[#f0f3ff]" /></td></tr>)}
              {!isLoading && error && <tr><td colSpan={7} className="px-4 py-12 text-center"><p className="text-sm font-bold text-[#d11f4a]">Users could not be loaded.</p><button type="button" onClick={refreshUsers} className="mt-2 text-xs font-bold text-[#155cff]">Try again</button></td></tr>}
              {!isLoading && !error && visibleUsers.map((user) => {
                const initial = String(user.name || user.email || "U").trim().charAt(0).toUpperCase();
                const funded = Number(user.walletBalance || 0) > 0;
                return <tr key={user.id} className="text-[#596176] hover:bg-[#fbfcff]">
                  <td className="px-4 py-3 align-top"><div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(145deg,#155cff,#6d35ff)] text-xs font-black text-white shadow-[0_3px_0_#3944bf]">{initial}</span><div className="min-w-0"><Link to={`/admin/users/detail?id=${user.id}`} className="block max-w-[12rem] truncate text-xs font-bold text-[#0a1128] hover:text-[#155cff]">{user.name || "Unnamed user"}</Link><p className="mt-1 font-mono text-[10px] text-[#8992aa]">User #{user.id}</p></div></div></td>
                  <td className="px-4 py-3 align-top"><p className="max-w-[14rem] truncate text-xs font-semibold text-[#0a1128]">{user.email || "No email"}</p><p className="mt-1 text-[10px] text-[#8992aa]">Primary account contact</p></td>
                  <td className="px-4 py-3 align-top"><span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${user.role === "admin" ? "border-[#eadfb8] bg-[#fffaf0] text-[#9b6200]" : "border-[#d6e1ff] bg-[#f5f8ff] text-[#155cff]"}`}>{user.role || "user"}</span></td>
                  <td className="px-4 py-3 align-top"><p className={`text-xs font-black tabular-nums ${funded ? "text-[#0b8f34]" : "text-[#0a1128]"}`}>{format(Number(user.walletBalance || 0))}</p></td>
                  <td className="px-4 py-3 align-top text-[11px] text-[#7c8498]">{user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Not recorded"}</td>
                  <td className="px-4 py-3 align-top"><span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${funded ? "text-[#0b8f34]" : "text-[#7c8498]"}`}><i className={`h-2 w-2 rounded-full ${funded ? "bg-[#0b8f34]" : "bg-[#b9bfd0]"}`} />{funded ? "Funded" : "Zero balance"}</span></td>
                  <td className="px-4 py-3 text-right align-top"><Link to={`/admin/users/detail?id=${user.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dfe6ff] bg-white px-2.5 text-xs font-bold text-[#155cff] hover:bg-[#f4f6ff]"><Eye className="h-3.5 w-3.5" /> View profile</Link></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        {!isLoading && !error && visibleUsers.length === 0 && <div className="border-t border-[#e7ecff] px-4 py-12 text-center"><p className="text-sm font-bold text-[#0a1128]">No matching users</p><p className="mt-1 text-xs text-[#8992aa]">Change the role, wallet state, or search query.</p></div>}
        {!isLoading && !error && visibleUsers.length > 0 && <div className="border-t border-[#e7ecff] bg-[#fbfcff] px-4 py-2.5 text-[11px] text-[#7c8498]">Showing <span className="font-bold text-[#0a1128]">{visibleUsers.length}</span> of {userRows.length} accounts</div>}
      </section>
    </div>
  );
}

function DepositsPage() {
  const { data: deposits, isLoading, error } = trpc.admin.depositList.useQuery();
  const { format } = useCurrency();
  const utils = trpc.useUtils();
  const [activeView, setActiveView] = useState<"all" | "attention" | "approved" | "rejected">("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedDeposit, setSelectedDeposit] = useState<any | null>(null);
  const [actionMode, setActionMode] = useState<"approve" | "reject" | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [paymentVerified, setPaymentVerified] = useState(false);

  const depositRows = useMemo(() => (deposits ?? []) as any[], [deposits]);
  const actionable = (deposit: any) => ["pending", "needs_review"].includes(String(deposit.status));
  const metrics = useMemo(() => {
    const approvedRows = depositRows.filter((deposit) => deposit.status === "approved");
    return {
      total: depositRows.length,
      attention: depositRows.filter(actionable).length,
      approved: approvedRows.length,
      approvedValue: approvedRows.reduce((sum, deposit) => sum + Number(deposit.amount || 0), 0),
      methods: new Set(depositRows.map((deposit) => deposit.method).filter(Boolean)).size,
    };
  }, [depositRows]);
  const methods = useMemo(() => Array.from(new Set(depositRows.map((deposit) => String(deposit.method || "")).filter(Boolean))).sort(), [depositRows]);
  const visibleDeposits = useMemo(() => {
    const query = search.trim().toLowerCase();
    return depositRows.filter((deposit) => {
      if (activeView === "attention" && !actionable(deposit)) return false;
      if (activeView === "approved" && deposit.status !== "approved") return false;
      if (activeView === "rejected" && deposit.status !== "rejected") return false;
      if (methodFilter !== "all" && deposit.method !== methodFilter) return false;
      if (!query) return true;
      return [deposit.id, deposit.txid, deposit.userName, deposit.userEmail, deposit.method, deposit.submittedAmount, deposit.amount]
        .some((value) => String(value ?? "").toLowerCase().includes(query));
    });
  }, [depositRows, activeView, methodFilter, search]);

  const resetReview = () => {
    setSelectedDeposit(null);
    setActionMode(null);
    setAdminNote("");
    setRejectionReason("");
    setPaymentVerified(false);
  };
  const refreshDeposits = () => {
    utils.admin.depositList.invalidate();
    utils.admin.overview.invalidate();
  };
  const approveMutation = trpc.admin.depositApprove.useMutation({
    onSuccess: () => { toast.success("Deposit approved and wallet credited"); resetReview(); refreshDeposits(); },
    onError: (e) => toast.error(e.message),
  });
  const rejectMutation = trpc.admin.depositReject.useMutation({
    onSuccess: () => { toast.success("Deposit rejected"); resetReview(); refreshDeposits(); },
    onError: (e) => toast.error(e.message),
  });

  function openDeposit(deposit: any) {
    setSelectedDeposit(deposit);
    setActionMode(null);
    setAdminNote(deposit.adminNote || "");
    setRejectionReason("");
    setPaymentVerified(false);
  }
  function submittedAmount(deposit: any) {
    if (!deposit.submittedAmount || !deposit.submittedCurrency) return "Not recorded";
    return deposit.submittedCurrency === "PKR"
      ? `Rs ${Number(deposit.submittedAmount).toLocaleString("en-PK")}`
      : `$${Number(deposit.submittedAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  function statusClass(status: string) {
    if (status === "approved") return "border-[#bde9ca] bg-[#f2fcf5] text-[#0b8f34]";
    if (status === "rejected") return "border-[#f2c6d1] bg-[#fff7f9] text-[#d11f4a]";
    if (status === "needs_review") return "border-[#eadfb8] bg-[#fffaf0] text-[#9b6200]";
    return "border-[#d6e1ff] bg-[#f5f8ff] text-[#155cff]";
  }
  const reviewBusy = approveMutation.isPending || rejectMutation.isPending;
  const viewTabs = [
    { id: "all", label: "All", count: metrics.total },
    { id: "attention", label: "Needs review", count: metrics.attention },
    { id: "approved", label: "Approved", count: metrics.approved },
    { id: "rejected", label: "Rejected", count: depositRows.filter((deposit) => deposit.status === "rejected").length },
  ] as const;

  return (
    <div className="space-y-4">
      <section aria-label="Deposit metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Needs review", value: metrics.attention, note: "Wallet credit pending", icon: ClipboardList, tone: "border-[#ffdfad] bg-[linear-gradient(145deg,#fffdf7,#fff5df)] shadow-[0_6px_0_#f5dfb9,0_14px_24px_rgba(184,120,0,0.09)]", valueTone: metrics.attention > 0 ? "text-[#b56f00]" : "text-[#0b8f34]" },
          { label: "Approved value", value: format(metrics.approvedValue), note: "Verified wallet credits", icon: WalletCards, tone: "border-[#bde9ca] bg-[linear-gradient(145deg,#f8fff9,#eafff0)] shadow-[0_6px_0_#b9e5c5,0_14px_24px_rgba(11,143,52,0.09)]", valueTone: "text-[#0b8f34]" },
          { label: "Approved", value: metrics.approved, note: `${metrics.total} total submissions`, icon: CheckCircle, tone: "border-[#d6e1ff] bg-[linear-gradient(145deg,#ffffff,#eef3ff)] shadow-[0_6px_0_#ccd9fb,0_14px_24px_rgba(21,92,255,0.08)]", valueTone: "text-[#155cff]" },
          { label: "Payment channels", value: metrics.methods, note: "Used in current records", icon: DollarSign, tone: "border-[#263861] bg-[linear-gradient(145deg,#18284e,#0a1128)] text-white shadow-[0_6px_0_#050816,0_14px_24px_rgba(10,17,40,0.18)]", valueTone: "text-white" },
        ].map((item) => (
          <article key={item.label} className={`relative overflow-hidden rounded-xl border p-4 ${item.tone}`}>
            <div className="flex items-start justify-between gap-3">
              <div><p className={`text-[10px] font-bold uppercase tracking-[0.1em] ${item.label === "Payment channels" ? "text-white/60" : "text-[#8992aa]"}`}>{item.label}</p><p className={`mt-3 text-2xl font-black tabular-nums ${item.valueTone}`}>{item.value}</p><p className={`mt-1 text-[11px] ${item.label === "Payment channels" ? "text-white/50" : "text-[#7c8498]"}`}>{item.note}</p></div>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${item.label === "Payment channels" ? "border-white/15 bg-white/10 text-white" : "border-white bg-white/80 text-[#155cff] shadow-sm"}`}><item.icon className="h-4 w-4" /></span>
            </div>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-[#dfe6ff] bg-white shadow-[0_10px_30px_rgba(12,37,104,0.06)]">
        <div className="border-b border-[#e7ecff] p-4">
          <div className="flex gap-1 overflow-x-auto pb-3" role="tablist" aria-label="Deposit views">
            {viewTabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activeView === tab.id} onClick={() => setActiveView(tab.id)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${activeView === tab.id ? "bg-[#0a1128] text-white" : "text-[#596176] hover:bg-[#f4f6ff]"}`}>{tab.label} <span className={`ml-1 tabular-nums ${activeView === tab.id ? "text-white/65" : "text-[#9aa0b4]"}`}>{tab.count}</span></button>)}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 flex-1"><span className="sr-only">Search deposits</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8992aa]" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transaction, customer, email, amount" className="h-10 w-full rounded-lg border border-[#dfe6ff] bg-[#f8faff] pl-9 pr-3 text-sm text-[#0a1128] outline-none placeholder:text-[#9aa0b4] focus:border-[#155cff] focus:bg-white" /></label>
            <select value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)} className="h-10 rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs font-semibold capitalize text-[#596176] outline-none focus:border-[#155cff] sm:w-48"><option value="all">All payment methods</option>{methods.map((method) => <option key={method} value={method}>{method.replaceAll("_", " ")}</option>)}</select>
            <button type="button" onClick={refreshDeposits} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs font-bold text-[#596176] hover:bg-[#f8faff]"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[68rem] text-left">
            <thead className="bg-[#f8faff] text-[10px] font-bold uppercase tracking-[0.1em] text-[#7c8498]"><tr><th className="px-4 py-3">Deposit</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Transaction</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th><th className="px-4 py-3 text-right">Review</th></tr></thead>
            <tbody className="divide-y divide-[#e7ecff]">
              {isLoading && Array.from({ length: 4 }).map((_, index) => <tr key={index}><td colSpan={8} className="px-4 py-3"><div className="h-10 animate-pulse rounded-lg bg-[#f0f3ff]" /></td></tr>)}
              {!isLoading && error && <tr><td colSpan={8} className="px-4 py-12 text-center"><p className="text-sm font-bold text-[#d11f4a]">Deposits could not be loaded.</p><button type="button" onClick={refreshDeposits} className="mt-2 text-xs font-bold text-[#155cff]">Try again</button></td></tr>}
              {!isLoading && !error && visibleDeposits.map((deposit) => (
                <tr key={deposit.id} className="text-[#596176] hover:bg-[#fbfcff]">
                  <td className="px-4 py-3 align-top"><button type="button" onClick={() => openDeposit(deposit)} className="font-mono text-xs font-bold text-[#0a1128] hover:text-[#155cff]">#{deposit.id}</button><p className="mt-1 text-[10px] uppercase tracking-wide text-[#8992aa]">Wallet deposit</p></td>
                  <td className="px-4 py-3 align-top"><p className="max-w-[12rem] truncate text-xs font-semibold text-[#0a1128]">{deposit.userName || "Customer"}</p><p className="mt-1 max-w-[12rem] truncate text-[11px] text-[#8992aa]">{deposit.userEmail || "No email"}</p></td>
                  <td className="px-4 py-3 align-top"><p className="text-xs font-black tabular-nums text-[#0a1128]">{format(deposit.amount)}</p><p className="mt-1 text-[11px] capitalize text-[#8992aa]">{String(deposit.method || "Unknown").replaceAll("_", " ")}</p></td>
                  <td className="px-4 py-3 align-top"><p className="max-w-[11rem] truncate font-mono text-[11px] font-semibold text-[#596176]">{deposit.txid || "Not provided"}</p><p className={`mt-1 text-[10px] font-bold ${deposit.screenshotUrl ? "text-[#0b8f34]" : "text-[#d11f4a]"}`}>{deposit.screenshotUrl ? "Proof attached" : "No proof"}</p></td>
                  <td className="px-4 py-3 align-top"><p className="text-xs font-semibold tabular-nums text-[#0a1128]">{submittedAmount(deposit)}</p>{deposit.conversionRate && <p className="mt-1 text-[10px] text-[#8992aa]">Rate {Number(deposit.conversionRate).toLocaleString()}</p>}</td>
                  <td className="px-4 py-3 align-top"><span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClass(String(deposit.status))}`}>{String(deposit.status).replaceAll("_", " ")}</span>{actionable(deposit) && <p className="mt-1 text-[10px] font-semibold text-[#b56f00]">Operator review</p>}</td>
                  <td className="px-4 py-3 align-top text-[11px] text-[#7c8498]">{deposit.createdAt ? new Date(deposit.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  <td className="px-4 py-3 text-right align-top"><button type="button" onClick={() => openDeposit(deposit)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dfe6ff] bg-white px-2.5 text-xs font-bold text-[#155cff] hover:bg-[#f4f6ff]"><Eye className="h-3.5 w-3.5" /> Review</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isLoading && !error && visibleDeposits.length === 0 && <div className="border-t border-[#e7ecff] px-4 py-12 text-center"><p className="text-sm font-bold text-[#0a1128]">No matching deposits</p><p className="mt-1 text-xs text-[#8992aa]">Change the status view, payment method, or search query.</p></div>}
        {!isLoading && !error && visibleDeposits.length > 0 && <div className="border-t border-[#e7ecff] bg-[#fbfcff] px-4 py-2.5 text-[11px] text-[#7c8498]">Showing <span className="font-bold text-[#0a1128]">{visibleDeposits.length}</span> of {depositRows.length} deposits</div>}
      </section>

      {selectedDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050816]/55 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="deposit-review-title" onClick={resetReview}>
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#e7ecff] bg-white px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8992aa]">Wallet deposit review</p><h2 id="deposit-review-title" className="mt-1 text-lg font-bold text-[#0a1128]">Deposit #{selectedDeposit.id}</h2></div><button type="button" onClick={resetReview} className="rounded-lg border border-[#dfe6ff] p-2 text-[#596176] hover:bg-[#f4f6ff]" aria-label="Close deposit review"><XCircle className="h-4 w-4" /></button></div>
            <div className="space-y-5 p-5">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[["Wallet credit", format(selectedDeposit.amount)], ["Customer submitted", submittedAmount(selectedDeposit)], ["Payment method", String(selectedDeposit.method || "Unknown").replaceAll("_", " ")], ["Status", String(selectedDeposit.status).replaceAll("_", " ")]].map(([label, value]) => <div key={label} className="rounded-lg border border-[#dfe6ff] bg-[#f8faff] p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[#8992aa]">{label}</p><p className="mt-1 break-words text-xs font-bold capitalize text-[#0a1128]">{value}</p></div>)}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-lg border border-[#dfe6ff] p-4"><h3 className="text-xs font-bold text-[#0a1128]">Payment evidence</h3>{selectedDeposit.screenshotUrl ? <a href={selectedDeposit.screenshotUrl} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-lg border border-[#dfe6ff] bg-[#f8faff]"><img src={selectedDeposit.screenshotUrl} alt={`Payment proof for deposit ${selectedDeposit.id}`} className="max-h-[330px] w-full object-contain" /><span className="block border-t border-[#dfe6ff] px-3 py-2 text-xs font-bold text-[#155cff]">Open original payment proof</span></a> : <div className="mt-3 rounded-lg border border-dashed border-[#f2c6d1] bg-[#fff7f9] p-8 text-center text-xs font-semibold text-[#d11f4a]">No payment proof was uploaded.</div>}</section>
                <section className="rounded-lg border border-[#dfe6ff] p-4"><h3 className="text-xs font-bold text-[#0a1128]">Reconciliation details</h3><dl className="mt-3 space-y-3 text-xs">{[["Customer", selectedDeposit.userName || "Customer"], ["Email", selectedDeposit.userEmail || "Not recorded"], ["Transaction ID", selectedDeposit.txid || "Not provided"], ["Conversion rate", selectedDeposit.conversionRate ? Number(selectedDeposit.conversionRate).toLocaleString() : "Not recorded"], ["Submitted", selectedDeposit.createdAt ? new Date(selectedDeposit.createdAt).toLocaleString() : "Not recorded"], ["Verified", selectedDeposit.verifiedAt ? new Date(selectedDeposit.verifiedAt).toLocaleString() : "Not verified"]].map(([label, value]) => <div key={label} className="flex justify-between gap-4 border-b border-[#f0f3ff] pb-2 last:border-0"><dt className="text-[#8992aa]">{label}</dt><dd className="max-w-[65%] break-all text-right font-semibold text-[#0a1128]">{value}</dd></div>)}</dl>{selectedDeposit.adminNote && <div className="mt-4 rounded-lg bg-[#f8faff] p-3 text-xs text-[#596176]"><p className="font-bold text-[#0a1128]">Admin note</p><p className="mt-1">{selectedDeposit.adminNote}</p></div>}{selectedDeposit.rejectionReason && <div className="mt-4 rounded-lg bg-[#fff7f9] p-3 text-xs text-[#d11f4a]"><p className="font-bold">Rejection reason</p><p className="mt-1">{selectedDeposit.rejectionReason}</p></div>}</section>
              </div>
              {actionable(selectedDeposit) ? (
                <section className="rounded-lg border border-[#eadfb8] bg-[#fffaf0] p-4">
                  <div><h3 className="text-xs font-bold text-[#0a1128]">Operator decision</h3><p className="mt-1 text-[11px] leading-5 text-[#7c8498]">Approval immediately credits the customer wallet. Match the amount, transaction ID, payment account, and proof before continuing.</p></div>
                  {!actionMode && <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setActionMode("approve")} className="rounded-lg bg-[#0b8f34] px-4 py-2.5 text-xs font-bold text-white"><CheckCircle className="mr-1.5 inline h-3.5 w-3.5" />Review approval</button><button type="button" onClick={() => setActionMode("reject")} className="rounded-lg border border-[#f2c6d1] bg-white px-4 py-2.5 text-xs font-bold text-[#d11f4a]"><XCircle className="mr-1.5 inline h-3.5 w-3.5" />Reject deposit</button></div>}
                  {actionMode === "approve" && <div className="mt-4 space-y-3 rounded-lg border border-[#bde9ca] bg-white p-4"><label className="block"><span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8498]">Internal approval note (optional)</span><textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} rows={3} placeholder="Verification reference or reconciliation note" className="mt-2 w-full rounded-lg border border-[#dfe6ff] p-3 text-xs text-[#0a1128] outline-none focus:border-[#155cff]" /></label><label className="flex cursor-pointer items-start gap-3 rounded-lg bg-[#f2fcf5] p-3 text-xs text-[#0a1128]"><input type="checkbox" checked={paymentVerified} onChange={(event) => setPaymentVerified(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0b8f34]" /><span>I verified the payment proof, transaction reference, and credited amount. I understand this action updates the wallet ledger.</span></label><div className="flex flex-wrap gap-2"><button type="button" onClick={() => approveMutation.mutate({ id: selectedDeposit.id, adminNote: adminNote.trim() || undefined })} disabled={!paymentVerified || reviewBusy} className="rounded-lg bg-[#0b8f34] px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{approveMutation.isPending ? "Crediting wallet..." : `Confirm & credit ${format(selectedDeposit.amount)}`}</button><button type="button" onClick={() => { setActionMode(null); setPaymentVerified(false); }} className="rounded-lg border border-[#dfe6ff] bg-white px-4 py-2.5 text-xs font-bold text-[#596176]">Cancel</button></div></div>}
                  {actionMode === "reject" && <form className="mt-4 space-y-3 rounded-lg border border-[#f2c6d1] bg-white p-4" onSubmit={(event) => { event.preventDefault(); const reason = rejectionReason.trim(); if (!reason) { toast.error("Add a rejection reason"); return; } rejectMutation.mutate({ id: selectedDeposit.id, rejectionReason: reason }); }}><label className="block"><span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8498]">Required rejection reason</span><textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} rows={3} placeholder="Explain why this payment cannot be verified" className="mt-2 w-full rounded-lg border border-[#dfe6ff] p-3 text-xs text-[#0a1128] outline-none focus:border-[#d11f4a]" /></label><div className="flex gap-2"><button type="submit" disabled={!rejectionReason.trim() || reviewBusy} className="rounded-lg bg-[#d11f4a] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">{rejectMutation.isPending ? "Rejecting..." : "Confirm rejection"}</button><button type="button" onClick={() => { setActionMode(null); setRejectionReason(""); }} className="rounded-lg border border-[#dfe6ff] px-4 py-2.5 text-xs font-bold text-[#596176]">Cancel</button></div></form>}
                </section>
              ) : <div className="rounded-lg border border-[#dfe6ff] bg-[#fbfcff] p-4 text-xs text-[#7c8498]">This deposit is finalized. No operator action is available.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersAdminPage({ pendingOnly = false }: { pendingOnly?: boolean }) {
  const { data: orders, isLoading, error } = trpc.admin.orderList.useQuery();
  const { format } = useCurrency();
  const utils = trpc.useUtils();
  const [activeView, setActiveView] = useState<"all" | "attention" | "direct" | "marketplace" | "delivered">(pendingOnly ? "attention" : "all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [deliveryItems, setDeliveryItems] = useState("");
  const [revealedDeliveryItems, setRevealedDeliveryItems] = useState<any[] | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const orderRows = useMemo(() => normalizeAdminOrders(orders), [orders]);

  const needsAttention = (order: any) =>
    ["payment_review", "pending_fulfillment", "failed"].includes(String(order.status)) ||
    String(order.deliveryStatus) === "pending_fulfillment" ||
    String(order.reconciliationStatus) === "needs_review";

  const metrics = useMemo(() => {
    const activeRevenue = orderRows
      .filter((order: any) => !["refunded", "cancelled", "failed"].includes(String(order.status)))
      .reduce((sum: number, order: any) => sum + Number(order.finalPrice ?? order.priceUsd ?? 0), 0);
    return {
      total: orderRows.length,
      attention: orderRows.filter(needsAttention).length,
      processing: orderRows.filter((order: any) => ["paid", "processing", "pending"].includes(String(order.status))).length,
      delivered: orderRows.filter((order: any) => String(order.status) === "delivered").length,
      revenue: activeRevenue,
    };
  }, [orderRows]);

  const visibleOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orderRows.filter((order: any) => {
      if (pendingOnly && !needsAttention(order)) return false;
      if (activeView === "attention" && !needsAttention(order)) return false;
      if (activeView === "direct" && order.type !== "direct") return false;
      if (activeView === "marketplace" && order.type !== "marketplace") return false;
      if (activeView === "delivered" && String(order.status) !== "delivered") return false;
      if (statusFilter !== "all" && String(order.status) !== statusFilter) return false;
      if (!query) return true;
      return [order.orderNumber, order.id, order.userName, order.userEmail, order.guestWhatsapp, order.productName, order.planName, order.paymentTxid, order.externalOrderId]
        .some((value) => String(value ?? "").toLowerCase().includes(query));
    });
  }, [orderRows, pendingOnly, activeView, statusFilter, search]);

  const refreshOrders = () => {
    utils.admin.orderList.invalidate();
    utils.admin.overview.invalidate();
    utils.admin.thirdPartyOrderList.invalidate();
  };

  const approveDirectPayment = trpc.admin.orderApproveDirectPayment.useMutation({
    onSuccess: (data) => { toast.success(data.message || "Direct payment approved"); refreshOrders(); setSelectedOrder(null); },
    onError: (e) => toast.error(e.message),
  });
  const rejectDirectPayment = trpc.admin.orderRejectDirectPayment.useMutation({
    onSuccess: () => { toast.success("Direct payment rejected"); refreshOrders(); setSelectedOrder(null); },
    onError: (e) => toast.error(e.message),
  });
  const completeManualOrder = trpc.admin.orderCompleteManual.useMutation({
    onSuccess: (data) => { toast.success(data.replayed ? "Activation was already completed" : "Activation marked complete"); refreshOrders(); setSelectedOrder(null); },
    onError: (e) => toast.error(e.message),
  });
  const resolveMarketplaceOrder = trpc.admin.thirdPartyOrderResolve.useMutation({
    onSuccess: () => { toast.success("Marketplace order reconciled"); refreshOrders(); setSelectedOrder(null); },
    onError: (e) => toast.error(e.message),
  });
  const refundMarketplaceOrder = trpc.admin.thirdPartyOrderRefund.useMutation({
    onSuccess: () => { toast.success("Marketplace order refunded"); refreshOrders(); setSelectedOrder(null); },
    onError: (e) => toast.error(e.message),
  });
  const retryMarketplaceOrder = trpc.admin.thirdPartyOrderRetryProvider.useMutation({
    onSuccess: () => { toast.success("Provider retry completed"); refreshOrders(); },
    onError: (e) => toast.error(e.message),
  });
  const revealMarketplaceDelivery = trpc.admin.thirdPartyOrderRevealDelivery.useMutation({
    onSuccess: (data) => setRevealedDeliveryItems(Array.isArray(data.items) ? data.items : []),
    onError: (e) => toast.error(e.message),
  });

  function openOrder(order: any) {
    setSelectedOrder(order);
    setDeliveryItems("");
    setRevealedDeliveryItems(null);
    setResolutionNote("");
  }

  function copyText(value: string) {
    navigator.clipboard.writeText(value).then(() => toast.success("Copied"));
  }

  const viewTabs = [
    { id: "all", label: "All", count: metrics.total },
    { id: "attention", label: "Needs attention", count: metrics.attention },
    { id: "direct", label: "Direct", count: orderRows.filter((order: any) => order.type === "direct").length },
    { id: "marketplace", label: "Marketplace", count: orderRows.filter((order: any) => order.type === "marketplace").length },
    { id: "delivered", label: "Delivered", count: metrics.delivered },
  ] as const;

  return (
    <div className="space-y-4">
      {pendingOnly && (
        <div className="flex flex-col gap-3 rounded-xl border border-[#f1dfaa] bg-[#fffaf0] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#0a1128]">Fulfillment queue</h2>
            <p className="mt-1 text-xs text-[#7c8498]">Paid orders that require payment review, stock assignment, provider recovery, or manual activation.</p>
          </div>
          <Link to="/admin/orders" className="w-fit rounded-lg border border-[#dfe6ff] bg-white px-3 py-2 text-xs font-bold text-[#596176]">Back to all orders</Link>
        </div>
      )}

      <section aria-label="Order metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Total orders", value: metrics.total, note: "Direct + marketplace" },
          { label: "Needs attention", value: metrics.attention, note: "Operator action required", tone: metrics.attention > 0 ? "text-[#d11f4a]" : "text-[#0b8f34]" },
          { label: "In progress", value: metrics.processing, note: "Paid or processing" },
          { label: "Active revenue", value: format(metrics.revenue), note: `${metrics.delivered} delivered`, mono: true },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-[#dfe6ff] bg-white px-4 py-3 shadow-[0_4px_16px_rgba(12,37,104,0.04)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8992aa]">{item.label}</p>
            <p className={`mt-2 text-xl font-bold tabular-nums text-[#0a1128] ${item.tone || ""}`}>{item.value}</p>
            <p className="mt-1 text-[11px] text-[#7c8498]">{item.note}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-[#dfe6ff] bg-white shadow-[0_10px_30px_rgba(12,37,104,0.06)]">
        <div className="border-b border-[#e7ecff] p-4">
          {!pendingOnly && (
            <div className="flex gap-1 overflow-x-auto pb-3" role="tablist" aria-label="Order views">
              {viewTabs.map((tab) => (
                <button key={tab.id} type="button" role="tab" aria-selected={activeView === tab.id} onClick={() => setActiveView(tab.id)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${activeView === tab.id ? "bg-[#0a1128] text-white" : "text-[#596176] hover:bg-[#f4f6ff]"}`}>
                  {tab.label} <span className={`ml-1 tabular-nums ${activeView === tab.id ? "text-white/70" : "text-[#9aa0b4]"}`}>{tab.count}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search orders</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8992aa]" aria-hidden="true" />
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, customer, product, transaction ID" className="h-10 w-full rounded-lg border border-[#dfe6ff] bg-[#f8faff] pl-9 pr-3 text-sm text-[#0a1128] outline-none placeholder:text-[#9aa0b4] focus:border-[#155cff] focus:bg-white" />
            </label>
            <label>
              <span className="sr-only">Filter by status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 w-full rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs font-semibold text-[#596176] outline-none focus:border-[#155cff] sm:w-44">
                <option value="all">All statuses</option>
                <option value="payment_review">Payment review</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="pending_fulfillment">Pending fulfillment</option>
                <option value="delivered">Delivered</option>
                <option value="refunded">Refunded</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <button type="button" onClick={refreshOrders} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs font-bold text-[#596176] hover:bg-[#f8faff]" aria-label="Refresh orders">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[68rem] text-left text-sm">
            <thead className="bg-[#f8faff] text-[10px] font-bold uppercase tracking-[0.1em] text-[#7c8498]">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Product & delivery</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7ecff]">
              {isLoading && Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} aria-hidden="true"><td colSpan={7} className="px-4 py-3"><div className="h-10 animate-pulse rounded-lg bg-[#f0f3ff]" /></td></tr>
              ))}
              {!isLoading && error && (
                <tr><td colSpan={7} className="px-4 py-10 text-center"><p className="text-sm font-semibold text-[#d11f4a]">Orders could not be loaded.</p><button type="button" onClick={refreshOrders} className="mt-2 text-xs font-bold text-[#155cff]">Try again</button></td></tr>
              )}
              {!isLoading && !error && visibleOrders.map((order: any) => {
                const attention = needsAttention(order);
                return (
                  <tr key={`${order.type}-${order.id}`} className="group text-[#596176] hover:bg-[#fbfcff]">
                    <td className="px-4 py-3 align-top">
                      <button type="button" onClick={() => openOrder(order)} className="block text-left font-mono text-xs font-bold text-[#0a1128] hover:text-[#155cff]">{order.orderNumber || `#${order.id}`}</button>
                      <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-[#8992aa]">{order.type === "marketplace" ? "Marketplace" : "Direct"}</span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="max-w-[13rem] truncate text-xs font-semibold text-[#0a1128]">{order.userName || "Customer"}</p>
                      <p className="mt-1 max-w-[13rem] truncate text-[11px] text-[#8992aa]">{order.userEmail || order.guestWhatsapp || "No contact recorded"}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="max-w-[16rem] truncate text-xs font-semibold text-[#0a1128]">{order.productName || "Product unavailable"}</p>
                      <p className="mt-1 text-[11px] text-[#8992aa]">{order.planName || (order.fulfillmentType === "whatsapp_activation" ? "WhatsApp activation" : "Credential delivery")}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-xs font-bold tabular-nums text-[#0a1128]">{format(order.finalPrice ?? order.priceUsd ?? 0)}</p>
                      <p className="mt-1 text-[11px] capitalize text-[#8992aa]">{order.type === "marketplace" ? "Wallet" : order.checkoutType === "direct" ? String(order.paymentMethod || "Direct").replaceAll("_", " ") : "Wallet"}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                        String(order.status) === "delivered" ? "border-[#bde9ca] bg-[#f2fcf5] text-[#0b8f34]" :
                        attention ? "border-[#f2c6d1] bg-[#fff7f9] text-[#d11f4a]" :
                        ["paid", "processing", "pending"].includes(String(order.status)) ? "border-[#d6e1ff] bg-[#f5f8ff] text-[#155cff]" :
                        "border-[#eadfb8] bg-[#fffaf0] text-[#9b6200]"
                      }`}>{String(order.status || "pending").replaceAll("_", " ")}</span>
                      {attention && <p className="mt-1 text-[10px] font-semibold text-[#d11f4a]">Operator review</p>}
                    </td>
                    <td className="px-4 py-3 align-top text-[11px] text-[#7c8498]">{order.createdAt ? new Date(order.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                    <td className="px-4 py-3 text-right align-top">
                      <button type="button" onClick={() => openOrder(order)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dfe6ff] bg-white px-2.5 text-xs font-bold text-[#155cff] hover:bg-[#f4f6ff]">
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!isLoading && !error && visibleOrders.length === 0 && (
          <div className="border-t border-[#e7ecff] px-4 py-12 text-center">
            <p className="text-sm font-semibold text-[#0a1128]">No matching orders</p>
            <p className="mt-1 text-xs text-[#8992aa]">Change the view, status filter, or search query.</p>
          </div>
        )}
        {!isLoading && !error && visibleOrders.length > 0 && (
          <div className="border-t border-[#e7ecff] bg-[#fbfcff] px-4 py-2.5 text-[11px] text-[#7c8498]">Showing <span className="font-bold tabular-nums text-[#0a1128]">{visibleOrders.length}</span> of {orderRows.length} orders</div>
        )}
      </section>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050816]/55 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="order-review-title" onClick={() => setSelectedOrder(null)}>
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#e7ecff] bg-white px-5 py-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7c8498]">{selectedOrder.type === "marketplace" ? "Marketplace" : "Direct"} order</p>
                <h2 id="order-review-title" className="mt-1 truncate text-lg font-bold text-[#0a1128]">{selectedOrder.orderNumber || `Order #${selectedOrder.id}`}</h2>
              </div>
              <button type="button" onClick={() => setSelectedOrder(null)} className="rounded-lg border border-[#dfe6ff] p-2 text-[#596176] hover:bg-[#f4f6ff]" aria-label="Close order review"><XCircle className="h-4 w-4" /></button>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Customer", selectedOrder.userName || "Customer"],
                  ["Total", format(selectedOrder.finalPrice ?? selectedOrder.priceUsd ?? 0)],
                  ["Status", String(selectedOrder.status || "pending").replaceAll("_", " ")],
                  ["Created", selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-[#dfe6ff] bg-[#f8faff] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#8992aa]">{label}</p>
                    <p className="mt-1 break-words text-xs font-semibold capitalize text-[#0a1128]">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-lg border border-[#dfe6ff] p-4">
                  <h3 className="text-xs font-bold text-[#0a1128]">Order details</h3>
                  <dl className="mt-3 space-y-2 text-xs">
                    {[
                      ["Product", selectedOrder.productName || "—"],
                      ["Plan / delivery", selectedOrder.planName || (selectedOrder.fulfillmentType === "whatsapp_activation" ? "WhatsApp activation" : "Credential delivery")],
                      ["Email", selectedOrder.userEmail || "—"],
                      ["Phone / WhatsApp", selectedOrder.guestWhatsapp || "—"],
                      ["Payment", selectedOrder.type === "marketplace" ? "Wallet" : String(selectedOrder.paymentMethod || selectedOrder.checkoutType || "Wallet").replaceAll("_", " ")],
                    ].map(([label, value]) => <div key={label} className="flex justify-between gap-4"><dt className="text-[#8992aa]">{label}</dt><dd className="max-w-[65%] break-words text-right font-semibold capitalize text-[#0a1128]">{value}</dd></div>)}
                  </dl>
                </section>
                <section className="rounded-lg border border-[#dfe6ff] p-4">
                  <h3 className="text-xs font-bold text-[#0a1128]">References</h3>
                  <dl className="mt-3 space-y-2 text-xs">
                    {[
                      ["Payment TXID", selectedOrder.paymentTxid],
                      ["Provider order", selectedOrder.externalOrderId],
                      ["Delivery status", selectedOrder.deliveryStatus],
                      ["Provider", selectedOrder.type === "marketplace" ? selectedOrder.provider : null],
                    ].filter(([, value]) => value).map(([label, value]) => <div key={label} className="flex justify-between gap-4"><dt className="text-[#8992aa]">{label}</dt><dd className="max-w-[65%] break-all text-right font-mono text-[11px] text-[#0a1128]">{String(value).replaceAll("_", " ")}</dd></div>)}
                  </dl>
                  {selectedOrder.paymentScreenshotUrl && <a href={selectedOrder.paymentScreenshotUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-xs font-bold text-[#155cff]">Open payment proof</a>}
                </section>
              </div>

              {(selectedOrder.errorMessage || (needsAttention(selectedOrder) && selectedOrder.pendingFulfillmentMessage)) && (
                <div className="rounded-lg border border-[#f2c6d1] bg-[#fff7f9] p-4 text-xs text-[#d11f4a]">
                  <p className="font-bold">Action context</p>
                  <p className="mt-1 leading-5">{selectedOrder.errorMessage || selectedOrder.pendingFulfillmentMessage}</p>
                  {selectedOrder.errorCode && <p className="mt-1 font-mono text-[10px]">{selectedOrder.errorCode}</p>}
                </div>
              )}

              {selectedOrder.type === "marketplace" && (
                <section className="rounded-lg border border-[#dfe6ff] p-4">
                  <div className="flex items-center justify-between gap-3"><h3 className="text-xs font-bold text-[#0a1128]">Delivered credentials</h3><span className="text-[11px] text-[#8992aa]">{revealedDeliveryItems === null ? "Locked" : `${revealedDeliveryItems.length} item(s)`}</span></div>
                  <div className="mt-3 space-y-2">
                    {String(selectedOrder.status) !== "delivered" ? <p className="rounded-lg border border-dashed border-[#dfe6ff] p-4 text-center text-xs text-[#8992aa]">No delivered credentials are available yet.</p> : revealedDeliveryItems === null ? <div className="rounded-lg border border-dashed border-[#dfe6ff] bg-[#f8faff] p-4 text-center"><p className="text-xs font-semibold text-[#0a1128]">Credential payload is locked</p><p className="mt-1 text-[11px] text-[#8992aa]">Values are fetched only after this explicit admin action.</p><button type="button" onClick={() => revealMarketplaceDelivery.mutate({ id: selectedOrder.id })} disabled={revealMarketplaceDelivery.isPending} className="mt-3 rounded-lg bg-[#0a1128] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{revealMarketplaceDelivery.isPending ? "Loading…" : "Reveal credentials"}</button></div> : revealedDeliveryItems.length === 0 ? <p className="rounded-lg border border-dashed border-[#dfe6ff] p-4 text-center text-xs text-[#8992aa]">No credentials recorded.</p> : revealedDeliveryItems.map((item: any, index: number) => {
                      const content = String(item?.content || item || "");
                      return <div key={index} className="flex items-start gap-3 rounded-lg bg-[#f8faff] p-3"><pre className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-[11px] leading-5 text-[#0a1128]">{content}</pre><button type="button" onClick={() => copyText(content)} className="rounded-md border border-[#dfe6ff] bg-white p-2 text-[#155cff]" aria-label={`Copy credential ${index + 1}`}><Copy className="h-3.5 w-3.5" /></button></div>;
                    })}
                  </div>
                </section>
              )}

              <section className="rounded-lg border border-[#dfe6ff] bg-[#fbfcff] p-4">
                <h3 className="text-xs font-bold text-[#0a1128]">Operator actions</h3>
                {selectedOrder.type === "direct" && selectedOrder.checkoutType === "direct" && selectedOrder.status === "payment_review" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => approveDirectPayment.mutate({ id: selectedOrder.id })} disabled={approveDirectPayment.isPending || rejectDirectPayment.isPending} className="rounded-lg bg-[#0b8f34] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><CheckCircle className="mr-1.5 inline h-3.5 w-3.5" />Approve & fulfill</button>
                    <button type="button" onClick={() => rejectDirectPayment.mutate({ id: selectedOrder.id })} disabled={approveDirectPayment.isPending || rejectDirectPayment.isPending} className="rounded-lg border border-[#f2c6d1] bg-white px-4 py-2.5 text-xs font-bold text-[#d11f4a] disabled:opacity-50">Reject payment</button>
                  </div>
                )}
                {selectedOrder.type === "direct" && selectedOrder.fulfillmentType === "whatsapp_activation" && selectedOrder.status === "pending_fulfillment" && (
                  <div className="mt-3 space-y-2"><input value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} placeholder="Activation note or reference" className="h-10 w-full rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs text-[#0a1128] outline-none focus:border-[#155cff]" /><button type="button" onClick={() => completeManualOrder.mutate({ id: selectedOrder.id, note: resolutionNote.trim() })} disabled={resolutionNote.trim().length === 0 || completeManualOrder.isPending} className="rounded-lg bg-[#0a1128] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">Mark activation complete</button></div>
                )}
                {selectedOrder.type === "marketplace" && !["delivered", "refunded", "cancelled", "failed"].includes(String(selectedOrder.status)) && (
                  <div className="mt-3 space-y-3">
                    <textarea value={deliveryItems} onChange={(event) => setDeliveryItems(event.target.value)} rows={4} placeholder="Delivered credential(s), one per line" className="w-full rounded-lg border border-[#dfe6ff] bg-white p-3 font-mono text-xs text-[#0a1128] outline-none focus:border-[#155cff]" />
                    <input value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} placeholder="Required operator note" className="h-10 w-full rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs text-[#0a1128] outline-none focus:border-[#155cff]" />
                    <div className="flex flex-wrap gap-2">
                      {["pending", "processing"].includes(String(selectedOrder.status)) && <button type="button" onClick={() => retryMarketplaceOrder.mutate({ id: selectedOrder.id })} disabled={retryMarketplaceOrder.isPending} className="rounded-lg border border-[#d6e1ff] bg-white px-3 py-2.5 text-xs font-bold text-[#155cff] disabled:opacity-50"><RefreshCw className="mr-1.5 inline h-3.5 w-3.5" />Retry provider</button>}
                      <button type="button" onClick={() => resolveMarketplaceOrder.mutate({ id: selectedOrder.id, resolution: "delivered", items: deliveryItems.split("\n").map((item) => item.trim()).filter(Boolean), note: resolutionNote.trim() })} disabled={resolutionNote.trim().length < 3 || deliveryItems.trim().length === 0 || resolveMarketplaceOrder.isPending} className="rounded-lg bg-[#0b8f34] px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40">Mark delivered</button>
                      <button type="button" onClick={() => refundMarketplaceOrder.mutate({ id: selectedOrder.id, note: resolutionNote.trim() })} disabled={resolutionNote.trim().length === 0 || refundMarketplaceOrder.isPending} className="rounded-lg bg-[#0a1128] px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40"><RotateCcw className="mr-1.5 inline h-3.5 w-3.5" />Refund</button>
                      <button type="button" onClick={() => resolveMarketplaceOrder.mutate({ id: selectedOrder.id, resolution: "cancelled", items: [], note: resolutionNote.trim() })} disabled={resolutionNote.trim().length < 3 || resolveMarketplaceOrder.isPending} className="rounded-lg border border-[#f2c6d1] bg-white px-3 py-2.5 text-xs font-bold text-[#d11f4a] disabled:opacity-40">Cancel + refund</button>
                    </div>
                  </div>
                )}
                {!needsAttention(selectedOrder) && !(["pending", "processing"].includes(String(selectedOrder.status)) && selectedOrder.type === "marketplace") && <p className="mt-2 text-xs text-[#8992aa]">No operator action is required for this order.</p>}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductsAdminPage() {
  const { data: products, isLoading, error } = trpc.admin.productList.useQuery();
  const utils = trpc.useUtils();
  const { format } = useCurrency();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [deliveryFilter, setDeliveryFilter] = useState<"all" | "credentials" | "whatsapp_activation">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [setupDraft, setSetupDraft] = useState("");
  const [fulfillmentDraft, setFulfillmentDraft] = useState<"credentials" | "whatsapp_activation">("credentials");
  const [priceDraft, setPriceDraft] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [shortDescDraft, setShortDescDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<"active" | "inactive">("active");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const productRows = useMemo(() => (products ?? []) as any[], [products]);
  const categories = useMemo(() => Array.from(new Set(productRows.map((product) => String(product.categoryName || "Uncategorized")))).sort(), [productRows]);
  const metrics = useMemo(() => {
    const credentialProducts = productRows.filter((product) => product.fulfillmentType !== "whatsapp_activation");
    return {
      total: productRows.length,
      active: productRows.filter((product) => product.status === "active").length,
      available: credentialProducts.reduce((sum, product) => sum + Number(product.inventorySummary?.available ?? product.inventoryCount ?? 0), 0),
      attention: credentialProducts.filter((product) => product.status === "active" && Number(product.inventorySummary?.available ?? product.inventoryCount ?? 0) <= 0).length,
      manual: productRows.filter((product) => product.fulfillmentType === "whatsapp_activation").length,
    };
  }, [productRows]);
  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return productRows.filter((product) => {
      if (statusFilter !== "all" && product.status !== statusFilter) return false;
      const delivery = product.fulfillmentType === "whatsapp_activation" ? "whatsapp_activation" : "credentials";
      if (deliveryFilter !== "all" && delivery !== deliveryFilter) return false;
      if (categoryFilter !== "all" && String(product.categoryName || "Uncategorized") !== categoryFilter) return false;
      if (!query) return true;
      return [product.id, product.name, product.slug, product.categoryName, product.shortDescription]
        .some((value) => String(value ?? "").toLowerCase().includes(query));
    });
  }, [productRows, statusFilter, deliveryFilter, categoryFilter, search]);
  const editingProduct = productRows.find((product) => product.id === editingProductId) || null;
  const deletingProduct = productRows.find((product) => product.id === deletingId) || null;

  const updateProduct = trpc.admin.productUpdate.useMutation({
    onSuccess: () => { toast.success("Product updated"); setEditingProductId(null); resetDrafts(); utils.admin.productList.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteProduct = trpc.admin.productDelete.useMutation({
    onSuccess: (result) => { toast.success(result.archived ? "Product archived because order history exists" : "Product deleted"); setDeletingId(null); utils.admin.productList.invalidate(); utils.admin.inventoryList.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  function resetDrafts() {
    setSetupDraft(""); setFulfillmentDraft("credentials"); setPriceDraft(""); setNameDraft(""); setShortDescDraft(""); setStatusDraft("active");
  }
  function closeEditor() { setEditingProductId(null); resetDrafts(); }
  function startEdit(product: any) {
    setEditingProductId(product.id);
    setSetupDraft(product.setupInstructions || "");
    setFulfillmentDraft(product.fulfillmentType === "whatsapp_activation" ? "whatsapp_activation" : "credentials");
    setPriceDraft(String(product.plans?.[0]?.price ?? product.plans?.[0]?.salePrice ?? ""));
    setNameDraft(product.name || "");
    setShortDescDraft(product.shortDescription || "");
    setStatusDraft(product.status === "inactive" ? "inactive" : "active");
  }
  function refreshProducts() { utils.admin.productList.invalidate(); }
  function saveProduct() {
    const price = Number(priceDraft);
    if (!nameDraft.trim()) { toast.error("Product name is required"); return; }
    if (!priceDraft.trim() || !Number.isFinite(price) || price < 0) { toast.error("Enter a valid USD price"); return; }
    if (!editingProduct) return;
    updateProduct.mutate({ id: editingProduct.id, name: nameDraft.trim(), shortDescription: shortDescDraft.trim(), status: statusDraft, fulfillmentType: fulfillmentDraft, setupInstructions: setupDraft.trim(), price });
  }

  return (
    <div className="space-y-4">
      <section aria-label="Product metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Catalog products", value: metrics.total, note: `${metrics.active} active`, icon: Package, tone: "border-[#263861] bg-[linear-gradient(145deg,#18284e,#0a1128)] text-white shadow-[0_6px_0_#050816,0_14px_24px_rgba(10,17,40,0.18)]" },
          { label: "Available stock", value: metrics.available, note: "Credential units ready", icon: Boxes, tone: "border-[#bde9ca] bg-[linear-gradient(145deg,#f8fff9,#eafff0)] shadow-[0_6px_0_#b9e5c5,0_14px_24px_rgba(11,143,52,0.09)]" },
          { label: "Stock attention", value: metrics.attention, note: "Active products at zero", icon: ShieldAlert, tone: "border-[#ffdfad] bg-[linear-gradient(145deg,#fffdf7,#fff5df)] shadow-[0_6px_0_#f5dfb9,0_14px_24px_rgba(184,120,0,0.09)]" },
          { label: "Manual activation", value: metrics.manual, note: "WhatsApp fulfillment", icon: MessageSquare, tone: "border-[#d6e1ff] bg-[linear-gradient(145deg,#ffffff,#eef3ff)] shadow-[0_6px_0_#ccd9fb,0_14px_24px_rgba(21,92,255,0.08)]" },
        ].map((item) => <article key={item.label} className={`rounded-xl border p-4 ${item.tone}`}><div className="flex items-start justify-between gap-3"><div><p className={`text-[10px] font-bold uppercase tracking-[0.1em] ${item.label === "Catalog products" ? "text-white/60" : "text-[#8992aa]"}`}>{item.label}</p><p className={`mt-3 text-2xl font-black tabular-nums ${item.label === "Catalog products" ? "text-white" : item.label === "Stock attention" && metrics.attention > 0 ? "text-[#b56f00]" : "text-[#0a1128]"}`}>{item.value}</p><p className={`mt-1 text-[11px] ${item.label === "Catalog products" ? "text-white/50" : "text-[#7c8498]"}`}>{item.note}</p></div><span className={`flex h-9 w-9 items-center justify-center rounded-lg border ${item.label === "Catalog products" ? "border-white/15 bg-white/10 text-white" : "border-white bg-white/80 text-[#155cff] shadow-sm"}`}><item.icon className="h-4 w-4" /></span></div></article>)}
      </section>

      <section className="overflow-hidden rounded-xl border border-[#dfe6ff] bg-white shadow-[0_10px_30px_rgba(12,37,104,0.06)]">
        <div className="border-b border-[#e7ecff] p-4">
          <div className="flex flex-col gap-2 lg:flex-row">
            <label className="relative min-w-0 flex-1"><span className="sr-only">Search products</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8992aa]" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product, slug, category, description" className="h-10 w-full rounded-lg border border-[#dfe6ff] bg-[#f8faff] pl-9 pr-3 text-sm text-[#0a1128] outline-none placeholder:text-[#9aa0b4] focus:border-[#155cff] focus:bg-white" /></label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as any)} className="h-10 rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs font-semibold text-[#596176] outline-none lg:w-36"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
            <select value={deliveryFilter} onChange={(event) => setDeliveryFilter(event.target.value as any)} className="h-10 rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs font-semibold text-[#596176] outline-none lg:w-48"><option value="all">All delivery types</option><option value="credentials">Credentials</option><option value="whatsapp_activation">WhatsApp activation</option></select>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-10 rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs font-semibold text-[#596176] outline-none lg:w-44"><option value="all">All categories</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
            <button type="button" onClick={refreshProducts} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs font-bold text-[#596176] hover:bg-[#f8faff]"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[66rem] text-left">
            <thead className="bg-[#f8faff] text-[10px] font-bold uppercase tracking-[0.1em] text-[#7c8498]"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Pricing</th><th className="px-4 py-3">Delivery</th><th className="px-4 py-3">Inventory</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-[#e7ecff]">
              {isLoading && Array.from({ length: 4 }).map((_, index) => <tr key={index}><td colSpan={7} className="px-4 py-3"><div className="h-11 animate-pulse rounded-lg bg-[#f0f3ff]" /></td></tr>)}
              {!isLoading && error && <tr><td colSpan={7} className="px-4 py-12 text-center"><p className="text-sm font-bold text-[#d11f4a]">Products could not be loaded.</p><button type="button" onClick={refreshProducts} className="mt-2 text-xs font-bold text-[#155cff]">Try again</button></td></tr>}
              {!isLoading && !error && visibleProducts.map((product) => {
                const inventory = product.inventorySummary || { available: product.inventoryCount || 0, reserved: 0, sold: 0, disabled: 0, total: product.inventoryCount || 0 };
                const credentialDelivery = product.fulfillmentType !== "whatsapp_activation";
                const noStock = credentialDelivery && Number(inventory.available || 0) <= 0;
                return <tr key={product.id} className="text-[#596176] hover:bg-[#fbfcff]">
                  <td className="px-4 py-3 align-top"><button type="button" onClick={() => startEdit(product)} className="block max-w-[16rem] truncate text-left text-xs font-bold text-[#0a1128] hover:text-[#155cff]">{product.name}</button><p className="mt-1 max-w-[16rem] truncate font-mono text-[10px] text-[#8992aa]">/{product.slug}</p><p className="mt-1 max-w-[16rem] truncate text-[10px] text-[#7c8498]">{product.shortDescription || "No short description"}</p></td>
                  <td className="px-4 py-3 align-top"><p className="text-xs font-semibold text-[#0a1128]">{product.categoryName || "Uncategorized"}</p><p className="mt-1 text-[10px] text-[#8992aa]">ID {product.categoryId}</p></td>
                  <td className="px-4 py-3 align-top"><p className="text-xs font-black tabular-nums text-[#0a1128]">{format(Number(product.plans?.[0]?.price ?? 0))}</p><p className="mt-1 text-[10px] text-[#8992aa]">{product.plans?.length ?? 0} plan{product.plans?.length === 1 ? "" : "s"}</p></td>
                  <td className="px-4 py-3 align-top"><span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold ${credentialDelivery ? "border-[#d6e1ff] bg-[#f5f8ff] text-[#155cff]" : "border-[#bde9ca] bg-[#f2fcf5] text-[#0b8f34]"}`}>{credentialDelivery ? "Credentials" : "WhatsApp activation"}</span></td>
                  <td className="px-4 py-3 align-top">{credentialDelivery ? <><p className={`text-xs font-black tabular-nums ${noStock ? "text-[#d11f4a]" : "text-[#0b8f34]"}`}>{inventory.available || 0} available</p><p className="mt-1 text-[10px] text-[#8992aa]">{inventory.reserved || 0} reserved · {inventory.sold || 0} sold</p></> : <p className="text-xs font-semibold text-[#7c8498]">Not inventory based</p>}</td>
                  <td className="px-4 py-3 align-top"><span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${product.status === "active" ? "border-[#bde9ca] bg-[#f2fcf5] text-[#0b8f34]" : "border-[#dfe6ff] bg-[#f5f6fa] text-[#7c8498]"}`}>{product.status}</span>{noStock && product.status === "active" && <p className="mt-1 text-[10px] font-semibold text-[#d11f4a]">Restock required</p>}</td>
                  <td className="px-4 py-3 text-right align-top"><div className="flex justify-end gap-2"><button type="button" onClick={() => startEdit(product)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dfe6ff] bg-white px-2.5 text-xs font-bold text-[#155cff] hover:bg-[#f4f6ff]"><Eye className="h-3.5 w-3.5" /> Manage</button>{credentialDelivery && <Link to={`/admin/inventory?productName=${encodeURIComponent(product.name)}`} className="inline-flex h-8 items-center rounded-lg border border-[#bde9ca] bg-white px-2.5 text-xs font-bold text-[#0b8f34] hover:bg-[#f2fcf5]">Stock</Link>}<button type="button" onClick={() => setDeletingId(product.id)} className="inline-flex h-8 items-center rounded-lg border border-[#f2c6d1] bg-white px-2.5 text-xs font-bold text-[#d11f4a] hover:bg-[#fff7f9]">Remove</button></div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        {!isLoading && !error && visibleProducts.length === 0 && <div className="border-t border-[#e7ecff] px-4 py-12 text-center"><p className="text-sm font-bold text-[#0a1128]">No matching products</p><p className="mt-1 text-xs text-[#8992aa]">Change the status, delivery, category, or search filter.</p></div>}
        {!isLoading && !error && visibleProducts.length > 0 && <div className="border-t border-[#e7ecff] bg-[#fbfcff] px-4 py-2.5 text-[11px] text-[#7c8498]">Showing <span className="font-bold text-[#0a1128]">{visibleProducts.length}</span> of {productRows.length} direct products</div>}
      </section>

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050816]/55 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="product-editor-title" onClick={closeEditor}>
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#e7ecff] bg-white px-5 py-4"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8992aa]">Direct catalog product</p><h2 id="product-editor-title" className="mt-1 truncate text-lg font-bold text-[#0a1128]">Manage {editingProduct.name}</h2></div><button type="button" onClick={closeEditor} className="rounded-lg border border-[#dfe6ff] p-2 text-[#596176] hover:bg-[#f4f6ff]" aria-label="Close product editor"><XCircle className="h-4 w-4" /></button></div>
            <div className="space-y-5 p-5">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Category", editingProduct.categoryName || "Uncategorized"], ["Plans", String(editingProduct.plans?.length ?? 0)], ["Available", editingProduct.fulfillmentType === "whatsapp_activation" ? "N/A" : String(editingProduct.inventorySummary?.available ?? editingProduct.inventoryCount ?? 0)], ["Product ID", `#${editingProduct.id}`]].map(([label, value]) => <div key={label} className="rounded-lg border border-[#dfe6ff] bg-[#f8faff] p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[#8992aa]">{label}</p><p className="mt-1 truncate text-xs font-bold text-[#0a1128]">{value}</p></div>)}</div>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
                <section className="rounded-lg border border-[#dfe6ff] p-4"><h3 className="text-xs font-bold text-[#0a1128]">Product configuration</h3><div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block"><span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8498]">Product name</span><input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-[#dfe6ff] bg-white px-3 text-sm text-[#0a1128] outline-none focus:border-[#155cff]" /></label>
                  <label className="block"><span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8498]">Price (USD)</span><input type="number" step="0.01" min="0" value={priceDraft} onChange={(event) => setPriceDraft(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-[#dfe6ff] bg-white px-3 text-sm text-[#0a1128] outline-none focus:border-[#155cff]" /></label>
                  <label className="block sm:col-span-2"><span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8498]">Short description</span><input value={shortDescDraft} onChange={(event) => setShortDescDraft(event.target.value)} placeholder="Customer-facing product summary" className="mt-2 h-10 w-full rounded-lg border border-[#dfe6ff] bg-white px-3 text-sm text-[#0a1128] outline-none focus:border-[#155cff]" /></label>
                  <label className="block"><span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8498]">Status</span><select value={statusDraft} onChange={(event) => setStatusDraft(event.target.value as "active" | "inactive")} className="mt-2 h-10 w-full rounded-lg border border-[#dfe6ff] bg-white px-3 text-sm text-[#0a1128] outline-none focus:border-[#155cff]"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
                  <label className="block"><span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8498]">Delivery type</span><select value={fulfillmentDraft} onChange={(event) => setFulfillmentDraft(event.target.value as "credentials" | "whatsapp_activation")} className="mt-2 h-10 w-full rounded-lg border border-[#dfe6ff] bg-white px-3 text-sm text-[#0a1128] outline-none focus:border-[#155cff]"><option value="credentials">Automatic credentials</option><option value="whatsapp_activation">WhatsApp activation</option></select></label>
                  <label className="block sm:col-span-2"><span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8498]">Setup guide steps</span><textarea value={setupDraft} onChange={(event) => setSetupDraft(event.target.value)} placeholder="One customer setup step per line" rows={6} className="mt-2 w-full rounded-lg border border-[#dfe6ff] bg-white p-3 text-sm leading-6 text-[#0a1128] outline-none focus:border-[#155cff]" /></label>
                </div></section>
                <aside className="space-y-4"><section className="rounded-lg border border-[#dfe6ff] bg-[#f8faff] p-4"><h3 className="text-xs font-bold text-[#0a1128]">Inventory position</h3>{editingProduct.fulfillmentType !== "whatsapp_activation" ? <div className="mt-3 space-y-2 text-xs">{[["Available", editingProduct.inventorySummary?.available ?? editingProduct.inventoryCount ?? 0], ["Reserved", editingProduct.inventorySummary?.reserved ?? 0], ["Sold", editingProduct.inventorySummary?.sold ?? 0], ["Disabled", editingProduct.inventorySummary?.disabled ?? 0], ["Total", editingProduct.inventorySummary?.total ?? editingProduct.inventoryCount ?? 0]].map(([label, value]) => <div key={label} className="flex justify-between border-b border-[#e1e7fa] pb-2 last:border-0"><span className="text-[#7c8498]">{label}</span><span className="font-bold tabular-nums text-[#0a1128]">{value}</span></div>)}<Link to={`/admin/inventory?productName=${encodeURIComponent(editingProduct.name)}`} className="mt-3 inline-flex w-full justify-center rounded-lg bg-[#0b8f34] px-3 py-2.5 text-xs font-bold text-white">Manage inventory</Link></div> : <p className="mt-3 text-xs leading-5 text-[#7c8498]">WhatsApp activation products do not consume stored credentials.</p>}</section><section className="rounded-lg border border-[#dfe6ff] p-4"><h3 className="text-xs font-bold text-[#0a1128]">Catalog reference</h3><dl className="mt-3 space-y-2 text-xs"><div className="flex justify-between gap-3"><dt className="text-[#8992aa]">Slug</dt><dd className="max-w-[65%] break-all text-right font-mono text-[10px] text-[#0a1128]">/{editingProduct.slug}</dd></div><div className="flex justify-between"><dt className="text-[#8992aa]">Category ID</dt><dd className="font-bold text-[#0a1128]">{editingProduct.categoryId}</dd></div></dl></section></aside>
              </div>
              <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-[#e7ecff] bg-white pt-4"><button type="button" onClick={closeEditor} className="rounded-lg border border-[#dfe6ff] bg-white px-4 py-2.5 text-xs font-bold text-[#596176]">Cancel</button><button type="button" onClick={saveProduct} disabled={updateProduct.isPending || !nameDraft.trim() || !priceDraft.trim()} className="rounded-lg bg-[#155cff] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-40">{updateProduct.isPending ? "Saving..." : "Save product"}</button></div>
            </div>
          </div>
        </div>
      )}

      {deletingProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#050816]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-product-title" onClick={() => setDeletingId(null)}><div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#fff0f4] text-[#d11f4a]"><Trash2 className="h-4 w-4" /></span><h2 id="delete-product-title" className="mt-4 text-lg font-bold text-[#0a1128]">Remove {deletingProduct.name}?</h2><p className="mt-2 text-xs leading-5 text-[#596176]">Products with order history are archived to preserve financial and delivery records. Products without history are permanently deleted with unused inventory.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setDeletingId(null)} className="rounded-lg border border-[#dfe6ff] px-4 py-2.5 text-xs font-bold text-[#596176]">Cancel</button><button type="button" onClick={() => deleteProduct.mutate({ id: deletingProduct.id })} disabled={deleteProduct.isPending} className="rounded-lg bg-[#d11f4a] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">{deleteProduct.isPending ? "Removing..." : "Remove or archive"}</button></div></div></div>
      )}
    </div>
  );
}

function ThirdPartyProductsAdminPage() {
  const { data: products } = trpc.admin.thirdPartyProductList.useQuery();
  const utils = trpc.useUtils();
  const { format, currency } = useCurrency();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<number, { title: string; description: string; priceUsd: string; originalPrice: string }>>({});

  const productRows = useMemo(() => (products ?? []) as any[], [products]);

  const filteredProductRows = useMemo(() => {
    let rows = productRows;
    if (statusFilter !== "all") rows = rows.filter((p) => p.status === statusFilter);
    if (providerFilter !== "all") rows = rows.filter((p) => p.provider === providerFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((p) =>
        (p.title || "").toLowerCase().includes(q) ||
        (p.sourceTitle || "").toLowerCase().includes(q) ||
        (p.provider || "").toLowerCase().includes(q)
      );
    }
    return rows;
  }, [productRows, statusFilter, providerFilter, search]);

  const activeCount = productRows.filter((p) => p.status === "active").length;
  const inactiveCount = productRows.filter((p) => p.status === "inactive").length;

  const syncProducts = trpc.admin.thirdPartyProductSync.useMutation({
    onSuccess: async (result) => {
      toast.success(`${result.created} new, ${result.updated} updated from ${result.total} products`);
      await utils.admin.thirdPartyProductList.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateProduct = trpc.admin.thirdPartyProductUpdate.useMutation({
    onSuccess: async () => {
      toast.success("Product updated");
      setEditingId(null);
      await utils.admin.thirdPartyProductList.invalidate();
      await utils.public.thirdPartyProductList.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  function startEdit(product: any) {
    const sellingPrice = Number(product.effectivePriceUsd || product.sourcePriceUsd || 0);
    const originalPrice = Number(product.originalPriceUsd || 0);
    const displaySellingPrice = product.priceCurrency === currency && Number(product.priceDisplayAmount || 0) > 0
      ? Number(product.priceDisplayAmount)
      : currency === "PKR"
        ? Math.round(sellingPrice * getExchangeRate())
        : sellingPrice.toFixed(2);
    setEditingId(product.id);
    setDrafts((current) => ({
      ...current,
      [product.id]: {
        title: product.title || product.sourceTitle || "",
        description: product.description || product.sourceDescription || "",
        priceUsd: String(displaySellingPrice),
        originalPrice: String(
          product.originalPriceCurrency === currency && Number(product.originalPriceDisplayAmount || 0) > 0
            ? product.originalPriceDisplayAmount
            : currency === "PKR"
              ? Math.round(originalPrice * getExchangeRate())
              : originalPrice.toFixed(2),
        ),
      },
    }));
  }

  function updateDraft(id: number, key: "title" | "description" | "priceUsd" | "originalPrice", value: string) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        title: current[id]?.title ?? "",
        description: current[id]?.description ?? "",
        priceUsd: current[id]?.priceUsd ?? "",
        originalPrice: current[id]?.originalPrice ?? "",
        [key]: value,
      },
    }));
  }

  const profitLabel = (product: any) => {
    const sp = Number(product.effectivePriceUsd || product.sourcePriceUsd || 0);
    const cp = Number(product.sourcePriceUsd || 0);
    if (cp <= 0) return null;
    const margin = ((sp - cp) / cp * 100);
    return `+${Math.round(margin)}%`;
  };

  return (
    <div className="space-y-4">
      <PlatformApiToggle />
      {/* Header card */}
      <div className="relative overflow-hidden rounded-3xl bg-white shadow-[0_4px_24px_rgba(12,37,104,0.06)] ring-1 ring-black/[0.04]">
        <div className="absolute left-0 top-0 h-full w-1.5 rounded-l-3xl opacity-50" style={{ background: "linear-gradient(180deg, #155cff, #6d35ff)" }} />
        <div className="px-7 py-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-[15px] font-bold text-[#0a1128]">3rd Party Products</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-[#5c6478]">
                Products synced from Technysoft, Canboso & Akunding. Set your selling price and activate.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => syncProducts.mutate()}
                disabled={syncProducts.isPending}
                className="shrink-0 rounded-xl bg-[#0a1128] px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_2px_12px_rgba(10,17,40,0.15)] transition-all hover:bg-[#1a2040] hover:shadow-[0_4px_16px_rgba(10,17,40,0.2)] active:scale-[0.97] disabled:opacity-40"
              >
                {syncProducts.isPending ? (
                  <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing...</span>
                ) : (
                  "Sync Now"
                )}
              </button>
            </div>
          </div>

          {/* Filters row */}
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#f0f3ff] pt-4">
            {/* Status pills */}
            <div className="flex gap-1.5">
              {[
                { id: "all", label: "All", count: productRows.length },
                { id: "active", label: "Active", count: activeCount },
                { id: "inactive", label: "Inactive", count: inactiveCount },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id as "all" | "active" | "inactive")}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-bold transition-all ${
                    statusFilter === f.id
                      ? "bg-[#0a1128] text-white"
                      : "bg-[#f4f6ff] text-[#5c6478] hover:bg-[#e8ecff]"
                  }`}
                >
                  {f.label} <span className="opacity-60">{f.count}</span>
                </button>
              ))}
            </div>
            {/* Provider filter */}
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="rounded-lg border border-[#e8ecff] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#5c6478] outline-none"
            >
              <option value="all">All providers</option>
              <option value="technysoft">Technysoft</option>
              <option value="canboso">Canboso</option>
              <option value="akunding">Akunding</option>
            </select>
            {/* Search */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="min-w-[200px] flex-1 rounded-lg border border-[#e8ecff] bg-white px-3 py-1.5 text-[12px] text-[#0a1128] outline-none transition-all placeholder:text-[#bcc3d9] focus:border-[#155cff] focus:shadow-[0_0_0_3px_rgba(21,92,255,0.06)]"
            />
          </div>
        </div>
      </div>

      {/* Product cards grid */}
      {filteredProductRows.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProductRows.map((product) => {
            const sellingPrice = Number(product.effectivePriceUsd || product.sourcePriceUsd || 0);
            const sourcePrice = Number(product.sourcePriceUsd || 0);
            const marginPct = profitLabel(product);
            const isEditing = editingId === product.id;
            const draft = drafts[product.id] ?? { title: product.title || "", description: product.description || "", priceUsd: "", originalPrice: "" };

            return (
              <div
                key={product.id}
                className="group relative flex flex-col rounded-2xl border border-[#e8ecff] bg-white p-4 shadow-[0_2px_12px_rgba(12,37,104,0.04)] transition-shadow hover:shadow-[0_4px_20px_rgba(12,37,104,0.08)]"
              >
                {/* Provider + status badges */}
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-md bg-[#f4f6ff] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#155cff]">
                    {product.provider}
                  </span>
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    product.status === "active" ? "bg-[#eafff0] text-[#0b8f34]" : "bg-[#f4f6ff] text-[#9aa0b4]"
                  }`}>
                    {product.status}
                  </span>
                  {marginPct && (
                    <span className="rounded-md bg-[#fff7ed] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#f97316]">
                      {marginPct} margin
                    </span>
                  )}
                </div>

                {/* Title */}
                <p className="text-[13px] font-bold leading-snug text-[#0a1128] line-clamp-2">{product.title}</p>

                {/* Source info */}
                <p className="mt-1 text-[11px] leading-tight text-[#9aa0b4] line-clamp-1">
                  Source: {product.sourceTitle || product.title} · Stock: {product.sourceStock ?? 0}
                </p>

                {/* Price row */}
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <p className="text-lg font-bold tabular-nums text-[#0a1128]">
                      {product.priceCurrency === currency && Number(product.priceDisplayAmount || 0) > 0
                        ? currency === "PKR"
                          ? `Rs ${Number(product.priceDisplayAmount).toLocaleString("en-PK")}`
                          : `$${Number(product.priceDisplayAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : format(sellingPrice)}
                    </p>
                    {sourcePrice > 0 && (
                      <p className="text-[11px] font-medium text-[#9aa0b4]">
                        Cost: {format(sourcePrice)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateProduct.mutate({ id: product.id, status: product.status === "active" ? "inactive" : "active" })}
                    disabled={updateProduct.isPending}
                    className={`flex-1 rounded-lg px-3 py-2 text-[11px] font-bold transition-all ${
                      product.status === "active"
                        ? "bg-[#f4f6ff] text-[#5c6478] hover:bg-[#e8ecff]"
                        : "bg-[#0a1128] text-white hover:bg-[#1a2040]"
                    }`}
                  >
                    {product.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateProduct.mutate({ id: product.id, providerPurchaseEnabled: !product.providerPurchaseEnabled })}
                    disabled={updateProduct.isPending || product.status !== "active"}
                    title={product.status !== "active" ? "Activate the product before enabling provider purchase" : "Toggle real provider purchasing for this product"}
                    className={`rounded-lg px-3 py-2 text-[11px] font-bold transition-all disabled:opacity-40 ${
                      product.providerPurchaseEnabled
                        ? "bg-[#eafff0] text-[#0b8f34] hover:bg-[#d8f8e2]"
                        : "bg-[#fff0f4] text-[#d11f4a] hover:bg-[#ffe1e9]"
                    }`}
                  >
                    {product.providerPurchaseEnabled ? "API On" : "API Off"}
                  </button>
                  <button
                    type="button"
                    onClick={() => isEditing ? setEditingId(null) : startEdit(product)}
                    className={`rounded-lg px-3 py-2 text-[11px] font-bold transition-all ${
                      isEditing
                        ? "bg-[#155cff] text-white"
                        : "bg-[#f4f6ff] text-[#155cff] hover:bg-[#e8ecff]"
                    }`}
                  >
                    {isEditing ? "Done" : "Edit"}
                  </button>
                </div>

                {/* Inline editor */}
                {isEditing && (
                  <div className="mt-3 grid gap-2 rounded-xl bg-[#f8faff] p-3 ring-1 ring-[#dfe6ff]">
                    <input
                      value={draft.title}
                      onChange={(e) => updateDraft(product.id, "title", e.target.value)}
                      placeholder="Title"
                      className="rounded-lg border border-[#dfe6ff] bg-white px-3 py-2 text-[12px] text-[#0a1128] outline-none focus:border-[#155cff]"
                    />
                    <textarea
                      value={draft.description}
                      onChange={(e) => updateDraft(product.id, "description", e.target.value)}
                      rows={2}
                      placeholder="Description"
                      className="rounded-lg border border-[#dfe6ff] bg-white px-3 py-2 text-[12px] text-[#0a1128] outline-none focus:border-[#155cff]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-[#9aa0b4]">Selling price ({currency})</label>
                        <input
                          type="number"
                          min={currency === "PKR" ? "1" : "0.01"}
                          step={currency === "PKR" ? "1" : "0.01"}
                          value={draft.priceUsd}
                          onChange={(e) => updateDraft(product.id, "priceUsd", e.target.value)}
                          className="mt-0.5 w-full rounded-lg border border-[#dfe6ff] bg-white px-2.5 py-1.5 text-[12px] text-[#0a1128] outline-none focus:border-[#155cff]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-[#9aa0b4]">Original price ({currency})</label>
                        <input
                          type="number"
                          min="0"
                          step={currency === "PKR" ? "1" : "0.01"}
                          value={draft.originalPrice}
                          onChange={(e) => updateDraft(product.id, "originalPrice", e.target.value)}
                          className="mt-0.5 w-full rounded-lg border border-[#dfe6ff] bg-white px-2.5 py-1.5 text-[12px] text-[#0a1128] outline-none focus:border-[#155cff]"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const sp = Number(draft.priceUsd);
                        const op = Number(draft.originalPrice || 0);
                        if (!Number.isFinite(sp) || sp <= 0) { toast.error("Selling price must be greater than 0"); return; }
                        const payload: any = {
                          id: product.id,
                          title: draft.title,
                          description: draft.description,
                          priceUsd: currencyToUsd(sp, currency),
                          priceCurrency: currency,
                          priceDisplayAmount: draft.priceUsd,
                        };
                        if (draft.originalPrice.trim() !== "") {
                          payload.originalPriceUsd = currencyToUsd(op, currency);
                          payload.originalPriceCurrency = currency;
                          payload.originalPriceDisplayAmount = draft.originalPrice;
                        }
                        updateProduct.mutate(payload);
                      }}
                      disabled={updateProduct.isPending}
                      className="rounded-lg bg-[#0a1128] px-4 py-2 text-[11px] font-bold text-white transition-all hover:bg-[#1a2040] disabled:opacity-40"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl bg-white p-12 text-center shadow-[0_4px_24px_rgba(12,37,104,0.06)] ring-1 ring-black/[0.04]">
          <p className="text-sm font-semibold text-[#9aa0b4]">
            {productRows.length === 0 ? "No 3rd party products yet. Click Sync Now." : `No ${statusFilter} products found.`}
          </p>
        </div>
      )}
    </div>
  );
}

function InventoryAdminPage() {
  type InventoryStatus = "available" | "reserved" | "sold" | "disabled";

  const location = useLocation();
  const requestedProductName = new URLSearchParams(location.search).get("productName") || "all";
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | "all">("all");
  const [productFilter, setProductFilter] = useState(requestedProductName);
  const [search, setSearch] = useState("");
  const [inventoryPage, setInventoryPage] = useState(0);
  const [stockOpen, setStockOpen] = useState(false);
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [statusDraft, setStatusDraft] = useState<InventoryStatus>("available");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [inventoryDraft, setInventoryDraft] = useState({ accountEmail: "", password: "", twoFaSecret: "", activationLink: "", instructions: "" });
  const { currency } = useCurrency();
  const utils = trpc.useUtils();
  const { data: directProducts, isLoading: productsLoading, error: productsError, refetch: refetchProducts } = trpc.admin.productList.useQuery();
  const products = useMemo(() => (directProducts ?? []) as any[], [directProducts]);
  const selectedFilterProduct = products.find((item: any) => item.name === productFilter) as any;
  const { data: inventory, isLoading: inventoryLoading, error: inventoryError, refetch: refetchInventory } = trpc.admin.inventoryList.useQuery({
    limit: 100,
    offset: inventoryPage * 100,
    productId: selectedFilterProduct?.id,
    status: statusFilter === "all" ? undefined : statusFilter,
  }, { enabled: productFilter !== "all" && Boolean(selectedFilterProduct?.id) });
  const inventoryItems = useMemo(() => (inventory ?? []) as any[], [inventory]);
  const productOptions = useMemo(() => Array.from(new Set(products.map((item: any) => String(item.name || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [products]);
  const inventoryTotals = useMemo(() => products.reduce((acc, product: any) => {
    const summary = product.inventorySummary ?? {};
    acc.available += Number(summary.available || 0);
    acc.reserved += Number(summary.reserved || 0);
    acc.sold += Number(summary.sold || 0);
    acc.disabled += Number(summary.disabled || 0);
    return acc;
  }, { available: 0, reserved: 0, sold: 0, disabled: 0 }), [products]);
  const filteredInventory = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return inventoryItems;
    return inventoryItems.filter((item: any) => [item.id, item.productName, item.planName, item.accountEmail, item.assignedUserName, item.assignedUserEmail, item.orderNumber, item.status].some((value) => String(value ?? "").toLowerCase().includes(needle)));
  }, [inventoryItems, search]);
  const selectedItem = inventoryItems.find((item: any) => item.id === reviewId) as any;
  const deleteItem = inventoryItems.find((item: any) => item.id === deleteId) as any;
  const [form, setForm] = useState({
    productName: requestedProductName === "all" ? "" : requestedProductName,
    productPrice: "",
    deliveryMethod: "instant" as "instant" | "whatsapp",
    accountRows: "",
    instructions: "",
  });
  const selectedDirectProduct = products.find((item: any) => item.name === form.productName) as any;
  const savedProductPriceUsd = Number(selectedDirectProduct?.plans?.[0]?.salePrice ?? selectedDirectProduct?.plans?.[0]?.price ?? 0);
  const productPriceNumber = Number(form.productPrice || 0);
  const productPriceUsd = productPriceNumber > 0 ? currencyToUsd(productPriceNumber, currency) : savedProductPriceUsd;
  const stockLineCount = form.accountRows.split(/\r?\n/).filter((line) => line.trim()).length;

  const resetForm = () => setForm({ productName: productFilter === "all" ? "" : productFilter, productPrice: "", deliveryMethod: "instant", accountRows: "", instructions: "" });
  const createStock = trpc.admin.stockCreate.useMutation({
    onSuccess: (data) => {
      toast.success(data.inserted > 0 ? `${data.inserted} stock accounts saved` : "Product saved");
      const nextProduct = form.productName.trim();
      setProductFilter(nextProduct || "all");
      setInventoryPage(0);
      setStockOpen(false);
      resetForm();
      utils.admin.productList.invalidate(); utils.admin.inventoryList.invalidate(); utils.admin.overview.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateInventory = trpc.admin.inventoryUpdate.useMutation({
    onSuccess: () => {
      toast.success("Inventory updated");
      setEditMode(false);
      utils.admin.inventoryList.invalidate(); utils.admin.productList.invalidate(); utils.admin.overview.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteInventory = trpc.admin.inventoryDelete.useMutation({
    onSuccess: () => {
      toast.success("Inventory item removed");
      setDeleteId(null); setDeleteConfirmed(false); setReviewId(null);
      utils.admin.inventoryList.invalidate(); utils.admin.productList.invalidate(); utils.admin.overview.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function openStock(productName?: string) {
    const next = productName || (productFilter === "all" ? "" : productFilter);
    setForm((current) => ({ ...current, productName: next, productPrice: "", accountRows: "", instructions: "" }));
    setStockOpen(true);
  }
  function openReview(item: any) {
    setReviewId(item.id); setShowSecrets(false); setEditMode(false); setStatusDraft(item.status as InventoryStatus);
    setInventoryDraft({ accountEmail: item.accountEmail || "", password: item.password || "", twoFaSecret: item.twoFaSecret || "", activationLink: item.activationLink || "", instructions: item.instructions || "" });
  }
  function copySecret(value: string, label: string) {
    navigator.clipboard.writeText(value).then(() => toast.success(`${label} copied`)).catch(() => toast.error("Copy failed"));
  }
  function statusTone(status: string) {
    if (status === "available") return "border-[#bde9ca] bg-[#edfff2] text-[#0b8f34]";
    if (status === "reserved") return "border-[#ffe0a8] bg-[#fff8e8] text-[#9b6200]";
    if (status === "sold") return "border-[#cbd9ff] bg-[#eef3ff] text-[#155cff]";
    return "border-[#d8ddea] bg-[#f4f6fa] text-[#596176]";
  }

  return (
    <div className="space-y-5">
      <section aria-label="Inventory metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Available stock", value: inventoryTotals.available, note: "Ready for delivery", icon: Boxes, tone: "border-[#bde9ca] bg-[linear-gradient(145deg,#ffffff,#edfff2)] shadow-[0_6px_0_#bfe8ca,0_14px_24px_rgba(11,143,52,0.08)]", valueTone: "text-[#0b8f34]" },
          { label: "Reserved", value: inventoryTotals.reserved, note: "Held against orders", icon: ClipboardList, tone: "border-[#ffe0a8] bg-[linear-gradient(145deg,#fffdf7,#fff6df)] shadow-[0_6px_0_#f2ddb9,0_14px_24px_rgba(184,120,0,0.08)]", valueTone: "text-[#9b6200]" },
          { label: "Sold items", value: inventoryTotals.sold, note: "Historical deliveries", icon: ShoppingBag, tone: "border-[#cbd9ff] bg-[linear-gradient(145deg,#ffffff,#eef3ff)] shadow-[0_6px_0_#c7d5f8,0_14px_24px_rgba(21,92,255,0.08)]", valueTone: "text-[#155cff]" },
          { label: "Disabled", value: inventoryTotals.disabled, note: "Blocked from delivery", icon: ShieldAlert, tone: "border-[#e1d4ff] bg-[linear-gradient(145deg,#ffffff,#f6f0ff)] shadow-[0_6px_0_#dfd1f4,0_14px_24px_rgba(109,53,255,0.07)]", valueTone: "text-[#6d35ff]" },
        ].map((metric) => <article key={metric.label} className={`rounded-xl border p-4 ${metric.tone}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8992aa]">{metric.label}</p><p className={`mt-3 text-2xl font-black tabular-nums ${metric.valueTone}`}>{metric.value.toLocaleString()}</p><p className="mt-1 text-[11px] text-[#7c8498]">{metric.note}</p></div><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white bg-white/80 text-[#155cff] shadow-sm"><metric.icon className="h-4 w-4" /></span></div></article>)}
      </section>

      <section className="overflow-hidden rounded-xl border border-[#dfe6ff] bg-white shadow-[0_14px_32px_rgba(12,37,104,0.08)]">
        <div className="border-b border-[#e8edff] p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div><p className="text-sm font-black text-[#050816]">Stock control</p><p className="mt-1 text-xs text-[#7c8498]">Review catalog availability, assignments, delivery state, and protected credentials.</p></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => { refetchProducts(); if (selectedFilterProduct) refetchInventory(); }} className="tap-target inline-flex items-center justify-center gap-2 rounded-lg border border-[#dfe6ff] bg-white px-3 py-2 text-xs font-bold text-[#596176]"><RefreshCw className="h-3.5 w-3.5" />Refresh</button>
              <button type="button" onClick={() => openStock()} className="tap-target inline-flex items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,#075dff,#6d35ff)] px-4 py-2 text-xs font-bold text-white shadow-md"><Boxes className="h-3.5 w-3.5" />Add stock</button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_220px_190px]">
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa3b8]" /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search account, user, order, plan, or ID" className="h-11 w-full rounded-lg border border-[#dfe6ff] bg-[#fbfcff] pl-9 pr-3 text-sm text-[#050816] outline-none focus:border-[#155cff]" /></div>
            <select value={productFilter} onChange={(e) => { setProductFilter(e.target.value); setInventoryPage(0); setSearch(""); setReviewId(null); }} className="h-11 rounded-lg border border-[#dfe6ff] bg-white px-3 text-sm text-[#050816] outline-none"><option value="all">All products overview</option>{productOptions.map((name) => <option key={name} value={name}>{name}</option>)}</select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as InventoryStatus | "all"); setInventoryPage(0); }} disabled={productFilter === "all"} className="h-11 rounded-lg border border-[#dfe6ff] bg-white px-3 text-sm text-[#050816] outline-none disabled:bg-[#f5f7fb] disabled:text-[#a2a9b9]"><option value="all">All stock states</option><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option><option value="disabled">Disabled</option></select>
          </div>
        </div>

        {productsLoading ? <div aria-busy="true" className="flex min-h-48 items-center justify-center gap-2 text-sm text-[#7c8498]"><Loader2 className="h-4 w-4 animate-spin" />Loading inventory controls...</div>
        : productsError ? <div role="alert" className="m-5 rounded-lg border border-[#ffc4d2] bg-[#fff3f6] p-4 text-sm text-[#b0163a]">Could not load catalog inventory. <button onClick={() => refetchProducts()} className="font-bold underline">Try again</button></div>
        : productFilter === "all" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left">
              <thead className="bg-[#f8faff] text-[10px] font-bold uppercase tracking-[0.1em] text-[#7c8498]"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Delivery</th><th className="px-4 py-3">Available</th><th className="px-4 py-3">Reserved</th><th className="px-4 py-3">Sold</th><th className="px-4 py-3">Disabled</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-[#edf0fa] text-xs">
                {products.map((product: any) => { const summary = product.inventorySummary ?? {}; return <tr key={product.id} className="hover:bg-[#fbfcff]"><td className="px-4 py-3"><p className="font-bold text-[#050816]">{product.name}</p><p className="mt-1 text-[11px] text-[#7c8498]">#{product.id} · {product.categoryName || "Uncategorized"}</p></td><td className="px-4 py-3"><span className="rounded-full border border-[#dfe6ff] bg-[#f6f8ff] px-2 py-1 font-bold text-[#596176]">{product.fulfillmentType === "whatsapp_activation" ? "Manual" : "Credentials"}</span></td><td className="px-4 py-3 font-black tabular-nums text-[#0b8f34]">{Number(summary.available || 0)}</td><td className="px-4 py-3 font-black tabular-nums text-[#9b6200]">{Number(summary.reserved || 0)}</td><td className="px-4 py-3 font-black tabular-nums text-[#155cff]">{Number(summary.sold || 0)}</td><td className="px-4 py-3 font-black tabular-nums text-[#596176]">{Number(summary.disabled || 0)}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => setProductFilter(product.name)} className="rounded-lg bg-[#eef3ff] px-3 py-2 font-bold text-[#155cff]">Review</button><button type="button" onClick={() => openStock(product.name)} className="rounded-lg bg-[#0a1128] px-3 py-2 font-bold text-white">Add</button></div></td></tr>; })}
                {products.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-[#7c8498]">No direct products are configured yet.</td></tr>}
              </tbody>
            </table>
          </div>
        ) : inventoryLoading ? <div aria-busy="true" className="flex min-h-48 items-center justify-center gap-2 text-sm text-[#7c8498]"><Loader2 className="h-4 w-4 animate-spin" />Loading protected inventory...</div>
        : inventoryError ? <div role="alert" className="m-5 rounded-lg border border-[#ffc4d2] bg-[#fff3f6] p-4 text-sm text-[#b0163a]">Could not load stock for this product. <button onClick={() => refetchInventory()} className="font-bold underline">Try again</button></div>
        : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[70rem] text-left">
                <thead className="bg-[#f8faff] text-[10px] font-bold uppercase tracking-[0.1em] text-[#7c8498]"><tr><th className="px-4 py-3">Inventory item</th><th className="px-4 py-3">Protected delivery</th><th className="px-4 py-3">Assignment</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Delivered</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
                <tbody className="divide-y divide-[#edf0fa] text-xs">
                  {filteredInventory.map((item: any) => <tr key={item.id} className="hover:bg-[#fbfcff]"><td className="px-4 py-3"><p className="font-bold text-[#050816]">{item.accountEmail || `${item.productName || productFilter} item`}</p><p className="mt-1 text-[11px] text-[#7c8498]">#{item.id} · {item.planName || "Any plan"}</p></td><td className="px-4 py-3"><p className="font-semibold text-[#596176]">{item.activationLink ? "Activation link" : item.password || item.twoFaSecret ? "Account credentials" : "Incomplete details"}</p><p className="mt-1 text-[11px] text-[#9aa3b8]">Masked until reviewed</p></td><td className="px-4 py-3"><p className="font-semibold text-[#050816]">{item.assignedUserName || item.assignedUserEmail || "Unassigned"}</p><p className="mt-1 text-[11px] text-[#7c8498]">{item.orderNumber || "No order"}</p></td><td className="px-4 py-3"><span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusTone(item.status)}`}>{String(item.status).replace(/_/g, " ")}</span></td><td className="px-4 py-3 text-[#596176]">{item.deliveredAt ? formatDate(item.deliveredAt) : "Not delivered"}</td><td className="px-4 py-3 text-right"><button type="button" onClick={() => openReview(item)} className="inline-flex items-center gap-1 rounded-lg bg-[#eef3ff] px-3 py-2 font-bold text-[#155cff]"><Eye className="h-3 w-3" />Review</button></td></tr>)}
                  {filteredInventory.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-[#7c8498]">No inventory matches this product and filter.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-[#e8edff] px-4 py-3 text-xs text-[#7c8498] sm:flex-row sm:items-center sm:justify-between"><span>Showing {filteredInventory.length} of {inventoryItems.length} rows on page {inventoryPage + 1}</span><div className="flex gap-2"><button type="button" onClick={() => setInventoryPage((page) => Math.max(0, page - 1))} disabled={inventoryPage === 0} className="rounded-lg border border-[#dfe6ff] bg-white px-3 py-2 font-bold text-[#155cff] disabled:opacity-40">Previous</button><button type="button" onClick={() => setInventoryPage((page) => page + 1)} disabled={inventoryItems.length < 100} className="rounded-lg border border-[#dfe6ff] bg-white px-3 py-2 font-bold text-[#155cff] disabled:opacity-40">Next</button></div></div>
          </>
        )}
      </section>

      {stockOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#050816]/55 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="stock-intake-title"><div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/70 bg-[#f8faff] shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#dfe6ff] bg-white/95 px-5 py-4 backdrop-blur"><div><h2 id="stock-intake-title" className="text-base font-black text-[#050816]">Stock intake</h2><p className="mt-1 text-xs text-[#7c8498]">Create or update a product and securely register delivery inventory.</p></div><button type="button" aria-label="Close stock intake" onClick={() => setStockOpen(false)} className="rounded-lg border border-[#dfe6ff] px-3 py-2 text-xs font-bold text-[#596176]">Close</button></div><div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#7c8498]">Product name</span><input list="inventory-product-options" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder="Select existing or enter new" className="mt-2 h-11 w-full rounded-lg border border-[#dfe6ff] bg-white px-3 text-sm text-[#050816] outline-none focus:border-[#155cff]" /><datalist id="inventory-product-options">{productOptions.map((name) => <option key={name} value={name} />)}</datalist></label><label className="block"><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#7c8498]">Price ({currency})</span><input type="number" min="0" step="0.01" value={form.productPrice} onChange={(e) => setForm({ ...form, productPrice: e.target.value })} placeholder={savedProductPriceUsd > 0 ? `Saved ${formatCurrency(savedProductPriceUsd, currency)}` : currency === "PKR" ? "5700" : "20.00"} className="mt-2 h-11 w-full rounded-lg border border-[#dfe6ff] bg-white px-3 text-sm text-[#050816] outline-none focus:border-[#155cff]" />{productPriceNumber > 0 && <span className="mt-1 block text-[11px] text-[#7c8498]">Stored as {formatCurrency(productPriceUsd, "USD")} · {formatCurrency(productPriceUsd, "PKR")}</span>}</label></div>
        <div><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#7c8498]">Delivery workflow</span><div className="mt-2 grid gap-2 sm:grid-cols-2">{[{ value: "instant", label: "Instant credentials", text: "Deliver saved credentials or activation links after payment." },{ value: "whatsapp", label: "Manual activation", text: "Hold the order for admin-assisted activation." }].map((option) => <button key={option.value} type="button" onClick={() => setForm({ ...form, deliveryMethod: option.value as "instant" | "whatsapp" })} className={`rounded-xl border p-4 text-left ${form.deliveryMethod === option.value ? "border-[#155cff] bg-[#eef3ff] text-[#155cff]" : "border-[#dfe6ff] bg-white text-[#596176]"}`}><span className="block text-sm font-black">{option.label}</span><span className="mt-1 block text-xs font-semibold">{option.text}</span></button>)}</div></div>
        <label className="block"><span className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#7c8498]"><span>Bulk secure items</span><span>{stockLineCount} non-empty lines</span></span><textarea value={form.accountRows} onChange={(e) => setForm({ ...form, accountRows: e.target.value })} rows={8} wrap="off" disabled={form.deliveryMethod === "whatsapp"} placeholder={"account@example.com,password,2FA\nhttps://activation.example.com/..."} className="stock-upload-textarea mt-2 w-full resize-y rounded-lg border border-[#dfe6ff] bg-white px-3 py-3 font-mono text-xs text-[#050816] outline-none focus:border-[#155cff] disabled:bg-[#f1f3f8]" /><span className="mt-1 block text-[11px] text-[#7c8498]">One account or activation link per line. Duplicate emails and links are rejected before insertion.</span></label>
        <label className="block"><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#7c8498]">Customer instructions</span><textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={4} placeholder="Setup, transfer, recovery, or activation instructions delivered with the item." className="mt-2 w-full rounded-lg border border-[#dfe6ff] bg-white px-3 py-3 text-sm text-[#050816] outline-none focus:border-[#155cff]" /></label></div>
        <aside className="space-y-3"><div className="rounded-xl border border-[#d8e2ff] bg-white p-4"><p className="text-xs font-black uppercase tracking-wide text-[#155cff]">Intake summary</p><dl className="mt-3 space-y-3 text-xs"><div><dt className="text-[#7c8498]">Catalog action</dt><dd className="mt-1 font-bold text-[#050816]">{selectedDirectProduct ? "Update existing product" : "Create product if new"}</dd></div><div><dt className="text-[#7c8498]">Stored price</dt><dd className="mt-1 font-bold text-[#050816]">{productPriceUsd > 0 ? `${formatCurrency(productPriceUsd, "USD")} · ${formatCurrency(productPriceUsd, "PKR")}` : "Price required"}</dd></div><div><dt className="text-[#7c8498]">Inventory insertion</dt><dd className="mt-1 font-bold text-[#050816]">{form.deliveryMethod === "instant" ? `${stockLineCount} item${stockLineCount === 1 ? "" : "s"}` : "No credential rows"}</dd></div></dl></div><div className="rounded-xl border border-[#ffe0a8] bg-[#fff9ea] p-4 text-xs text-[#76520b]"><p className="flex items-center gap-2 font-black"><ShieldAlert className="h-4 w-4" />Sensitive input</p><p className="mt-2 leading-5">Credentials are encrypted by the backend. Verify product, price, row count, and delivery workflow before saving. Never paste supplier or platform API keys here.</p></div></aside>
      </div><div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-[#dfe6ff] bg-white/95 px-5 py-4 backdrop-blur sm:flex-row sm:justify-end"><button type="button" onClick={() => setStockOpen(false)} className="rounded-lg border border-[#dfe6ff] px-4 py-2.5 text-sm font-bold text-[#596176]">Cancel</button><button type="button" onClick={() => { if (!form.productName.trim() || productPriceUsd <= 0) return toast.error("Product name and a valid price are required"); if (form.deliveryMethod === "instant" && stockLineCount === 0) return toast.error("Add at least one stock row for instant delivery"); createStock.mutate({ productName: form.productName.trim(), productPrice: productPriceUsd, deliveryMethod: form.deliveryMethod, accountRows: form.accountRows, instructions: form.instructions }); }} disabled={createStock.isPending || !form.productName.trim() || productPriceUsd <= 0 || (form.deliveryMethod === "instant" && stockLineCount === 0)} className="rounded-lg bg-[linear-gradient(135deg,#075dff,#6d35ff)] px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">{createStock.isPending ? "Saving secure stock..." : `Save ${form.deliveryMethod === "instant" ? stockLineCount : "manual"} stock`}</button></div></div></div>}

      {selectedItem && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#050816]/55 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="inventory-review-title"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/70 bg-[#f8faff] shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#dfe6ff] bg-white/95 px-5 py-4 backdrop-blur"><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#155cff]">Protected inventory #{selectedItem.id}</p><h2 id="inventory-review-title" className="mt-1 text-base font-black text-[#050816]">{selectedItem.productName || productFilter}</h2><p className="mt-1 text-xs text-[#7c8498]">{selectedItem.planName || "Any plan"} · {selectedItem.accountEmail || "Activation item"}</p></div><button type="button" aria-label="Close inventory review" onClick={() => setReviewId(null)} className="rounded-lg border border-[#dfe6ff] px-3 py-2 text-xs font-bold text-[#596176]">Close</button></div><div className="space-y-4 p-5">
        <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-[#dfe6ff] bg-white p-4"><p className="text-[10px] font-bold uppercase text-[#7c8498]">Status</p><span className={`mt-3 inline-block rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusTone(selectedItem.status)}`}>{selectedItem.status}</span></div><div className="rounded-xl border border-[#dfe6ff] bg-white p-4"><p className="text-[10px] font-bold uppercase text-[#7c8498]">Assignment</p><p className="mt-3 text-sm font-black text-[#050816]">{selectedItem.assignedUserName || selectedItem.assignedUserEmail || "Unassigned"}</p><p className="mt-1 text-[11px] text-[#7c8498]">{selectedItem.orderNumber || "No linked order"}</p></div><div className="rounded-xl border border-[#dfe6ff] bg-white p-4"><p className="text-[10px] font-bold uppercase text-[#7c8498]">Delivery</p><p className="mt-3 text-sm font-black text-[#050816]">{selectedItem.deliveredAt ? formatDate(selectedItem.deliveredAt) : "Not delivered"}</p></div></section>
        <section className="rounded-xl border border-[#dfe6ff] bg-white p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-[#050816]">Protected delivery details</p><p className="mt-1 text-xs text-[#7c8498]">Sensitive values stay masked until explicitly revealed.</p></div><button type="button" onClick={() => setShowSecrets((value) => !value)} className="rounded-lg bg-[#eef3ff] px-3 py-2 text-xs font-bold text-[#155cff]">{showSecrets ? "Hide values" : "Reveal values"}</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{[{ label: "Password", value: selectedItem.password },{ label: "2FA secret", value: selectedItem.twoFaSecret },{ label: "Activation link", value: selectedItem.activationLink }].filter((field) => field.value).map((field) => <div key={field.label} className="min-w-0 rounded-lg border border-[#e4e9f8] bg-[#f8faff] p-3"><p className="text-[10px] font-bold uppercase text-[#7c8498]">{field.label}</p><p className="safe-wrap mt-2 font-mono text-xs text-[#050816]">{showSecrets ? field.value : "••••••••••••"}</p>{showSecrets && <button type="button" onClick={() => copySecret(String(field.value), field.label)} className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#155cff]"><Copy className="h-3 w-3" />Copy</button>}</div>)}{!selectedItem.password && !selectedItem.twoFaSecret && !selectedItem.activationLink && <p className="text-xs text-[#b0163a]">No delivery credential is stored for this item.</p>}</div></section>
        <section className="rounded-xl border border-[#dfe6ff] bg-white p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-[#050816]">Inventory management</p><p className="mt-1 text-xs text-[#7c8498]">Status updates are explicit and sold items cannot return to available.</p></div><button type="button" onClick={() => setEditMode((value) => !value)} disabled={!["available","disabled"].includes(selectedItem.status)} className="rounded-lg border border-[#dfe6ff] px-3 py-2 text-xs font-bold text-[#155cff] disabled:opacity-40">{editMode ? "Close editor" : "Edit details"}</button></div><div className="mt-4 flex flex-col gap-2 sm:flex-row"><select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value as InventoryStatus)} className="h-10 flex-1 rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs text-[#050816]"><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option><option value="disabled">Disabled</option></select><button type="button" onClick={() => updateInventory.mutate({ id: selectedItem.id, status: statusDraft })} disabled={statusDraft === selectedItem.status || updateInventory.isPending || (selectedItem.status === "sold" && statusDraft === "available")} className="rounded-lg bg-[#0a1128] px-4 py-2 text-xs font-bold text-white disabled:opacity-40">Save status</button></div>{selectedItem.status === "sold" && statusDraft === "available" && <p className="mt-2 text-xs font-semibold text-[#b0163a]">Sold inventory cannot be returned to available stock.</p>}
        {editMode && <div className="mt-4 grid gap-3 rounded-xl bg-[#f8faff] p-4 ring-1 ring-[#dfe6ff] sm:grid-cols-2"><input value={inventoryDraft.accountEmail} onChange={(e) => setInventoryDraft({ ...inventoryDraft, accountEmail: e.target.value })} placeholder="Account email" className="h-10 rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs" /><input value={inventoryDraft.password} onChange={(e) => setInventoryDraft({ ...inventoryDraft, password: e.target.value })} placeholder="Password" className="h-10 rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs" /><input value={inventoryDraft.twoFaSecret} onChange={(e) => setInventoryDraft({ ...inventoryDraft, twoFaSecret: e.target.value })} placeholder="2FA secret" className="h-10 rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs" /><input value={inventoryDraft.activationLink} onChange={(e) => setInventoryDraft({ ...inventoryDraft, activationLink: e.target.value })} placeholder="Activation link" className="h-10 rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs" /><textarea value={inventoryDraft.instructions} onChange={(e) => setInventoryDraft({ ...inventoryDraft, instructions: e.target.value })} rows={3} placeholder="Instructions" className="rounded-lg border border-[#dfe6ff] bg-white px-3 py-2 text-xs sm:col-span-2" /><button type="button" onClick={() => updateInventory.mutate({ id: selectedItem.id, accountEmail: inventoryDraft.accountEmail.trim(), password: inventoryDraft.password, twoFaSecret: inventoryDraft.twoFaSecret, activationLink: inventoryDraft.activationLink, instructions: inventoryDraft.instructions })} disabled={updateInventory.isPending || !inventoryDraft.accountEmail.trim()} className="rounded-lg bg-[#155cff] px-4 py-2.5 text-xs font-black text-white disabled:opacity-40 sm:col-span-2">Save protected details</button></div>}
        </section>
        {(["available","disabled"].includes(selectedItem.status)) && <div className="flex justify-end"><button type="button" onClick={() => { setDeleteId(selectedItem.id); setDeleteConfirmed(false); }} className="inline-flex items-center gap-2 rounded-lg border border-[#ffc4d2] bg-[#fff3f6] px-4 py-2 text-xs font-bold text-[#b0163a]"><Trash2 className="h-3.5 w-3.5" />Remove inventory item</button></div>}
      </div></div></div>}

      {deleteItem && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#050816]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="inventory-delete-title"><div className="w-full max-w-md rounded-2xl border border-[#ffc4d2] bg-white p-5 shadow-2xl"><h2 id="inventory-delete-title" className="text-base font-black text-[#050816]">Remove inventory item #{deleteItem.id}?</h2><p className="mt-2 text-sm leading-6 text-[#596176]">This permanently deletes an {deleteItem.status} stock record and its encrypted delivery details. Sold or reserved records cannot be removed.</p><label className="mt-4 flex items-start gap-3 rounded-xl border border-[#ffe0a8] bg-[#fff9ea] p-3 text-xs font-semibold text-[#76520b]"><input type="checkbox" checked={deleteConfirmed} onChange={(e) => setDeleteConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4" />I verified the product, item ID, status, and understand this cannot be undone.</label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => { setDeleteId(null); setDeleteConfirmed(false); }} className="rounded-lg border border-[#dfe6ff] px-4 py-2 text-xs font-bold text-[#596176]">Cancel</button><button type="button" onClick={() => deleteInventory.mutate({ id: deleteItem.id })} disabled={!deleteConfirmed || deleteInventory.isPending} className="rounded-lg bg-[#b0163a] px-4 py-2 text-xs font-black text-white disabled:opacity-40">{deleteInventory.isPending ? "Removing..." : "Permanently remove"}</button></div></div></div>}
    </div>
  );
}

function LogsAdminPage() {
  const { data: logs } = trpc.admin.auditLogList.useQuery({ limit: 100 });

  return (
    <div className="rounded-2xl bg-white shadow-[0_16px_42px_rgba(12,37,104,0.1)] ring-1 ring-[#dfe6ff] p-6">
      <h3 className="font-medium text-[#050816]">Audit Logs</h3>
      <div className="mt-4 space-y-3">
        {logs?.map((log: any) => (
          <div key={log.id} className="rounded-lg border border-[#dfe6ff] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-[#050816]">{log.action}</p>
                <p className="text-xs text-[#7c8498]">{log.entityType} #{log.entityId || "N/A"} by user #{log.actorId || "system"}</p>
              </div>
              <span className="text-xs text-[#596176]">{formatDate(log.createdAt)}</span>
            </div>
            {log.metadata && (
              <pre className="mt-3 overflow-x-auto rounded-lg bg-[#f7f9ff] p-3 text-xs text-[#596176] ring-1 ring-[#dfe6ff]">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            )}
          </div>
        ))}
        {(!logs || logs.length === 0) && <p className="text-sm text-[#7c8498]">No logs yet</p>}
      </div>
    </div>
  );
}

function ProvidersAdminPage() {
  const { data: providers } = trpc.admin.providerList.useQuery();
  const utils = trpc.useUtils();

  const approveMutation = trpc.admin.providerApprove.useMutation({
    onSuccess: () => { toast.success("Approved!"); utils.admin.providerList.invalidate(); },
  });
  const rejectMutation = trpc.admin.providerReject.useMutation({
    onSuccess: () => { toast.success("Rejected!"); utils.admin.providerList.invalidate(); },
  });

  return (
    <div className="rounded-2xl bg-white shadow-[0_16px_42px_rgba(12,37,104,0.1)] ring-1 ring-[#dfe6ff] p-6">
      <h3 className="font-medium text-[#050816]">Provider Applications</h3>
      <div className="mt-4 space-y-3">
        {providers?.map((p: any) => (
          <div key={p.id} className="rounded-lg border border-[#e7ecff] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="safe-wrap text-sm text-[#050816]">{p.serviceName} by {p.fullName}</p>
                <p className="safe-wrap text-xs text-[#7c8498]">{p.email} &middot; Stock: {p.availableStock}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {p.status === "pending" ? (
                  <>
                    <button onClick={() => approveMutation.mutate({ id: p.id })} className="rounded bg-[#eafff0] px-3 py-1 text-xs text-[#0b8f34]">Approve</button>
                    <button onClick={() => rejectMutation.mutate({ id: p.id, adminNote: "Rejected" })} className="rounded bg-[#fff0f4] px-3 py-1 text-xs text-[#d11f4a]">Reject</button>
                  </>
                ) : (
                  <span className={`text-xs capitalize ${p.status === "approved" ? "text-[#0b8f34]" : "text-[#d11f4a]"}`}>{p.status}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SupportAdminPage() {
  const [statusFilter, setStatusFilter] = useState<"open" | "waiting_customer" | "in_progress" | "resolved" | "closed" | "all">("all");
  const [search, setSearch] = useState("");
  const { data: tickets } = trpc.admin.supportList.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search || undefined,
  });
  const [replyText, setReplyText] = useState("");
  const [activeTicket, setActiveTicket] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const replyMutation = trpc.admin.supportReply.useMutation({
    onSuccess: () => { toast.success("Reply sent!"); setReplyText(""); utils.admin.supportList.invalidate(); },
  });
  const updateStatus = trpc.admin.supportUpdateStatus.useMutation({
    onSuccess: () => { toast.success("Ticket updated"); utils.admin.supportList.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteTicket = trpc.admin.supportDelete.useMutation({
    onSuccess: () => { toast.success("Ticket deleted"); utils.admin.supportList.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-medium text-[#050816]">Support Tickets</h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets..."
            className="rounded-lg border border-[#dfe6ff] bg-white px-3 py-2 text-xs text-[#050816] outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-lg border border-[#dfe6ff] bg-white px-3 py-2 text-xs text-[#050816] outline-none"
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_customer">Waiting for Customer</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>
      {tickets?.map((t: any) => (
        <div key={t.id} className="rounded-2xl bg-white shadow-[0_16px_42px_rgba(12,37,104,0.1)] ring-1 ring-[#dfe6ff] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-[#050816]">{t.subject}</p>
              <p className="mt-1 text-xs text-[#7c8498]">
                {t.userName || "Customer"}{t.userEmail ? ` (${t.userEmail})` : ""} {t.orderNumber ? `- ${t.orderNumber}` : ""}
              </p>
            </div>
            <select
              value={t.status}
              onChange={(e) => updateStatus.mutate({ ticketId: t.id, status: e.target.value as "open" | "waiting_customer" | "in_progress" | "resolved" | "closed" })}
              className="rounded-lg border border-[#dfe6ff] bg-white px-3 py-2 text-xs text-[#050816] outline-none"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_customer">Waiting for Customer</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <p className="mt-1 text-xs text-[#596176]">{t.message}</p>
          {t.attachmentName && (
            <a
              href={t.attachmentUrl}
              download={t.attachmentName}
              className="tap-target mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#eef3ff] px-3 py-1.5 text-xs font-black text-[#155cff]"
            >
              <Paperclip className="h-3.5 w-3.5" />
              {t.attachmentName}
            </a>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTicket(activeTicket === t.id ? null : t.id)}
              className="tap-target rounded-lg bg-[#eef3ff] px-3 py-2 text-xs text-[#155cff]"
            >
              {activeTicket === t.id ? "Cancel" : "Reply"}
            </button>
            <button
              onClick={() => updateStatus.mutate({ ticketId: t.id, status: "resolved" })}
              className="tap-target rounded-lg bg-[#eafff0] px-3 py-2 text-xs text-[#0b8f34]"
            >
              Resolve
            </button>
            <button
              onClick={() => updateStatus.mutate({ ticketId: t.id, status: "closed" })}
              className="tap-target rounded-lg bg-[#fff7df] px-3 py-2 text-xs text-[#9b6200]"
            >
              Close
            </button>
            <button
              onClick={() => {
                if (confirm("Delete this support ticket?")) {
                  deleteTicket.mutate({ ticketId: t.id });
                }
              }}
              className="tap-target inline-flex items-center gap-1 rounded-lg bg-[#fff0f4] px-3 py-2 text-xs text-[#d11f4a]"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          </div>
          {activeTicket === t.id && (
            <div className="mt-2 flex gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type reply..."
                className="flex-1 rounded-lg border border-[#dfe6ff] bg-white px-3 py-2 text-xs text-[#050816] outline-none"
              />
              <button
                onClick={() => {
                  if (!replyText.trim()) {
                    toast.error("Reply cannot be empty");
                    return;
                  }
                  replyMutation.mutate({ ticketId: t.id, message: replyText });
                }}
                className="tap-target rounded-lg bg-[#eef3ff] px-3 py-2 text-xs text-[#155cff]"
              >
                Send
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ToolRequestsAdminPage() {
  const [statusFilter, setStatusFilter] = useState<"new" | "reviewing" | "available" | "replied" | "closed" | "all">("all");
  const [search, setSearch] = useState("");
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const utils = trpc.useUtils();
  const { data: requests } = trpc.admin.toolRequestList.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search || undefined,
    limit: 100,
    offset: 0,
  });

  const updateRequest = trpc.admin.toolRequestUpdate.useMutation({
    onSuccess: () => {
      toast.success("Request updated");
      setActiveReplyId(null);
      setReplyText("");
      utils.admin.toolRequestList.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-medium text-[#050816]">Tool / Service Requests</h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requests..."
            className="rounded-lg border border-[#dfe6ff] bg-white px-3 py-2 text-xs text-[#050816] outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-lg border border-[#dfe6ff] bg-white px-3 py-2 text-xs text-[#050816] outline-none"
          >
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="reviewing">Reviewing</option>
            <option value="available">Available</option>
            <option value="replied">Replied</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {requests?.map((request: any) => (
        <div key={request.id} className="rounded-2xl bg-white p-5 shadow-[0_16px_42px_rgba(12,37,104,0.1)] ring-1 ring-[#dfe6ff]">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#eef3ff] px-3 py-1 text-xs font-black capitalize text-[#155cff]">
                  {request.requestType}
                </span>
                <span className="rounded-full bg-[#fff7df] px-3 py-1 text-xs font-black capitalize text-[#9b6200]">
                  {request.status}
                </span>
              </div>
              <h4 className="mt-3 text-lg font-black text-[#050816]">{request.itemName}</h4>
              <p className="mt-1 text-xs text-[#7c8498]">
                {request.requesterName} ({request.requesterEmail}) - {formatDate(request.createdAt)}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-[#f7f9ff] p-3 ring-1 ring-[#dfe6ff]">
                  <p className="text-xs font-black uppercase tracking-wide text-[#7c8498]">Plan</p>
                  <p className="mt-1 text-sm font-semibold text-[#050816]">{request.desiredPlan}</p>
                </div>
                <div className="rounded-xl bg-[#f7f9ff] p-3 ring-1 ring-[#dfe6ff]">
                  <p className="text-xs font-black uppercase tracking-wide text-[#7c8498]">Budget</p>
                  <p className="mt-1 text-sm font-semibold text-[#050816]">{request.budget}</p>
                </div>
              </div>
              {request.notes && (
                <p className="mt-3 rounded-xl bg-[#f7f9ff] p-3 text-sm text-[#596176] ring-1 ring-[#dfe6ff]">
                  {request.notes}
                </p>
              )}
              {request.adminReply && (
                <div className="mt-3 rounded-xl bg-[#eef3ff] p-3 ring-1 ring-[#cfd9ff]">
                  <p className="text-xs font-black uppercase tracking-wide text-[#155cff]">Admin Reply</p>
                  <p className="mt-1 text-sm text-[#39415d]">{request.adminReply}</p>
                </div>
              )}
            </div>

            <div>
              {request.screenshotDataUrl ? (
                <a href={request.screenshotDataUrl} target="_blank" rel="noreferrer">
                  <img
                    src={request.screenshotDataUrl}
                    alt={`${request.itemName} screenshot`}
                    loading="lazy"
                    decoding="async"
                    className="h-36 w-full rounded-xl object-cover ring-1 ring-[#dfe6ff]"
                  />
                </a>
              ) : (
                <div className="flex h-36 items-center justify-center rounded-xl bg-[#f7f9ff] text-xs font-semibold text-[#7c8498] ring-1 ring-[#dfe6ff]">
                  No screenshot
                </div>
              )}
              <select
                value={request.status}
                onChange={(e) => updateRequest.mutate({ id: request.id, status: e.target.value as "new" | "reviewing" | "available" | "replied" | "closed" })}
                className="mt-3 w-full rounded-lg border border-[#dfe6ff] bg-white px-3 py-2 text-xs text-[#050816] outline-none"
              >
                <option value="new">New</option>
                <option value="reviewing">Reviewing</option>
                <option value="available">Available</option>
                <option value="replied">Replied</option>
                <option value="closed">Closed</option>
              </select>
              <button
                onClick={() => {
                  setActiveReplyId(activeReplyId === request.id ? null : request.id);
                  setReplyText(request.adminReply || "");
                }}
                className="tap-target mt-2 w-full rounded-lg bg-[#eef3ff] px-3 py-2 text-xs font-bold text-[#155cff]"
              >
                Reply
              </button>
            </div>
          </div>

          {activeReplyId === request.id && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply to this request..."
                className="min-w-0 flex-1 rounded-lg border border-[#dfe6ff] bg-white px-3 py-2 text-sm text-[#050816] outline-none"
              />
              <button
                onClick={() => {
                  if (!replyText.trim()) {
                    toast.error("Reply cannot be empty");
                    return;
                  }
                  updateRequest.mutate({ id: request.id, adminReply: replyText.trim() });
                }}
                className="tap-target rounded-lg bg-[linear-gradient(135deg,#075dff,#6d35ff)] px-5 py-2 text-sm font-black text-white"
              >
                Send Reply
              </button>
            </div>
          )}
        </div>
      ))}

      {(!requests || requests.length === 0) && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm font-semibold text-[#7c8498] ring-1 ring-[#dfe6ff]">
          No tool or service requests yet.
        </div>
      )}
    </div>
  );
}

function ScammerReportsAdminPage() {
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const utils = trpc.useUtils();
  const { data: reports } = trpc.admin.scammerReportList.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search || undefined,
    limit: 100,
    offset: 0,
  });

  const updateReport = trpc.admin.scammerReportUpdate.useMutation({
    onSuccess: () => {
      toast.success("Scammer report updated");
      utils.admin.scammerReportList.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteReport = trpc.admin.scammerReportDelete.useMutation({
    onSuccess: () => {
      toast.success("Scammer report deleted");
      utils.admin.scammerReportList.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-medium text-[#050816]">Scammer Reports</h3>
          <p className="mt-1 text-sm font-semibold text-[#7c8498]">Approve reports before they appear on the public scammers page.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search number, platform..."
            className="rounded-lg border border-[#dfe6ff] bg-white px-3 py-2 text-xs text-[#050816] outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-lg border border-[#dfe6ff] bg-white px-3 py-2 text-xs text-[#050816] outline-none"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All statuses</option>
          </select>
        </div>
      </div>

      {reports?.map((report: any) => (
        <div key={report.id} className="rounded-2xl bg-white p-5 shadow-[0_16px_42px_rgba(12,37,104,0.1)] ring-1 ring-[#dfe6ff]">
          <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#fff0f4] px-3 py-1 text-xs font-black text-[#d11f4a]">
                  {report.phoneNumber}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${
                  report.status === "approved" ? "bg-[#eafff0] text-[#0b8f34]" :
                  report.status === "rejected" ? "bg-[#fff0f4] text-[#d11f4a]" :
                  "bg-[#fff7df] text-[#9b6200]"
                }`}>
                  {report.status}
                </span>
              </div>
              <h4 className="mt-3 text-lg font-black text-[#050816]">{report.scammerName || "Unknown name"}</h4>
              <p className="mt-1 text-xs text-[#7c8498]">
                Submitted by {report.userName || "User"}{report.userEmail ? ` (${report.userEmail})` : ""} - {formatDate(report.createdAt)}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-[#f7f9ff] p-3 ring-1 ring-[#dfe6ff]">
                  <p className="text-xs font-black uppercase tracking-wide text-[#7c8498]">Platform</p>
                  <p className="safe-wrap mt-1 text-sm font-semibold text-[#050816]">{report.platform || "Not provided"}</p>
                </div>
                <div className="rounded-xl bg-[#f7f9ff] p-3 ring-1 ring-[#dfe6ff]">
                  <p className="text-xs font-black uppercase tracking-wide text-[#7c8498]">Amount Lost</p>
                  <p className="safe-wrap mt-1 text-sm font-semibold text-[#050816]">{report.amountLost || "Not provided"}</p>
                </div>
              </div>
              <p className="safe-wrap mt-3 rounded-xl bg-[#f7f9ff] p-3 text-sm text-[#596176] ring-1 ring-[#dfe6ff]">
                {report.description}
              </p>
              {report.adminNote && (
                <p className="mt-3 rounded-xl bg-[#eef3ff] p-3 text-sm font-semibold text-[#155cff] ring-1 ring-[#cfd9ff]">
                  {report.adminNote}
                </p>
              )}
            </div>

            <div>
              {report.proofScreenshots?.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {report.proofScreenshots.slice(0, 4).map((proof: string, index: number) => (
                    <a key={`${report.id}-${index}`} href={proof} target="_blank" rel="noreferrer">
                      <img
                        src={proof}
                        alt={`Proof ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="h-28 w-full rounded-xl object-cover ring-1 ring-[#dfe6ff]"
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="flex h-36 items-center justify-center rounded-xl bg-[#f7f9ff] text-xs font-semibold text-[#7c8498] ring-1 ring-[#dfe6ff]">
                  No proof uploaded
                </div>
              )}
              <textarea
                value={notes[report.id] ?? report.adminNote ?? ""}
                onChange={(e) => setNotes({ ...notes, [report.id]: e.target.value })}
                placeholder="Admin note..."
                rows={3}
                className="mt-3 w-full rounded-lg border border-[#dfe6ff] bg-white px-3 py-2 text-xs text-[#050816] outline-none"
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateReport.mutate({ id: report.id, status: "approved", adminNote: notes[report.id] })}
                  disabled={updateReport.isPending}
                  className="tap-target inline-flex items-center justify-center gap-1 rounded-lg bg-[#eafff0] px-3 py-2 text-xs font-black text-[#0b8f34] disabled:opacity-50"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Approve
                </button>
                <button
                  onClick={() => updateReport.mutate({ id: report.id, status: "rejected", adminNote: notes[report.id] })}
                  disabled={updateReport.isPending}
                  className="tap-target inline-flex items-center justify-center gap-1 rounded-lg bg-[#fff0f4] px-3 py-2 text-xs font-black text-[#d11f4a] disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </button>
                <button
                  onClick={() => updateReport.mutate({ id: report.id, status: "pending", adminNote: notes[report.id] })}
                  disabled={updateReport.isPending}
                  className="tap-target rounded-lg bg-[#fff7df] px-3 py-2 text-xs font-black text-[#9b6200] disabled:opacity-50"
                >
                  Pending
                </button>
                <button
                  onClick={() => {
                    if (confirm("Delete this scammer report?")) {
                      deleteReport.mutate({ id: report.id });
                    }
                  }}
                  disabled={deleteReport.isPending}
                  className="tap-target inline-flex items-center justify-center gap-1 rounded-lg bg-[#f7f9ff] px-3 py-2 text-xs font-black text-[#596176] disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {(!reports || reports.length === 0) && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm font-semibold text-[#7c8498] ring-1 ring-[#dfe6ff]">
          No scammer reports found.
        </div>
      )}
    </div>
  );
}

type SettingFieldDef = {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "url" | "number" | "qr";
  hint?: string;
  helper?: string;
};

type SettingsSectionDef = {
  id: string;
  title: string;
  description: string;
  gradient: string;         // CSS gradient for the card accent
  iconBg: string;           // Tailwind bg class for icon container
  fields: SettingFieldDef[];
};

function SettingsSectionCard({
  section,
  editing,
  onChange,
  onSaveSection,
  isSaving,
  savedValues,
  lastSavedSection,
}: {
  section: SettingsSectionDef;
  editing: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onSaveSection: (sectionId: string) => void;
  isSaving: boolean;
  savedValues: Record<string, string>;
  lastSavedSection: string | null;
}) {
  const dirtyKeys = section.fields.filter((f) =>
    Object.prototype.hasOwnProperty.call(editing, f.key)
  );
  const hasChanges = dirtyKeys.length > 0;
  const justSaved = lastSavedSection === section.id;
  const svgIcon = SECTION_ICONS[section.id] ?? SECTION_ICONS.custom;

  return (
    <div className="group relative overflow-hidden rounded-3xl bg-white shadow-[0_4px_24px_rgba(12,37,104,0.06)] ring-1 ring-black/[0.04] transition-all duration-300 hover:shadow-[0_8px_40px_rgba(12,37,104,0.1)]">
      {/* Gradient accent bar */}
      <div
        className="absolute left-0 top-0 h-full w-1.5 rounded-l-3xl opacity-40 transition-opacity duration-300 group-hover:opacity-70"
        style={{ background: section.gradient }}
      />

      {/* Header with 3D icon */}
      <div className="flex flex-col gap-5 px-7 py-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className={`shrink-0 rounded-2xl p-1.5 ${section.iconBg}`}>
            {svgIcon}
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-[15px] font-bold text-[#0a1128]">{section.title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-[#5c6478]">{section.description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:pt-1">
          {justSaved && (
            <span className="flex animate-fade-in items-center gap-1.5 rounded-full bg-[#eafff0] px-3 py-1.5 text-[12px] font-bold text-[#0b8f34]">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          <button
            onClick={() => onSaveSection(section.id)}
            disabled={!hasChanges || isSaving}
            className={`shrink-0 rounded-xl px-5 py-2.5 text-[13px] font-bold transition-all duration-200 ${
              hasChanges
                ? "bg-[#0a1128] text-white shadow-[0_2px_12px_rgba(10,17,40,0.15)] hover:bg-[#1a2040] hover:shadow-[0_4px_16px_rgba(10,17,40,0.2)] active:scale-[0.97]"
                : "cursor-not-allowed bg-[#f4f6ff] text-[#bcc3d9]"
            }`}
          >
            {isSaving ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
              </span>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="border-t border-[#f0f3ff] px-7 py-5">
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {section.fields.map((field) => {
            const savedValue = savedValues[field.key] ?? "";
            const isDirty = Object.prototype.hasOwnProperty.call(editing, field.key);
            const isQR = field.key === "binance_pay_qr_url";
            return (
              <div key={field.key} className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#5c6478]">
                  {field.label}
                </label>
                {field.hint && !isQR && (
                  <p className="text-[10px] leading-tight text-[#a0a8b8]">{field.hint}</p>
                )}
                <div className="relative">
                  <input
                    type={field.type === "qr" ? "text" : (field.type ?? "text")}
                    defaultValue={savedValue}
                    placeholder={field.placeholder}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    className={`w-full rounded-xl border bg-white px-4 py-2.5 text-[13px] text-[#0a1128] outline-none transition-all duration-200 placeholder:text-[#bcc3d9] ${
                      isQR ? "pr-10" : ""
                    } ${
                      isDirty
                        ? "border-[#155cff] bg-[#f8faff] shadow-[0_0_0_3px_rgba(21,92,255,0.06)]"
                        : "border-[#e8ecff] hover:border-[#c8cee0] focus:border-[#155cff] focus:shadow-[0_0_0_3px_rgba(21,92,255,0.06)]"
                    }`}
                  />
                  {isDirty && !isQR && (
                    <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
                      <div className="h-2.5 w-2.5 rounded-full bg-[#155cff] shadow-[0_0_8px_rgba(21,92,255,0.4)]" />
                    </div>
                  )}
                  {isQR && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <label className="tap-target flex cursor-pointer items-center rounded-lg p-1 text-[#9aa0b4] transition-colors hover:bg-[#f4f6ff] hover:text-[#155cff]">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            // In a real app you'd upload to a CDN first — here we convert to data URL for quick preview
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const dataUrl = ev.target?.result as string;
                              if (dataUrl) onChange(field.key, dataUrl);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      {savedValue && (
                        <a
                          href={savedValue.startsWith("data:") ? "#" : savedValue}
                          target={savedValue.startsWith("data:") ? undefined : "_blank"}
                          rel="noopener noreferrer"
                          className="tap-target rounded-lg p-1 text-[#9aa0b4] transition-colors hover:bg-[#f4f6ff] hover:text-[#155cff]"
                          title="View QR image"
                          onClick={(e) => {
                            if (savedValue.startsWith("data:")) {
                              e.preventDefault();
                              // Open in new tab as image
                              const w = window.open("", "_blank");
                              if (w) {
                                w.document.write(`<img src="${savedValue}" style="max-width:100%" />`);
                                w.document.title = "QR Code";
                              }
                            }
                          }}
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="20" rx="2" /><path d="M8 8h.01" /><path d="M16 8h.01" /><path d="M12 12h.01" /><path d="M8 16h.01" /><path d="M16 16h.01" />
                          </svg>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SettingsAdminPage() {
  const { data: settings } = trpc.admin.settingsList.useQuery();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [lastSavedSection, setLastSavedSection] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("general");

  const updateMutation = trpc.admin.settingsUpdate.useMutation();
  const merchantStatusQuery = trpc.binancePay.merchantStatus.useQuery(undefined, { enabled: activeSection === "binance", refetchOnWindowFocus: false });
  const [binanceCredentials, setBinanceCredentials] = useState({ apiKey: "", apiSecret: "" });
  const credentialsSave = trpc.binancePay.credentialsSave.useMutation({
    onSuccess: async (result) => {
      if (result.saved) {
        toast.success(`Binance Pay merchant connected · ${result.latency}ms`);
        setBinanceCredentials({ apiKey: "", apiSecret: "" });
        await merchantStatusQuery.refetch();
      } else toast.error(result.error || "Binance Pay verification failed");
    },
    onError: (error) => toast.error(error.message),
  });
  const credentialsVerify = trpc.binancePay.credentialsVerify.useMutation({
    onSuccess: async (result) => {
      if (result.ok) {
        toast.success(`Binance Pay verified · ${result.latency}ms`);
      } else {
        toast.error(result.error || "Verification failed");
      }
      await merchantStatusQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  const liveToggle = trpc.binancePay.liveToggle.useMutation({
    onSuccess: async (result) => {
      toast.success(result.liveEnabled ? "Binance Pay Live enabled" : "Binance Pay Live disabled");
      await merchantStatusQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  function handleChange(key: string, value: string) {
    setEditing((prev) => ({ ...prev, [key]: value }));
  }

  function handleSaveSection(sectionId: string) {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    const dirty = section.fields.filter((f) =>
      Object.prototype.hasOwnProperty.call(editing, f.key)
    );
    if (dirty.length === 0) return;

    const updates = dirty.map((f) => ({ key: f.key, value: editing[f.key] }));

    Promise.all(
      updates.map(
        (u) =>
          new Promise<void>((resolve, reject) => {
            updateMutation.mutate(u, {
              onSuccess: () => resolve(),
              onError: (err) => reject(err),
            });
          }),
      ),
    )
      .then(() => {
        toast.success(`${section!.title} updated`);
        setLastSavedSection(sectionId);
        setEditing((prev) => {
          const next = { ...prev };
          for (const f of section!.fields) delete next[f.key];
          return next;
        });
        utils.admin.settingsList.invalidate();
        setTimeout(() => setLastSavedSection(null), 3000);
      })
      .catch(() => {
        toast.error("Some settings failed to save.");
      });
  }

  const sections: SettingsSectionDef[] = [
    {
      id: "general",
      title: "General",
      description: "Site identity, contact details, and branding.",
      gradient: "linear-gradient(180deg, #155cff, #6d35ff)",
      iconBg: "bg-[#f4f6ff]",
      fields: [
        { key: "site_name", label: "Site Name", placeholder: "Sasify" },
        { key: "support_email", label: "Support Email", placeholder: "help@sasify.solutions" },
        { key: "whatsapp_number", label: "WhatsApp Number", placeholder: "+92 3XX XXXXXXX", hint: "Shown on contact page" },
        { key: "whatsapp_link", label: "WhatsApp Link", placeholder: "https://wa.me/923XX...", hint: "Direct WhatsApp contact link used for manual activation orders" },
      ],
    },
    {
      id: "wallet",
      title: "Local Wallets",
      description: "Mobile wallet details shown at checkout.",
      gradient: "linear-gradient(180deg, #0b8f34, #06b6d4)",
      iconBg: "bg-[#ecfdf5]",
      fields: [
        { key: "nayapay_payment_details", label: "NayaPay", placeholder: "NayaPay: 03XX XXXXXXX — Name" },
        { key: "easypaisa_payment_details", label: "EasyPaisa", placeholder: "EasyPaisa: 03XX XXXXXXX — Name" },
        { key: "jazzcash_payment_details", label: "JazzCash", placeholder: "JazzCash: 03XX XXXXXXX — Name" },
        { key: "usdt_wallet", label: "USDT (TRC20)", placeholder: "TRC20 wallet address" },
        { key: "usdt_bep20_wallet", label: "USDT (BEP20)", placeholder: "BEP20 wallet address" },
      ],
    },
    {
      id: "binance",
      title: "Binance Pay",
      description: "Crypto payment gateway configuration.",
      gradient: "linear-gradient(180deg, #f0b90b, #f7931a)",
      iconBg: "bg-[#fff7ed]",
      fields: [
        { key: "binance_pay_id", label: "Binance Pay ID", placeholder: "515591853" },
        { key: "binance_pay_name", label: "Display Name", placeholder: "SyedSarosh" },
        { key: "binance_pay_nickname", label: "Nickname", placeholder: "Optional" },
        { key: "binance_pay_qr_url", label: "QR Code", placeholder: "Paste image URL or click to upload", type: "qr", hint: "" },
      ],
    },
    {
      id: "templates",
      title: "Templates",
      description: "Activate a complete visual design across the public website.",
      gradient: "linear-gradient(180deg, #3157ff, #45d7ff)",
      iconBg: "bg-[#eef3ff]",
      fields: [],
    },
    {
      id: "dashboard-templates",
      title: "Dashboard Templates",
      description: "Choose independent user and admin dashboard designs.",
      gradient: "linear-gradient(180deg, #0a1128, #155cff)",
      iconBg: "bg-[#eef3ff]",
      fields: [],
    },
    {
      id: "referrals",
      title: "Referral Program",
      description: "Configure user and reseller commission percentages.",
      gradient: "linear-gradient(180deg, #0b8f34, #155cff)",
      iconBg: "bg-[#eaf8ef]",
      fields: [],
    },
    {
      id: "providers",
      title: "3rd-Party Providers",
      description: "Manage supplier API keys and verify wallet connections.",
      gradient: "linear-gradient(180deg, #155cff, #f0b90b)",
      iconBg: "bg-[#f4f6ff]",
      fields: [],
    },
    {
      id: "exchange",
      title: "Exchange Rate",
      description: "Set the USD to PKR conversion rate for all displayed prices.",
      gradient: "linear-gradient(180deg, #155cff, #0b8f34)",
      iconBg: "bg-[#f0fdf4]",
      fields: [
        { key: "usd_to_pkr", label: "1 USD = ? PKR", type: "number", placeholder: "285", hint: "All USD prices will be multiplied by this rate" },
      ],
    },
  ];

  // ── Provider API Keys state
  const [providerKeys, setProviderKeys] = useState<Record<ProviderName, string>>({
    technysoft: "", canboso: "", akunding: "", zoomstore: "", ssondigital: "",
  });
  const [savingProvider, setSavingProvider] = useState<ProviderName | null>(null);
  const [providerResults, setProviderResults] = useState<Record<ProviderName, {
    ok: boolean; balance: number | null; currency: string | null; latency: number; error: string | null; saved: boolean;
    maskedKey?: string;
  } | null>>({ technysoft: null, canboso: null, akunding: null, zoomstore: null, ssondigital: null });
  const [providerLoaded, setProviderLoaded] = useState(false);

  const providerSave = trpc.providerSettings.providerKeySave.useMutation();

  // Load saved provider wallet data on mount
  useEffect(() => {
    if (!settings || providerLoaded) return;

    const loadProviderWallets = async () => {
      for (const provider of PROVIDER_LIST) {
        const settingKey = `${provider}_api_key`;
        const saved = settings.find((s: any) => s.key === settingKey);
        if (saved?.configured) {
          const maskedValue = saved.maskedValue || "••••••••";
          // Fetch wallet using the saved server-side key; no credential value reaches the browser.
          try {
            const res = await utils.client.providerSettings.providerWallet.query({ provider });
            if (res?.ok && res.balance != null) {
              setProviderResults((prev) => ({
                ...prev,
                [provider]: {
                  ok: true,
                  balance: res.balance,
                  currency: res.currency,
                  latency: res.latency,
                  error: null,
                  saved: true,
                  maskedKey: maskedValue,
                },
              }));
            } else {
              setProviderResults((prev) => ({
                ...prev,
                [provider]: {
                  ok: false,
                  balance: null,
                  currency: null,
                  latency: res?.latency ?? 0,
                  error: res?.error || "Key not verified",
                  saved: true,
                  maskedKey: maskedValue,
                },
              }));
            }
          } catch {
            setProviderResults((prev) => ({
              ...prev,
              [provider]: {
                ok: false, balance: null, currency: null, latency: 0,
                error: "Failed to fetch", saved: true, maskedKey: maskedValue,
              },
            }));
          }
        }
      }
      setProviderLoaded(true);
    };

    loadProviderWallets();
  }, [settings, providerLoaded, utils.client.providerSettings.providerWallet]);

  function maskKey(value: string) {
    if (!value || value.length <= 8) return value ? `${value.slice(0, 4)}****` : "";
    return `${value.slice(0, 8)}${"*".repeat(Math.min(value.length - 8, 20))}`;
  }

  function handleProviderSave(provider: ProviderName) {
    const apiKey = providerKeys[provider].trim();
    if (!apiKey) {
      toast.error("Please enter an API key");
      return;
    }
    setSavingProvider(provider);
    providerSave.mutate(
      { provider, apiKey },
      {
        onSuccess: (data) => {
          setProviderResults((prev) => ({
            ...prev,
            [provider]: {
              ok: data.saved && !!data.wallet,
              balance: data.wallet?.balance ?? null,
              currency: data.wallet?.currency ?? null,
              latency: data.latency ?? 0,
              error: data.error,
              saved: data.saved,
              maskedKey: data.saved ? maskKey(apiKey) : undefined,
            },
          }));
          if (data.saved && data.wallet) {
            toast.success(`${provider} connected — ${data.wallet.balance} ${data.wallet.currency}`);
            setProviderKeys((prev) => ({ ...prev, [provider]: "" }));
          } else {
            toast.error(data.error || "Verification failed");
          }
          setSavingProvider(null);
        },
        onError: (err) => {
          setProviderResults((prev) => ({
            ...prev,
            [provider]: { ok: false, balance: null, currency: null, latency: 0, error: err.message, saved: false },
          }));
          toast.error(err.message);
          setSavingProvider(null);
        },
      },
    );
  }

  const providerLabels: Record<ProviderName, { name: string; desc: string }> = {
    technysoft: { name: "Technysoft", desc: "X-API-Key auth — wallet balance in USD" },
    canboso: { name: "Canboso", desc: "API v2 query-key auth — wallet balance in USD" },
    akunding: { name: "Akunding", desc: "Bearer token auth — balance in RMB" },
    zoomstore: { name: "ZoomStore", desc: "X-API-Key auth — automatic purchasing supported" },
    ssondigital: { name: "SSOn Digital", desc: "X-API-Key auth — manual fulfillment only" },
  };

  const providerGradients: Record<ProviderName, string> = {
    technysoft: "linear-gradient(135deg, #155cff, #5b21b6)",
    canboso: "linear-gradient(135deg, #0b8f34, #06b6d4)",
    akunding: "linear-gradient(135deg, #f97316, #ef4444)",
    zoomstore: "linear-gradient(135deg, #7c3aed, #2563eb)",
    ssondigital: "linear-gradient(135deg, #111827, #64748b)",
  };

  const savedValues: Record<string, string> = {};
  if (settings) {
    for (const s of settings) {
      savedValues[s.key] = "value" in s && typeof s.value === "string" ? s.value : "";
    }
  }

  const activeSectionData = sections.find((s) => s.id === activeSection) ?? sections[0];

  return (
    <div className="flex flex-col gap-0 lg:flex-row lg:gap-0">
      {/* Settings sidebar */}
      <div className="shrink-0 lg:w-60">
        <div className="rounded-2xl bg-white p-3 shadow-[0_4px_20px_rgba(12,37,104,0.05)] ring-1 ring-black/[0.04] lg:sticky lg:top-5">
          <div className="px-2.5 py-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#a0a8b8]">Settings</p>
          </div>
          <nav className="mt-1 flex flex-col gap-0.5">
            {sections.map((section) => {
              const isActive = activeSection === section.id;
              const dirtyCount = section.fields.filter((f) =>
                Object.prototype.hasOwnProperty.call(editing, f.key)
              ).length;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-all duration-150 ${
                    isActive
                      ? "bg-[#f4f6ff] ring-1 ring-[#d4daf0]"
                      : "hover:bg-[#f8f9ff]"
                  }`}
                >
                  <div className="shrink-0">{cloneElement((SIDEBAR_ICONS[section.id] ?? SIDEBAR_ICONS.custom) as React.ReactElement<{ className?: string }>)}</div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[13px] font-semibold leading-tight ${isActive ? "text-[#0a1128]" : "text-[#5c6478]"}`}>
                      {section.title}
                    </p>
                  </div>
                  {dirtyCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#155cff] px-1.5 text-[10px] font-bold text-white">
                      {dirtyCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content — active section */}
      <div className="min-w-0 flex-1 lg:pl-6">
        {activeSection === "templates" ? (
          <SiteTemplateSettings />
        ) : activeSection === "dashboard-templates" ? (
          <DashboardTemplateSettings />
        ) : activeSection === "referrals" ? (
          <ReferralSettingsPanel />
        ) : activeSection === "binance" ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_rgba(12,37,104,0.06)] ring-1 ring-black/[0.04]">
              <div className="border-b border-[#f0f3ff] px-6 py-5 sm:px-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#9b6200]">Merchant API</p>
                    <h3 className="mt-1 text-[17px] font-black text-[#0a1128]">Binance Pay Live checkout</h3>
                    <p className="mt-1 max-w-2xl text-[12px] leading-5 text-[#5c6478]">Paste the API Identity Key and API Secret from Binance Merchant Portal. Both values are verified live, encrypted, and never shown again.</p>
                  </div>
                  <span className={`inline-flex w-fit items-center rounded-full px-3 py-1.5 text-[11px] font-bold ${merchantStatusQuery.data?.liveEnabled ? "bg-[#eaf8ef] text-[#0b8f34]" : merchantStatusQuery.data?.configured ? "bg-[#fff7df] text-[#9b6200]" : "bg-[#f4f6ff] text-[#7c8498]"}`}>
                    {merchantStatusQuery.data?.liveEnabled ? "Live enabled" : merchantStatusQuery.data?.configured ? "Configured · disabled" : "Setup needed"}
                  </span>
                </div>
              </div>

              <div className="grid gap-5 px-6 py-5 sm:px-7 lg:grid-cols-2">
                <label className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#5c6478]">
                  API Identity Key
                  <input type="password" autoComplete="new-password" value={binanceCredentials.apiKey} onChange={(event) => setBinanceCredentials((current) => ({ ...current, apiKey: event.target.value }))} placeholder={merchantStatusQuery.data?.identityKeyConfigured ? "Saved securely — paste a replacement" : "Paste API Identity Key"} className="mt-2 h-11 w-full rounded-xl border border-[#e8ecff] bg-white px-3.5 text-[13px] normal-case tracking-normal text-[#0a1128] outline-none placeholder:text-[#bcc3d9] focus:border-[#f0b90b] focus:ring-2 focus:ring-[#f0b90b]/10" />
                  {merchantStatusQuery.data?.identityKeyConfigured && <span className="mt-1.5 block text-[10px] normal-case tracking-normal text-[#9aa0b4]">Saved value: ••••••••</span>}
                </label>
                <label className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#5c6478]">
                  API Secret Key
                  <input type="password" autoComplete="new-password" value={binanceCredentials.apiSecret} onChange={(event) => setBinanceCredentials((current) => ({ ...current, apiSecret: event.target.value }))} placeholder={merchantStatusQuery.data?.secretKeyConfigured ? "Saved securely — paste a replacement" : "Paste API Secret Key"} className="mt-2 h-11 w-full rounded-xl border border-[#e8ecff] bg-white px-3.5 text-[13px] normal-case tracking-normal text-[#0a1128] outline-none placeholder:text-[#bcc3d9] focus:border-[#f0b90b] focus:ring-2 focus:ring-[#f0b90b]/10" />
                  {merchantStatusQuery.data?.secretKeyConfigured && <span className="mt-1.5 block text-[10px] normal-case tracking-normal text-[#9aa0b4]">Saved value: ••••••••</span>}
                </label>
              </div>

              <div className="border-t border-[#f0f3ff] px-6 py-5 sm:px-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#0a1128]">Webhook URL</p>
                    <p className="mt-1 break-all font-mono text-[11px] text-[#7c8498]">{merchantStatusQuery.data?.webhookUrl || "Loading…"}</p>
                  </div>
                  <button type="button" onClick={() => navigator.clipboard.writeText(merchantStatusQuery.data?.webhookUrl || "").then(() => toast.success("Webhook URL copied"), () => toast.error("Could not copy"))} disabled={!merchantStatusQuery.data?.webhookUrl || merchantStatusQuery.data.webhookUrl === "Not configured"} className="shrink-0 rounded-xl border border-[#dfe6ff] bg-white px-4 py-2.5 text-xs font-bold text-[#155cff] disabled:opacity-40">Copy URL</button>
                </div>

                <div className="mt-4 flex flex-col gap-3 rounded-xl bg-[#f8faff] p-4 ring-1 ring-[#dfe6ff] sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#0a1128]">{merchantStatusQuery.data?.verifiedAt ? "Merchant credentials verified" : "Merchant verification required"}</p>
                    <p className="mt-1 text-[11px] text-[#7c8498]">{merchantStatusQuery.data?.verifiedAt ? `Last verified ${new Date(merchantStatusQuery.data.verifiedAt).toLocaleString()}` : "Save both Merchant Portal values to run a read-only live check."}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {merchantStatusQuery.data?.configured && <button type="button" onClick={() => credentialsVerify.mutate()} disabled={credentialsVerify.isPending} className="rounded-xl border border-[#dfe6ff] bg-white px-4 py-2.5 text-xs font-bold text-[#0a1128] disabled:opacity-50">{credentialsVerify.isPending ? "Checking…" : "Verify saved"}</button>}
                    <button type="button" onClick={() => credentialsSave.mutate(binanceCredentials)} disabled={credentialsSave.isPending || !binanceCredentials.apiKey.trim() || !binanceCredentials.apiSecret.trim()} className="rounded-xl bg-[#0a1128] px-5 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{credentialsSave.isPending ? "Verifying…" : "Save & Verify"}</button>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#ffe2aa] bg-[#fffaf0] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-xs font-bold text-[#0a1128]">Accept live Binance Pay orders</p><p className="mt-1 text-[11px] leading-4 text-[#7c8498]">Enabling performs a fresh credential probe. Turning it off blocks new orders but reconciliation continues for pending payments.</p></div>
                  <button type="button" role="switch" aria-checked={Boolean(merchantStatusQuery.data?.liveEnabled)} onClick={() => liveToggle.mutate({ enabled: !merchantStatusQuery.data?.liveEnabled })} disabled={liveToggle.isPending || !merchantStatusQuery.data?.configured} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${merchantStatusQuery.data?.liveEnabled ? "bg-[#0b8f34]" : "bg-[#cbd2e6]"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${merchantStatusQuery.data?.liveEnabled ? "translate-x-6" : "translate-x-1"}`} /></button>
                </div>
              </div>
            </div>

            <SettingsSectionCard key={activeSectionData.id} section={activeSectionData} editing={editing} onChange={handleChange} onSaveSection={handleSaveSection} isSaving={updateMutation.isPending} savedValues={savedValues} lastSavedSection={lastSavedSection} />
          </div>
        ) : activeSection === "providers" ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-6 shadow-[0_4px_24px_rgba(12,37,104,0.06)] ring-1 ring-black/[0.04]">
              <div className="mb-4">
                <h3 className="text-[15px] font-bold text-[#0a1128]">3rd-Party Provider Keys</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[#5c6478]">Paste your API key and hit Save & Verify — wallet balance fetches live.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {PROVIDER_LIST.map((provider) => {
                  const result = providerResults[provider];
                  const isSavingThis = savingProvider === provider;
                  const info = providerLabels[provider];

                  return (
                    <div
                      key={provider}
                      className="relative overflow-hidden rounded-2xl border border-[#e8ecff] bg-white p-5 shadow-[0_2px_12px_rgba(12,37,104,0.04)] transition-shadow hover:shadow-[0_4px_20px_rgba(12,37,104,0.08)]"
                    >
                      {/* Top accent */}
                      <div
                        className="absolute inset-x-0 top-0 h-1"
                        style={{ background: providerGradients[provider] }}
                      />

                      <div className="mb-3">
                        <p className="text-sm font-bold capitalize text-[#0a1128]">{info.name}</p>
                        <p className="mt-0.5 text-[11px] leading-tight text-[#9aa0b4]">{info.desc}</p>
                      </div>

                      <input
                        type="password"
                        autoComplete="new-password"
                        placeholder={result?.maskedKey ? "Saved key configured — paste a replacement" : "Paste API key..."}
                        value={providerKeys[provider]}
                        onChange={(e) =>
                          setProviderKeys((prev) => ({ ...prev, [provider]: e.target.value }))
                        }
                        className="w-full rounded-xl border border-[#e8ecff] bg-white px-3.5 py-2.5 text-[13px] text-[#0a1128] outline-none transition-all placeholder:text-[#bcc3d9] focus:border-[#155cff] focus:shadow-[0_0_0_3px_rgba(21,92,255,0.06)]"
                      />

                      {result?.maskedKey && (
                        <p className="mt-1.5 text-[10px] font-medium text-[#9aa0b4]">
                          Saved key: {result.maskedKey}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => handleProviderSave(provider)}
                        disabled={isSavingThis || !providerKeys[provider].trim()}
                        className={`mt-2 w-full rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                          isSavingThis
                            ? "bg-[#f4f6ff] text-[#bcc3d9]"
                            : "bg-[#0a1128] text-white shadow-[0_2px_8px_rgba(10,17,40,0.12)] hover:bg-[#1a2040] active:scale-[0.98]"
                        }`}
                      >
                        {isSavingThis ? (
                          <span className="flex items-center justify-center gap-1.5">
                            <Loader2 className="h-3 w-3 animate-spin" /> Verifying...
                          </span>
                        ) : (
                          "Save & Verify"
                        )}
                      </button>

                      {result && (
                        <div className="mt-3 rounded-xl bg-[#f8faff] p-3 ring-1 ring-[#dfe6ff]">
                          {result.ok && result.balance != null ? (
                            <div className="space-y-1">
                              <p className="text-lg font-bold tabular-nums text-[#0a1128]">
                                {result.balance.toLocaleString()} {result.currency}
                              </p>
                              <p className="text-[11px] font-medium text-[#0b8f34]">✓ Connected · {result.latency}ms</p>
                            </div>
                          ) : (
                            <p className="text-[12px] font-semibold text-[#d11f4a]">
                              ✗ {result.error || "Verification failed"}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <SettingsSectionCard
            key={activeSectionData.id}
            section={activeSectionData}
            editing={editing}
            onChange={handleChange}
            onSaveSection={handleSaveSection}
            isSaving={updateMutation.isPending}
            savedValues={savedValues}
            lastSavedSection={lastSavedSection}
          />
        )}
      </div>
    </div>
  );
}

function AdminNotFound() {
  return (
    <div className="rounded-2xl bg-white p-10 text-center shadow-[0_16px_42px_rgba(12,37,104,0.1)] ring-1 ring-[#dfe6ff]">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#9aa0b4]">404</p>
      <h2 className="mt-2 text-xl font-black text-[#0a1128]">Admin page not found</h2>
      <p className="mt-2 text-sm text-[#596176]">This admin route does not exist or is no longer available.</p>
      <Link to="/admin" className="mt-5 inline-flex rounded-lg bg-[#0a1128] px-4 py-2 text-sm font-bold text-white hover:bg-[#1a2040]">
        Back to overview
      </Link>
    </div>
  );
}

export default function Admin() {
  const location = useLocation();
  const { user, isLoading, logout } = useAuth({ redirectOnUnauthenticated: true });
  const { currency, setCurrency } = useCurrency();
  const { data: siteSettings } = trpc.public.siteSettings.useQuery(undefined, { staleTime: 30_000, refetchOnWindowFocus: false });
  const { data: themeSettings } = trpc.siteTheme.current.useQuery(undefined, { enabled: user?.role === "admin", staleTime: 30_000, refetchOnWindowFocus: false });
  const siteTemplate = resolveSiteTemplate(siteSettings?.site_template);
  const adminDashboardTemplate = resolveDashboardTemplate(themeSettings?.adminDashboardTemplate, siteTemplate);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f9ff]">
        <div className="h-16 w-16 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-[#dfe6ff]" />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f9ff] px-4">
        <div className="rounded-2xl bg-white p-8 text-center shadow-[0_16px_42px_rgba(12,37,104,0.1)] ring-1 ring-[#dfe6ff]">
          <h1 className="text-2xl font-black text-[#050816]">Access Denied</h1>
          <p className="mt-2 text-[#596176]">You need admin privileges to access this page.</p>
          <Link to="/" className="mt-4 inline-flex rounded-full bg-[#eef3ff] px-4 py-2 text-sm font-black text-[#155cff]">Go Home</Link>
        </div>
      </div>
    );
  }

  const activePath = location.pathname.length > 1 ? location.pathname.replace(/\/+$/, "") : location.pathname;
  const pageTitle = routeTitles[activePath] ?? "Page not found";

  const renderContent = () => {
    switch (activePath) {
      case "/admin": return <Overview />;
      case "/admin/users": return <UsersPage />;
      case "/admin/users/detail": return <UserDetailAdminPage />;
      case "/admin/deposits": return <DepositsPage />;
      case "/admin/orders": return <OrdersAdminPage />;
      case "/admin/profit": return <ProfitDashboard />;
      case "/admin/pending-fulfillment": return <OrdersAdminPage pendingOnly />;
      case "/admin/products": return <ProductsAdminPage />;
      case "/admin/third-party-products": return <ThirdPartyProductsAdminPage />;
      case "/admin/inventory": return <InventoryAdminPage />;
      case "/admin/providers": return <ProvidersAdminPage />;
      case "/admin/requests": return <ToolRequestsAdminPage />;
      case "/admin/support": return <SupportAdminPage />;
      case "/admin/scammer-reports": return <ScammerReportsAdminPage />;
      case "/admin/logs": return <LogsAdminPage />;
      case "/admin/referrals": return <AdminReferralPanel />;
      case "/admin/site-customize": return <SiteCustomizer />;
      case "/admin/settings": return <SettingsAdminPage />;
      default: return <AdminNotFound />;
    }
  };

  return (
    <div className="sas-admin-dashboard min-h-screen overflow-hidden bg-[#f4f7ff] text-[#050816]" data-dashboard-template={adminDashboardTemplate}>
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,#eef4ff_0%,#f8fbff_42%,#eef3ff_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.28] [background-image:linear-gradient(rgba(21,92,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(21,92,255,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      <Sidebar />
      <a href="#admin-main" className="sr-only z-50 rounded-lg bg-[#0a1128] px-4 py-2 text-sm font-black text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to admin content</a>
      <div className="relative lg:pl-64">
        <header className="fixed inset-x-0 top-0 z-30 h-16 border-b border-[#dfe6ff]/70 bg-white/90 px-4 backdrop-blur-2xl shadow-[0_4px_18px_rgba(12,37,104,0.05)] sm:px-6 lg:left-64 lg:px-8">
          <div className="flex h-full items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#ffe2aa] bg-[#fff7df] text-[#9b6200] shadow-sm"><ShieldAlert className="h-[18px] w-[18px]" /></span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold text-[#9aa0b4]">Operator workspace</p>
                <h1 className="truncate text-[15px] font-black text-[#0a1128]">{pageTitle}</h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden items-center rounded-full border border-[#e4e9ff] bg-[#f8faff] p-0.5 shadow-[0_2px_8px_rgba(12,37,104,0.04)] sm:flex" role="group" aria-label="Display currency">
                {(["USD", "PKR"] as const).map((c) => <button key={c} type="button" aria-pressed={currency === c} onClick={() => setCurrency(c)} className={`flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold transition-all ${currency === c ? (c === "USD" ? "bg-[#155cff] text-white shadow-[0_2px_6px_rgba(21,92,255,0.25)]" : "bg-[#0b8f34] text-white shadow-[0_2px_6px_rgba(11,143,52,0.25)]") : "text-[#9aa0b4] hover:text-[#5c6478]"}`}><img src={`/flags/${c === "USD" ? "us" : "pk"}.png`} alt="" width="16" height="12" className="rounded-[2px]" /> {c}</button>)}
              </div>
              <div className="flex items-center rounded-full border border-[#e4e9ff] bg-[#f8faff] p-0.5 sm:hidden" role="group" aria-label="Display currency">
                {(["USD", "PKR"] as const).map((c) => <button key={c} type="button" title={`Use ${c}`} aria-pressed={currency === c} onClick={() => setCurrency(c)} className={`flex h-9 w-9 items-center justify-center rounded-full ${currency === c ? (c === "USD" ? "bg-[#155cff]" : "bg-[#0b8f34]") : ""}`}><img src={`/flags/${c === "USD" ? "us" : "pk"}.png`} alt={c} width="16" height="11" className="rounded-[1px]" /></button>)}
              </div>
              <button type="button" onClick={() => logout()} aria-label="Logout" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ffd6df] bg-white text-[#d11f4a] transition-colors hover:bg-[#fff0f4] lg:hidden"><LogOut className="h-4 w-4" /></button>
            </div>
          </div>
        </header>
        <div aria-hidden="true" className="h-16" />
        <MobileAdminNav />
        <main id="admin-main" className="px-4 pb-10 pt-5 sm:px-6 lg:px-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

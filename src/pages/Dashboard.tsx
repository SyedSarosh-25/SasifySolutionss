import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Wallet, ShoppingBag, MessageSquare,
  User, LogOut, MessageCircle, Paperclip, ArrowRight,
  Headphones, ShieldCheck, ShieldAlert, TrendingUp, CreditCard,
  Clock, CheckCircle2, AlertCircle, Eye, X, Copy,
  Search, PackageCheck, LockKeyhole, Store, RefreshCw, LifeBuoy,
  Building2, BadgeCheck, ExternalLink, Hash, Mail, Shield, Send
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import { currencyToUsd } from "@/lib/currency";
import { useCurrency } from "@/hooks/useCurrency";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

import ReferralDashboard from "@/referral/ReferralDashboard";
import { resolveDashboardTemplate, resolveSiteTemplate } from "@/site-theme/templates";

const paymentMethodLabels = {
  usdt_trc20: "USDT TRC20",
  usdt_bep20: "USDT BEP20",
  easypaisa: "EasyPaisa",
  nayapay: "NayaPay",
  jazzcash: "JazzCash",
  binance_pay: "Binance Pay",
} as const;

function readPaymentScreenshot(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read payment screenshot"));
    reader.readAsDataURL(file);
  });
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(date?: Date | string | null) {
  if (!date) return "Not delivered";
  return new Date(date).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function readSupportAttachment(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read attachment"));
    reader.readAsDataURL(file);
  });
}


function parseLocalPaymentDetails(value?: string | null) {
  if (!value?.trim()) return { accountNumber: "Not configured", accountName: "Update in admin settings" };
  const segments = value.split(":");
  const details = (segments.length > 1 ? segments.slice(1).join(":") : segments[0]).trim();
  const parts = details.split(" - ").map((p) => p.trim()).filter(Boolean);
  return { accountNumber: parts[0] || details, accountName: parts[1] || "Account holder" };
}

// ── Navigation ──

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Wallet", icon: Wallet, href: "/dashboard/wallet" },
  { label: "Orders", icon: ShoppingBag, href: "/dashboard/orders" },
  { label: "Referrals", icon: TrendingUp, href: "/dashboard/referrals" },
  { label: "Support", icon: MessageSquare, href: "/dashboard/support" },
  { label: "Scammer Reports", icon: ShieldAlert, href: "/dashboard/scammer-reports" },
  { label: "Profile", icon: User, href: "/dashboard/profile" },
  { label: "Provider", icon: Store, href: "/dashboard/provider" },
];

function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 flex-col border-r border-white/20 bg-white/60 backdrop-blur-2xl lg:flex" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(248,250,255,0.7))" }}>
      <div className="border-b border-[#f0f3ff]/60 px-5 py-5">
        <Link to="/" className="flex items-center gap-3">
          <img src="/brand/sasify-logo.jpg" alt="" width="40" height="40" decoding="async" className="h-10 w-10 rounded-xl border border-[#dfe6ff]/60 object-cover" />
          <div>
            <p className="text-base font-bold text-[#0a1128]">SASIFY</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9aa0b4]">Dashboard</p>
          </div>
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#9aa0b4]">Account</p>
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.label}
              to={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all ${
                isActive
                  ? "bg-[#155cff] text-white shadow-[0_8px_20px_rgba(21,92,255,0.22)]"
                  : "text-[#5c6478] hover:bg-white/80 hover:text-[#0a1128]"
              }`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                isActive ? "bg-white/15 text-white" : "bg-[#f4f6ff] text-[#5c6478] group-hover:bg-[#e8ecff]"
              }`}>
                <item.icon className="h-4 w-4" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="border-t border-[#f0f3ff]/60 p-4 space-y-2">
        <Link to="/tools" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#155cff] px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#0d4fd9]">
          Browse Tools
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#ffd6df]/60 bg-white/60 px-4 py-2.5 text-[13px] font-bold text-[#d11f4a] transition-colors hover:bg-[#fff0f4]">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </aside>
  );
}

function MobileDashboardNav({ variant = "inline" }: { variant?: "inline" | "below" } = {}) {
  const location = useLocation();
  // "inline" stays where it was; "below" hides it on sm+ (sidebar handles desktop) and
  // uses a clean horizontal scroll row directly under the sticky header on mobile.
  const isInline = variant === "inline";
  return (
    <nav aria-label="Customer dashboard" className={`-mx-4 overflow-x-auto border-t border-[#dfe6ff]/50 bg-white/55 px-4 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:hidden ${isInline ? "mt-5 border-y" : "mt-3"}`}>
      <div className="flex min-w-max gap-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link key={item.label} to={item.href} aria-current={isActive ? "page" : undefined} className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-all ${
              isActive ? "bg-[#155cff] text-white shadow-[0_6px_16px_rgba(21,92,255,0.2)]" : "bg-[#f4f6ff] text-[#5c6478] hover:text-[#155cff]"
            }`}>
              <item.icon className="h-3.5 w-3.5" /> {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ── Dashboard Home ──

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    delivered: "bg-[#ecfdf5] text-[#0b8f34]",
    completed: "bg-[#ecfdf5] text-[#0b8f34]",
    approved: "bg-[#ecfdf5] text-[#0b8f34]",
    resolved: "bg-[#ecfdf5] text-[#0b8f34]",
    viewed: "bg-[#ecfdf5] text-[#0b8f34]",
    processing: "bg-[#fff7ed] text-[#f97316]",
    pending_fulfillment: "bg-[#fff7ed] text-[#9b6200]",
    in_progress: "bg-[#fff7ed] text-[#9b6200]",
    paid: "bg-[#eef3ff] text-[#155cff]",
    pending: "bg-[#eef3ff] text-[#155cff]",
    open: "bg-[#eef3ff] text-[#155cff]",
    failed: "bg-[#fff0f4] text-[#d11f4a]",
    rejected: "bg-[#fff0f4] text-[#d11f4a]",
    refunded: "bg-[#fff0f4] text-[#d11f4a]",
    cancelled: "bg-[#f4f6ff] text-[#5c6478]",
    closed: "bg-[#f4f6ff] text-[#5c6478]",
  };
  const s = styles[status] || "bg-[#f4f6ff] text-[#5c6478]";
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${s}`}>{status}</span>;
}

function DashboardHome() {
  const summary = trpc.dashboard.summary.useQuery(undefined, { refetchInterval: 30_000, refetchOnWindowFocus: true });
  const { format } = useCurrency();
  const recentOrders = (summary.data?.recentOrders ?? []) as any[];
  const recentDeposits = (summary.data?.recentDeposits ?? []) as any[];
  const recentNotifications = (summary.data?.recentNotifications ?? []) as any[];
  const metrics = [
    { label: "Wallet balance", value: format(summary.data?.walletBalance ?? "0"), note: "Ready for checkout", icon: Wallet, href: "/dashboard/wallet", tone: "from-[#0a1128] to-[#172b68]", inverse: true },
    { label: "All orders", value: summary.data?.totalOrders ?? 0, note: `${summary.data?.directOrders ?? 0} direct · ${summary.data?.marketplaceOrders ?? 0} marketplace`, icon: ShoppingBag, href: "/dashboard/orders", tone: "from-white to-[#eef3ff]" },
    { label: "Active delivery", value: summary.data?.activeOrders ?? 0, note: `${summary.data?.deliveredOrders ?? 0} delivered`, icon: PackageCheck, href: "/dashboard/orders", tone: "from-white to-[#effaf3]" },
    { label: "Open support", value: summary.data?.openTickets ?? 0, note: "Open or in progress", icon: Headphones, href: "/dashboard/support", tone: "from-white to-[#fff8ef]" },
  ];

  if (summary.isLoading) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-white" />)}</div>;
  if (summary.error) return <div role="alert" className="rounded-2xl border border-[#ffd8e2] bg-[#fff5f7] p-5 text-sm font-semibold text-[#b91a3f]">Dashboard data could not be loaded. <button onClick={() => summary.refetch()} className="ml-2 font-black underline">Retry</button></div>;

  return <div className="space-y-5">
    <section aria-label="Account overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => <Link key={metric.label} to={metric.href} className={`group relative overflow-hidden rounded-2xl border border-[#dfe6ff] bg-gradient-to-br ${metric.tone} p-5 shadow-[0_9px_0_rgba(184,199,235,.75),0_18px_32px_rgba(12,37,104,.08)] transition hover:-translate-y-1 ${metric.inverse ? "text-white" : "text-[#0a1128]"}`}>
        <div className="flex items-start justify-between gap-4"><div><p className={`text-[10px] font-black uppercase tracking-[.12em] ${metric.inverse ? "text-white/55" : "text-[#7c8498]"}`}>{metric.label}</p><p className="mt-3 text-2xl font-black tabular-nums">{metric.value}</p><p className={`mt-1 text-[11px] font-semibold ${metric.inverse ? "text-white/60" : "text-[#7c8498]"}`}>{metric.note}</p></div><span className={`rounded-xl p-2.5 ${metric.inverse ? "bg-white/10" : "bg-white text-[#155cff] shadow-sm"}`}><metric.icon className="h-5 w-5" /></span></div>
      </Link>)}
    </section>

    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,.55fr)]">
      <article className="overflow-hidden rounded-2xl border border-[#dfe6ff] bg-white shadow-[0_10px_30px_rgba(12,37,104,.05)]">
        <div className="flex items-center justify-between gap-3 border-b border-[#edf1ff] px-5 py-4"><div><h2 className="text-sm font-black text-[#0a1128]">Recent purchases</h2><p className="mt-1 text-xs text-[#7c8498]">Direct and marketplace orders in one timeline</p></div><Link to="/dashboard/orders" className="rounded-lg bg-[#0a1128] px-3 py-2 text-[11px] font-black text-white">View orders</Link></div>
        {recentOrders.length ? <div className="divide-y divide-[#edf1ff]">{recentOrders.map((order) => <div key={`${order.channel}-${order.id}`} className="flex items-center gap-3 px-5 py-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef3ff] text-[#155cff]"><ShoppingBag className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-[#0a1128]">{order.productName}</p><p className="mt-1 text-[11px] text-[#7c8498]">{order.orderNumber} · <span className="capitalize">{order.channel}</span> · {formatDate(order.createdAt)}</p></div><div className="text-right"><p className="text-sm font-black tabular-nums text-[#0a1128]">{format(order.amount ?? order.finalPrice)}</p><StatusBadge status={order.status} /></div></div>)}</div> : <div className="px-5 py-14 text-center"><ShoppingBag className="mx-auto h-7 w-7 text-[#9aa0b4]" /><h3 className="mt-3 text-sm font-black text-[#0a1128]">No purchases yet</h3><p className="mt-1 text-xs text-[#7c8498]">Your direct and marketplace orders will appear here.</p><Link to="/tools" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#155cff] px-4 py-2.5 text-xs font-black text-white">Browse tools <ArrowRight className="h-3.5 w-3.5" /></Link></div>}
      </article>

      <aside className="space-y-5">
        <article className="rounded-2xl border border-[#dfe6ff] bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-black text-[#0a1128]">Deposit activity</h2><p className="mt-1 text-xs text-[#7c8498]">Latest funding requests</p></div><Link to="/dashboard/wallet" className="text-[11px] font-black text-[#155cff]">Open wallet</Link></div>{recentDeposits.length ? <div className="mt-4 divide-y divide-[#edf1ff]">{recentDeposits.slice(0, 3).map((deposit) => <div key={deposit.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-xs font-black capitalize text-[#0a1128]">{String(deposit.method || "deposit").replace(/_/g, " ")}</p><p className="mt-1 text-[11px] text-[#7c8498]">{formatDate(deposit.createdAt)}</p></div><div className="text-right"><p className="text-xs font-black text-[#0a1128]">{format(deposit.amount)}</p><StatusBadge status={deposit.status || "pending"} /></div></div>)}</div> : <p className="mt-5 rounded-xl bg-[#f7f9ff] px-4 py-6 text-center text-xs text-[#7c8498]">No deposit requests</p>}</article>
        <article className="rounded-2xl border border-[#dfe6ff] bg-white p-5"><h2 className="text-sm font-black text-[#0a1128]">Account timeline</h2><p className="mt-1 text-xs text-[#7c8498]">Latest account notifications</p>{recentNotifications.length ? <div className="mt-4 space-y-3">{recentNotifications.slice(0, 3).map((item) => <div key={item.id} className="rounded-xl bg-[#f7f9ff] p-3"><p className="text-xs font-black text-[#0a1128]">{item.title || "Account update"}</p><p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#7c8498]">{item.message}</p></div>)}</div> : <p className="mt-5 text-xs text-[#7c8498]">No account updates yet.</p>}</article>
      </aside>
    </section>
  </div>;
}

// ── Wallet Page ──

function WalletPage() {
  const { data: balance } = trpc.wallet.balance.useQuery(undefined, { refetchInterval: 15_000, refetchOnWindowFocus: true });
  const { data: transactions } = trpc.wallet.transactions.useQuery(undefined, { refetchInterval: 15_000, refetchOnWindowFocus: true });
  const { data: deposits } = trpc.wallet.depositList.useQuery(undefined, { refetchInterval: 15_000, refetchOnWindowFocus: true });
  const { data: settings } = trpc.public.publicSettings.useQuery();
  const { data: binanceCapability } = trpc.binancePay.capability.useQuery();
  const { data: binanceOrders } = trpc.binancePay.orderList.useQuery(undefined, { enabled: Boolean(binanceCapability?.liveEnabled), refetchInterval: 5_000, refetchOnWindowFocus: true });
  const { format } = useCurrency();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"usdt_trc20" | "usdt_bep20" | "easypaisa" | "nayapay" | "jazzcash" | "binance_pay">("usdt_trc20");
  const [txid, setTxid] = useState("");
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | undefined>();
  const [screenshotName, setScreenshotName] = useState("");
  const [binanceLiveAmount, setBinanceLiveAmount] = useState("");
  const [activeBinanceOrderId, setActiveBinanceOrderId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const binanceOrderCreate = trpc.binancePay.orderCreate.useMutation({
    onSuccess: async (order) => {
      setActiveBinanceOrderId(order.id);
      toast.success("Secure Binance Pay checkout created");
      await utils.binancePay.orderList.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const depositMutation = trpc.wallet.depositCreate.useMutation({
    onSuccess: (result) => {
      toast.success(result.message || "Deposit request submitted!");
      utils.wallet.depositList.invalidate();
      utils.wallet.balance.invalidate();
      utils.wallet.transactions.invalidate();
      setAmount(""); setTxid(""); setScreenshotDataUrl(undefined); setScreenshotName("");
    },
    onError: (e) => toast.error(e.message),
  });

  async function handlePaymentScreenshot(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { toast.error("Upload PNG, JPG, or WebP"); return; }
    if (file.size > 3 * 1024 * 1024) { toast.error("Screenshot under 3MB required"); return; }
    setScreenshotDataUrl(await readPaymentScreenshot(file));
    setScreenshotName(file.name);
  }

  const isLocalWallet = ["easypaisa", "nayapay", "jazzcash"].includes(method);
  const isBinancePay = method === "binance_pay";
  const isNayaPay = method === "nayapay";
  const isUsdtBep20 = method === "usdt_bep20";
  const submittedCurrency = isLocalWallet ? "PKR" : "USD";
  const easyPaisaDetails = parseLocalPaymentDetails(settings?.easypaisa_payment_details);
  const nayaPayDetails = parseLocalPaymentDetails(settings?.nayapay_payment_details);
  const jazzCashDetails = parseLocalPaymentDetails(settings?.jazzcash_payment_details);
  const usdtTrc20Wallet = settings?.usdt_wallet || "TV6qMjdyTFx1zQq1GJtZ4Wb7b3XxvKjvY";
  const usdtBep20Wallet = settings?.usdt_bep20_wallet || "";
  const binancePayId = settings?.binance_pay_id || "515591853";
  const binancePayName = settings?.binance_pay_name || "SyedSarosh";
  const binancePayQrUrl = settings?.binance_pay_qr_url || "";
  const txList = (transactions ?? []) as any[];
  const depositList = (deposits ?? []) as any[];
  const methodOptions = Object.entries(paymentMethodLabels) as Array<[keyof typeof paymentMethodLabels, string]>;
  const methodIsConfigured = (value: keyof typeof paymentMethodLabels) => value === "usdt_trc20" ? Boolean(usdtTrc20Wallet) : value === "usdt_bep20" ? Boolean(usdtBep20Wallet) : value === "binance_pay" ? Boolean(binancePayId) : value === "nayapay" ? nayaPayDetails.accountNumber !== "Not configured" : value === "jazzcash" ? jazzCashDetails.accountNumber !== "Not configured" : easyPaisaDetails.accountNumber !== "Not configured";
  const selectedMethodConfigured = methodIsConfigured(method);
  const requiresScreenshot = method !== "nayapay";
  const depositReady = selectedMethodConfigured && Number(amount) > 0 && txid.trim().length >= 4 && (!requiresScreenshot || Boolean(screenshotDataUrl));
  const pendingDeposits = depositList.filter((item) => item.status === "pending").length;
  const approvedDeposits = depositList.filter((item) => item.status === "approved").length;
  const liveOrders = (binanceOrders ?? []) as any[];
  const activeBinanceOrder = liveOrders.find((item) => item.id === activeBinanceOrderId) || liveOrders.find((item) => ["creating", "pending", "paid"].includes(String(item.status)));

  useEffect(() => {
    if (activeBinanceOrder?.status !== "settled") return;
    utils.wallet.balance.invalidate();
    utils.wallet.transactions.invalidate();
  }, [activeBinanceOrder?.status, utils.wallet.balance, utils.wallet.transactions]);

  const paymentDetails = isLocalWallet
    ? {
        title: `Send payment to ${paymentMethodLabels[method]}`,
        rows: [
          ["Account number", isNayaPay ? nayaPayDetails.accountNumber : method === "jazzcash" ? jazzCashDetails.accountNumber : easyPaisaDetails.accountNumber],
          ["Account name", isNayaPay ? nayaPayDetails.accountName : method === "jazzcash" ? jazzCashDetails.accountName : easyPaisaDetails.accountName],
        ],
      }
    : isBinancePay
      ? { title: "Send with Binance Pay", rows: [["Pay ID", binancePayId], ["Account name", binancePayName]] }
      : { title: `Send ${isUsdtBep20 ? "USDT BEP20" : "USDT TRC20"}`, rows: [["Wallet address", isUsdtBep20 ? usdtBep20Wallet || "Not configured" : usdtTrc20Wallet]] };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="overflow-hidden rounded-2xl bg-[#0a1128] p-6 text-white shadow-[0_8px_24px_rgba(10,17,40,0.16)] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-white/60">Available balance</p>
              <p className="mt-3 text-4xl font-bold tabular-nums sm:text-5xl">{format(balance?.balance ?? "0")}</p>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/65">Use your wallet for faster checkout. Approved deposits are credited to this balance.</p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10"><Wallet className="h-5 w-5" /></div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-white/70">
            <span className="rounded-full bg-white/10 px-3 py-1.5">Secure balance</span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">Tracked deposits</span>
          </div>
        </div>
        <aside className="rounded-2xl border border-[#dfe6ff] bg-white p-5">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef3ff] text-[#155cff]"><ShieldCheck className="h-5 w-5" /></div><div><h2 className="text-sm font-bold text-[#0a1128]">How deposits work</h2><p className="text-xs text-[#7c8498]">Three clear steps</p></div></div>
          <ol className="mt-5 space-y-4">
            {["Choose a payment method", "Send funds and keep the reference", "Submit proof for verification"].map((step, index) => <li key={step} className="flex gap-3 text-sm font-medium text-[#5c6478]"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eef3ff] text-xs font-bold text-[#155cff]">{index + 1}</span><span>{step}</span></li>)}
          </ol>
        </aside>
      </section>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Wallet activity"><article className="rounded-xl border border-[#dfe6ff] bg-white p-4"><p className="text-[10px] font-black uppercase tracking-wide text-[#7c8498]">Pending deposits</p><p className="mt-2 text-xl font-black tabular-nums text-[#0a1128]">{pendingDeposits}</p></article><article className="rounded-xl border border-[#dfe6ff] bg-white p-4"><p className="text-[10px] font-black uppercase tracking-wide text-[#7c8498]">Approved deposits</p><p className="mt-2 text-xl font-black tabular-nums text-[#0a1128]">{approvedDeposits}</p></article><article className="rounded-xl border border-[#dfe6ff] bg-white p-4"><p className="text-[10px] font-black uppercase tracking-wide text-[#7c8498]">Ledger entries</p><p className="mt-2 text-xl font-black tabular-nums text-[#0a1128]">{txList.length}</p></article></section>

      {binanceCapability?.liveEnabled && (
        <section className="overflow-hidden rounded-2xl border border-[#f3d55b] bg-white shadow-[0_10px_30px_rgba(70,54,0,.08)]" aria-labelledby="binance-live-title">
          <div className="flex flex-col gap-4 bg-[#fffaf0] p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div className="flex items-start gap-3">
              <img src="/payment-logos/binance.svg" alt="" width="44" height="44" className="h-11 w-11 shrink-0 rounded-xl bg-[#f0b90b] p-2 object-contain" />
              <div><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#9b6200]">Recommended · automatic verification</p><h2 id="binance-live-title" className="mt-1 text-lg font-black text-[#0a1128]">Binance Pay Live</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-[#7c8498]">Pay inside the Binance App. Your wallet credits only after Binance confirms the exact order; no screenshot or transaction claim is required.</p></div>
            </div>
            <span className="w-fit rounded-full bg-[#eaf8ef] px-3 py-1.5 text-[11px] font-black text-[#0b8f34]">Merchant connected</span>
          </div>

          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,.8fr)_minmax(20rem,1.2fr)]">
            <div>
              <label className="text-xs font-black text-[#596176]">Amount (USDT)<input type="number" min="1" max="5000" step="0.01" value={binanceLiveAmount} onChange={(event) => setBinanceLiveAmount(event.target.value)} placeholder="Enter 1.00–5000.00" className="mt-2 h-11 w-full rounded-xl border border-[#e4d58f] bg-white px-4 text-sm font-semibold text-[#0a1128] outline-none focus:border-[#f0b90b] focus:ring-2 focus:ring-[#f0b90b]/15" /></label>
              <button type="button" onClick={() => binanceOrderCreate.mutate({ amount: Number(binanceLiveAmount), currency: "USDT", clientRequestKey: crypto.randomUUID() })} disabled={binanceOrderCreate.isPending || Number(binanceLiveAmount) < 1 || Number(binanceLiveAmount) > 5000} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a1128] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{binanceOrderCreate.isPending ? "Creating secure checkout…" : "Create Binance Pay checkout"}</button>
              <p className="mt-2 text-[11px] leading-4 text-[#7c8498]">A checkout expires automatically. Never pay an amount different from the generated Binance order.</p>
            </div>

            {activeBinanceOrder ? (
              <div className="rounded-2xl border border-[#e8ecff] bg-[#f8faff] p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wide text-[#7c8498]">Order {activeBinanceOrder.merchantTradeNo}</p><p className="mt-1 text-lg font-black tabular-nums text-[#0a1128]">{activeBinanceOrder.amount} {activeBinanceOrder.currency}</p></div><StatusBadge status={activeBinanceOrder.status} /></div>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                  {activeBinanceOrder.qrcodeLink && <img src={activeBinanceOrder.qrcodeLink} alt="Binance Pay secure checkout QR code" className="h-36 w-36 shrink-0 rounded-xl bg-white object-contain p-2 ring-1 ring-[#dfe6ff]" />}
                  <div className="min-w-0 flex-1"><p className="text-xs leading-5 text-[#596176]">Scan in Binance App or open Binance checkout. This page polls the server for verified settlement.</p><div className="mt-3 flex flex-col gap-2">{activeBinanceOrder.checkoutUrl && <a href={activeBinanceOrder.checkoutUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-[#f0b90b] px-4 py-2.5 text-center text-xs font-black text-[#0a1128]">Open Binance checkout</a>}{activeBinanceOrder.deeplink && <a href={activeBinanceOrder.deeplink} className="rounded-xl border border-[#dfe6ff] bg-white px-4 py-2.5 text-center text-xs font-black text-[#155cff]">Open Binance App</a>}</div></div>
                </div>
                {activeBinanceOrder.status === "settled" && <p role="status" className="mt-4 rounded-xl bg-[#eaf8ef] p-3 text-xs font-bold text-[#0b8f34]">Payment verified. Wallet credited exactly once.</p>}
                {["expired", "canceled", "create_failed", "needs_review"].includes(String(activeBinanceOrder.status)) && <p role="alert" className="mt-4 rounded-xl bg-[#fff7df] p-3 text-xs font-bold text-[#9b6200]">This checkout cannot complete automatically. Create a new checkout or use the manual method below.</p>}
              </div>
            ) : <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-[#d9c873] bg-[#fffdf6] p-6 text-center"><div><img src="/payment-logos/binance.svg" alt="" className="mx-auto h-8 w-8 object-contain" /><p className="mt-3 text-sm font-black text-[#0a1128]">Ready for a secure checkout</p><p className="mt-1 text-xs text-[#7c8498]">Enter an amount to generate a unique Binance Pay order.</p></div></div>}
          </div>
        </section>
      )}

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.75fr)]">
        <div className="rounded-2xl border border-[#dfe6ff] bg-white p-5 sm:p-6">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef3ff] text-[#155cff]"><CreditCard className="h-5 w-5" /></div><div><h2 className="text-base font-bold text-[#0a1128]">Add funds</h2><p className="text-sm text-[#7c8498]">Submit one payment for manual verification.</p></div></div>

          <fieldset className="mt-6">
            <legend className="text-xs font-bold text-[#5c6478]">Payment method</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {methodOptions.map(([value, label]) => { const configured = methodIsConfigured(value); return <button key={value} type="button" disabled={!configured} onClick={() => setMethod(value)} className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${method === value ? "border-[#155cff] bg-[#eef3ff] text-[#155cff]" : "border-[#dfe6ff] bg-white text-[#5c6478] hover:border-[#b9c7ff]"}`}>{label}{!configured ? " · unavailable" : ""}</button>; })}
            </div>
          </fieldset>

          <div className="mt-5 rounded-xl bg-[#f6f8ff] p-4 ring-1 ring-[#dfe6ff]">
            <p className="text-xs font-bold text-[#155cff]">{paymentDetails.title}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {paymentDetails.rows.map(([label, value]) => <div key={label} className="min-w-0"><p className="text-xs text-[#7c8498]">{label}</p><p className="mt-1 break-all text-sm font-bold text-[#0a1128]">{value}</p></div>)}
            </div>
            {isBinancePay && binancePayQrUrl && <img src={binancePayQrUrl} alt="Binance Pay QR code" loading="lazy" decoding="async" className="mt-4 h-36 w-36 rounded-xl bg-white object-contain p-2 ring-1 ring-[#dfe6ff]" />}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-[#5c6478]">Amount ({submittedCurrency})<input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={submittedCurrency === "PKR" ? "Enter PKR amount" : "Enter USD amount"} className="mt-2 h-11 w-full rounded-xl border border-[#dfe6ff] bg-white px-4 text-sm font-semibold text-[#0a1128] outline-none focus:border-[#155cff] focus:ring-2 focus:ring-[#155cff]/10" /></label>
            <label className="text-xs font-bold text-[#5c6478]">Transaction reference<input type="text" value={txid} onChange={(e) => setTxid(e.target.value)} placeholder="TRX ID or payment reference" className="mt-2 h-11 w-full rounded-xl border border-[#dfe6ff] bg-white px-4 text-sm font-semibold text-[#0a1128] outline-none focus:border-[#155cff] focus:ring-2 focus:ring-[#155cff]/10" /></label>
          </div>

          <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-dashed border-[#b9c7ff] bg-[#f8faff] px-4 py-4">
            <span className="flex items-center gap-3"><Paperclip className="h-4 w-4 text-[#155cff]" /><span><span className="block text-sm font-bold text-[#0a1128]">{screenshotName || "Attach payment screenshot"}</span><span className="mt-0.5 block text-xs text-[#7c8498]">PNG, JPG or WebP, up to 3MB</span></span></span>
            <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#155cff] ring-1 ring-[#dfe6ff]">Choose file</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePaymentScreenshot} className="hidden" />
          </label>
          {screenshotDataUrl && <img src={screenshotDataUrl} alt="Payment screenshot preview" loading="lazy" className="mt-3 max-h-48 w-full rounded-xl object-contain ring-1 ring-[#dfe6ff]" />}
          {!selectedMethodConfigured && <p role="alert" className="mt-4 rounded-xl bg-[#fff7df] p-3 text-xs font-semibold text-[#9b6200]">This payment method is not configured. Choose an available method.</p>}
          <button type="button" onClick={() => { if (!depositReady) { toast.error(requiresScreenshot && !screenshotDataUrl ? "Attach payment screenshot" : "Complete valid payment details"); return; } depositMutation.mutate({ method, amount: currencyToUsd(amount, submittedCurrency), submittedAmount: parseFloat(amount), submittedCurrency, txid: txid.trim(), screenshotUrl: screenshotDataUrl }); }} disabled={depositMutation.isPending || !depositReady} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#155cff] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#0d4fd9] disabled:cursor-not-allowed disabled:opacity-50">
            {depositMutation.isPending ? "Submitting deposit..." : "Submit deposit for review"}
          </button>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-[#dfe6ff] bg-white p-5">
            <div className="flex items-center justify-between"><div><h2 className="text-sm font-bold text-[#0a1128]">Transaction history</h2><p className="mt-1 text-xs text-[#7c8498]">Latest wallet activity</p></div><TrendingUp className="h-5 w-5 text-[#155cff]" /></div>
            {txList.length > 0 ? <div className="mt-4 divide-y divide-[#f0f3ff]">{txList.slice(0, 12).map((tx) => { const isDebit = tx.type === "debit" || String(tx.type).includes("purchase") || Number(tx.amount || 0) < 0; return <div key={tx.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold capitalize text-[#0a1128]">{String(tx.type || "transaction").replace(/_/g, " ")}</p><p className="mt-0.5 text-xs text-[#7c8498]">{formatDate(tx.createdAt)}</p></div><p className={`text-sm font-bold tabular-nums ${isDebit ? "text-[#d11f4a]" : "text-[#0b8f34]"}`}>{isDebit ? "−" : "+"}{format(Math.abs(Number(tx.amount || 0)))}</p></div>; })}</div> : <div className="py-10 text-center"><Clock className="mx-auto h-6 w-6 text-[#9aa0b4]" /><p className="mt-3 text-sm font-bold text-[#0a1128]">No transactions yet</p><p className="mt-1 text-xs text-[#7c8498]">Approved deposits and purchases will appear here.</p></div>}
          </div>
          {depositList.length > 0 && <div className="rounded-2xl border border-[#dfe6ff] bg-white p-5"><h2 className="text-sm font-bold text-[#0a1128]">Deposit requests</h2><div className="mt-3 divide-y divide-[#f0f3ff]">{depositList.map((deposit) => <div key={deposit.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold capitalize text-[#0a1128]">{deposit.method?.replace(/_/g, " ")}</p><p className="mt-0.5 text-xs text-[#7c8498]">{formatDate(deposit.createdAt)}</p></div><div className="text-right"><p className="text-sm font-bold text-[#0a1128]">{format(deposit.amount)}</p><StatusBadge status={deposit.status || "pending"} /></div></div>)}</div></div>}
        </div>
      </section>
    </div>
  );
}

// ── Orders Page ──

function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const directQuery = trpc.order.list.useQuery();
  const marketplaceQuery = trpc.thirdParty.myOrders.useQuery();
  const { data: siteSettings } = trpc.public.siteSettings.useQuery();
  const { format } = useCurrency();
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedMarketplace, setSelectedMarketplace] = useState<any | null>(null);
  const [selectedDirectOrderId, setSelectedDirectOrderId] = useState<number | null>(null);
  const [deliveryRevealed, setDeliveryRevealed] = useState(false);
  const [marketplaceDeliveryItems, setMarketplaceDeliveryItems] = useState<any[]>([]);
  const [directDelivery, setDirectDelivery] = useState<any | null>(null);
  const [autoOpenHandled, setAutoOpenHandled] = useState(false);
  const selectedDirectQuery = trpc.order.getById.useQuery({ id: selectedDirectOrderId ?? 0 }, { enabled: selectedDirectOrderId !== null });
  const revealMarketplaceMutation = trpc.thirdParty.revealDelivery.useMutation();
  const revealDirectMutation = trpc.order.revealDelivery.useMutation();
  const allOrders = useMemo(() => {
    const directOrders = Array.isArray(directQuery.data) ? directQuery.data as any[] : [];
    const marketplaceOrders = Array.isArray(marketplaceQuery.data) ? marketplaceQuery.data as any[] : [];
    return [
      ...directOrders.map((order) => ({ ...order, channel: "direct", amount: Number(order.finalPrice || 0), reference: order.orderNumber, reviewable: order.fulfillmentType !== "whatsapp_activation" && ["delivered", "viewed"].includes(String(order.deliveryStatus || order.status)) })),
      ...marketplaceOrders.map((order) => ({ ...order, channel: "marketplace", amount: Number(order.priceUsd || 0), reference: `Marketplace #${order.id}`, reviewable: order.status === "delivered" })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [directQuery.data, marketplaceQuery.data]);
  const statusOptions = Array.from(new Set(allOrders.map((order) => String(order.status || "unknown"))));
  const filtered = allOrders.filter((order) => {
    const haystack = `${order.productName} ${order.planName || ""} ${order.reference}`.toLowerCase();
    return (!search.trim() || haystack.includes(search.trim().toLowerCase())) && (channel === "all" || order.channel === channel) && (status === "all" || order.status === status);
  });
  const delivered = allOrders.filter((order) => order.status === "delivered").length;
  const active = allOrders.filter((order) => ["paid", "pending", "processing", "pending_fulfillment"].includes(String(order.status))).length;
  const refunded = allOrders.filter((order) => ["refunded", "failed", "cancelled"].includes(String(order.status))).length;
  const isLoading = directQuery.isLoading || marketplaceQuery.isLoading;
  const error = directQuery.error || marketplaceQuery.error;

  function openOrder(order: any) { setDeliveryRevealed(false); setMarketplaceDeliveryItems([]); setDirectDelivery(null); if (order.channel === "marketplace") setSelectedMarketplace(order); else setSelectedDirectOrderId(order.id); }

  useEffect(() => {
    if (autoOpenHandled || directQuery.isLoading || marketplaceQuery.isLoading) return;
    const requestedId = Number(searchParams.get("order"));
    const requestedChannel = searchParams.get("channel");
    if (!Number.isFinite(requestedId) || requestedId <= 0) return;
    const requested = allOrders.find((order) => order.id === requestedId && (!requestedChannel || order.channel === requestedChannel));
    if (requested) {
      queueMicrotask(() => {
        setSearch(requested.reference || String(requestedId));
        if (requestedChannel === "direct" || requestedChannel === "marketplace") setChannel(requestedChannel);
        if (searchParams.get("delivery") === "1" && requested.reviewable) openOrder(requested);
      });
    }
    queueMicrotask(() => {
      setAutoOpenHandled(true);
      setSearchParams({}, { replace: true });
    });
  }, [allOrders, autoOpenHandled, directQuery.isLoading, marketplaceQuery.isLoading, searchParams, setSearchParams]);

  function copyItem(value: string) { navigator.clipboard.writeText(value).then(() => toast.success("Copied"), () => toast.error("Could not copy")); }
  function closeDelivery() { setSelectedMarketplace(null); setSelectedDirectOrderId(null); setDeliveryRevealed(false); setMarketplaceDeliveryItems([]); setDirectDelivery(null); }
  async function toggleDeliveryReveal() {
    if (deliveryRevealed) { setDeliveryRevealed(false); return; }
    try {
      if (selectedMarketplace) {
        const result = await revealMarketplaceMutation.mutateAsync({ id: Number(selectedMarketplace.id) });
        setMarketplaceDeliveryItems(Array.isArray(result.items) ? result.items : []);
      } else if (selectedDirectOrderId !== null) {
        const result = await revealDirectMutation.mutateAsync({ id: selectedDirectOrderId });
        setDirectDelivery(result.delivery);
      }
      setDeliveryRevealed(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delivery could not be revealed");
    }
  }

  return <div className="space-y-5">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Order metrics">
      {[["All purchases", allOrders.length, ShoppingBag, "#155cff"], ["Delivered", delivered, PackageCheck, "#0b8f34"], ["In progress", active, Clock, "#d97706"], ["Refunded or closed", refunded, RefreshCw, "#d11f4a"]].map(([label, value, Icon, tone]: any) => <article key={label} className="rounded-2xl border border-[#dfe6ff] bg-white p-5 shadow-[0_8px_0_rgba(184,199,235,.55)]"><div className="flex items-center justify-between"><span className="rounded-xl p-2.5" style={{ color: tone, background: `${tone}12` }}><Icon className="h-5 w-5" /></span><span className="text-2xl font-black tabular-nums text-[#0a1128]">{isLoading ? "—" : value}</span></div><p className="mt-4 text-xs font-black text-[#596176]">{label}</p></article>)}
    </section>

    <section className="overflow-hidden rounded-2xl border border-[#dfe6ff] bg-white shadow-[0_10px_30px_rgba(12,37,104,.05)]">
      <div className="border-b border-[#edf1ff] p-4 sm:p-5"><div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between"><div><h2 className="text-base font-black text-[#0a1128]">Purchase history</h2><p className="mt-1 text-xs text-[#7c8498]">Direct and marketplace delivery records in one workspace.</p></div><div className="grid gap-2 sm:grid-cols-[minmax(14rem,1fr)_9rem_10rem]"><label className="relative"><span className="sr-only">Search orders</span><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#9aa0b4]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Product or order number" className="h-10 w-full rounded-xl border border-[#dfe6ff] bg-white pl-9 pr-3 text-xs font-semibold text-[#0a1128] outline-none focus:border-[#155cff]" /></label><select aria-label="Order channel" value={channel} onChange={(e) => setChannel(e.target.value)} className="h-10 rounded-xl border border-[#dfe6ff] bg-white px-3 text-xs font-bold text-[#596176]"><option value="all">All channels</option><option value="direct">Direct</option><option value="marketplace">Marketplace</option></select><select aria-label="Order status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-xl border border-[#dfe6ff] bg-white px-3 text-xs font-bold text-[#596176]"><option value="all">All statuses</option>{statusOptions.map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}</select></div></div></div>
      {error ? <div role="alert" className="m-5 rounded-xl bg-[#fff5f7] p-4 text-sm font-semibold text-[#b91a3f]">Orders could not be loaded. <button onClick={() => { directQuery.refetch(); marketplaceQuery.refetch(); }} className="font-black underline">Retry</button></div> : <div className="overflow-x-auto"><table className="w-full min-w-[66rem] text-left"><thead className="bg-[#f8faff] text-[10px] font-black uppercase tracking-[.09em] text-[#7c8498]"><tr><th className="px-5 py-3">Purchase</th><th className="px-4 py-3">Channel</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Delivery</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Created</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-[#edf1ff]">{isLoading ? Array.from({ length: 4 }).map((_, i) => <tr key={i}><td colSpan={7} className="px-5 py-3"><div className="h-10 animate-pulse rounded-lg bg-[#f3f6ff]" /></td></tr>) : filtered.map((order) => {
        const whatsappUrl = order.channel === "direct" && order.fulfillmentType === "whatsapp_activation" ? buildWhatsAppUrl(siteSettings, `Hello, I need activation help for ${order.productName || "my product"}. Order: ${order.orderNumber}.`) : null;
        return <tr key={`${order.channel}-${order.id}`} className="hover:bg-[#fbfcff]"><td className="px-5 py-4"><p className="text-sm font-black text-[#0a1128]">{order.productName || "Product"}</p><p className="mt-1 text-[11px] text-[#7c8498]">{order.reference}{order.planName ? ` · ${order.planName}` : ""}</p></td><td className="px-4 py-4"><span className="rounded-full bg-[#eef3ff] px-2.5 py-1 text-[10px] font-black uppercase text-[#155cff]">{order.channel}</span></td><td className="px-4 py-4"><StatusBadge status={String(order.status || "unknown")} /></td><td className="px-4 py-4 text-xs font-semibold capitalize text-[#596176]">{String(order.deliveryStatus || (order.status === "delivered" ? "ready" : "not ready")).replace(/_/g, " ")}</td><td className="px-4 py-4 text-sm font-black tabular-nums text-[#0a1128]">{format(order.amount)}</td><td className="px-4 py-4 text-xs text-[#596176]">{formatDateTime(order.createdAt)}</td><td className="px-5 py-4 text-right">{order.reviewable ? <button type="button" onClick={() => openOrder(order)} className="inline-flex items-center gap-2 rounded-lg bg-[#0a1128] px-3 py-2 text-[11px] font-black text-white"><Eye className="h-3.5 w-3.5" /> Review delivery</button> : whatsappUrl && ["pending_fulfillment", "paid"].includes(String(order.status)) ? <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#eafff0] px-3 py-2 text-[11px] font-black text-[#0b8f34]"><MessageCircle className="h-3.5 w-3.5" /> Activation help</a> : <span className="text-[11px] font-semibold text-[#9aa0b4]">No action needed</span>}</td></tr>;
      })}{!isLoading && filtered.length === 0 && <tr><td colSpan={7} className="px-5 py-14 text-center"><ShoppingBag className="mx-auto h-7 w-7 text-[#9aa0b4]" /><p className="mt-3 text-sm font-black text-[#0a1128]">No matching orders</p><p className="mt-1 text-xs text-[#7c8498]">Change filters or browse the marketplace.</p></td></tr>}</tbody></table></div>}
      <div className="border-t border-[#edf1ff] px-5 py-3 text-xs text-[#7c8498]">Showing {filtered.length} of {allOrders.length} purchases</div>
    </section>

    {(selectedMarketplace || selectedDirectOrderId !== null) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050816]/60 p-3 backdrop-blur-sm" onClick={closeDelivery}><motion.div role="dialog" aria-modal="true" aria-label="Protected delivery details" initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 280, damping: 24 }} className="max-h-[calc(100vh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#155cff]">Protected delivery</p><h3 className="mt-1 text-lg font-black text-[#0a1128]">{selectedMarketplace?.productName || selectedDirectQuery.data?.productName || "Order details"}</h3><p className="mt-1 text-xs text-[#7c8498]">Credential data is requested only after you intentionally reveal it.</p></div><button onClick={closeDelivery} aria-label="Close delivery details" className="rounded-xl bg-[#f4f6ff] p-2 text-[#596176]"><X className="h-4 w-4" /></button></div><div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-[#dfe6ff] bg-[#f8faff] p-4"><div className="flex items-center gap-3"><LockKeyhole className="h-5 w-5 text-[#155cff]" /><div><p className="text-xs font-black text-[#0a1128]">Sensitive delivery values</p><p className="mt-1 text-[11px] text-[#7c8498]">Use reveal and copy only in a trusted environment.</p></div></div><button type="button" onClick={toggleDeliveryReveal} disabled={revealMarketplaceMutation.isPending || revealDirectMutation.isPending} className="rounded-lg bg-[#0a1128] px-3 py-2 text-[11px] font-black text-white disabled:opacity-50">{revealMarketplaceMutation.isPending || revealDirectMutation.isPending ? "Loading…" : deliveryRevealed ? "Hide values" : "Reveal values"}</button></div>
      {selectedDirectOrderId !== null && selectedDirectQuery.isLoading ? <div className="mt-5 h-32 animate-pulse rounded-xl bg-[#f3f6ff]" /> : <div className="mt-5 space-y-3">{!deliveryRevealed && <div className="rounded-xl border border-dashed border-[#bdc9ef] bg-[#f8faff] p-5 text-center"><LockKeyhole className="mx-auto h-6 w-6 text-[#155cff]" /><p className="mt-3 text-xs font-black text-[#0a1128]">Delivery is locked</p><p className="mt-1 text-[11px] font-semibold text-[#7c8498]">Reveal requests the credential payload securely. Nothing sensitive is loaded before that action.</p></div>}{(selectedMarketplace ? marketplaceDeliveryItems.map((item: any, index: number) => [`Delivered item ${index + 1}`, String(item?.content || item || "")]) : directDelivery ? [["Email", directDelivery.accountEmail], ["Password", directDelivery.password], ["2FA secret", directDelivery.twoFaSecret], ["Backup method", directDelivery.backupMethod], ["License key", directDelivery.licenseKey], ["Activation link", directDelivery.activationLink]].filter(([, value]) => value) : []).map(([label, value]: any) => <div key={String(label)} className="rounded-xl border border-[#dfe6ff] bg-white p-4"><p className="text-[10px] font-black uppercase tracking-wide text-[#7c8498]">{label}</p><div className="mt-2 flex items-start gap-3"><pre className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-xs leading-6 text-[#0a1128]">{deliveryRevealed ? String(value) : "••••••••••••••••"}</pre>{deliveryRevealed && <button type="button" onClick={() => copyItem(String(value))} aria-label={`Copy ${label}`} className="rounded-lg bg-[#eef3ff] p-2 text-[#155cff]"><Copy className="h-3.5 w-3.5" /></button>}</div></div>)}{directDelivery?.setupInstructions?.length > 0 && <div className="rounded-xl border border-[#dfe6ff] bg-[#f8faff] p-4"><p className="text-xs font-black text-[#0a1128]">Setup guide</p><ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-5 text-[#596176]">{directDelivery.setupInstructions.map((step: string, index: number) => <li key={index}>{step}</li>)}</ol></div>}</div>}
      <div className="mt-5 flex justify-end"><Link to="/dashboard/support" className="rounded-lg border border-[#dfe6ff] bg-white px-4 py-2 text-xs font-black text-[#155cff]">Need help with this order?</Link></div></motion.div></div>}
  </div>;
}

// ── Support Page ──

function SupportPage() {
  const ticketsQuery = trpc.support.listTickets.useQuery();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const utils = trpc.useUtils();
  const detailQuery = trpc.support.getTicket.useQuery({ id: selectedId ?? 0 }, { enabled: selectedId !== null });
  const createMutation = trpc.support.createTicket.useMutation({ onSuccess: async (result) => { toast.success("Ticket created"); await utils.support.listTickets.invalidate(); setSubject(""); setMessage(""); setAttachment(null); setSelectedId(result.id); }, onError: (e) => toast.error(e.message) });
  const replyMutation = trpc.support.addReply.useMutation({ onSuccess: async () => { toast.success("Reply sent"); setReply(""); await Promise.all([utils.support.getTicket.invalidate(), utils.support.listTickets.invalidate()]); }, onError: (e) => toast.error(e.message) });
  const ticketList = Array.isArray(ticketsQuery.data) ? ticketsQuery.data as any[] : [];
  const filtered = ticketList.filter((ticket) => (statusFilter === "all" || ticket.status === statusFilter) && (!search.trim() || `${ticket.subject} ${ticket.message}`.toLowerCase().includes(search.trim().toLowerCase())));
  const openCount = ticketList.filter((ticket) => ["open", "in_progress"].includes(String(ticket.status))).length;
  const resolvedCount = ticketList.filter((ticket) => ["resolved", "closed"].includes(String(ticket.status))).length;

  function chooseAttachment(file?: File) {
    if (!file) { setAttachment(null); return; }
    const allowed = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) { toast.error("Attach PNG, JPG, WebP, or PDF only"); return; }
    if (file.size > 3 * 1024 * 1024) { toast.error("Attachment must be under 3MB"); return; }
    setAttachment(file);
  }
  async function handleCreate() {
    if (!subject.trim() || !message.trim()) { toast.error("Fill subject and message"); return; }
    const attachmentUrl = attachment ? await readSupportAttachment(attachment) : undefined;
    createMutation.mutate({ subject: subject.trim(), message: message.trim(), priority: "medium", attachmentName: attachment?.name, attachmentType: attachment?.type, attachmentSize: attachment?.size, attachmentUrl });
  }

  return <div className="space-y-5">
    <section className="grid gap-3 sm:grid-cols-3"><article className="rounded-2xl bg-[#0a1128] p-5 text-white shadow-[0_9px_0_#23335f]"><p className="text-[10px] font-black uppercase tracking-[.12em] text-white/55">Support access</p><p className="mt-3 text-lg font-black">Private account help</p><p className="mt-1 text-xs text-white/60">Purchase-linked assistance</p></article><article className="rounded-2xl border border-[#dfe6ff] bg-white p-5 shadow-[0_8px_0_rgba(184,199,235,.55)]"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#7c8498]">Open conversations</p><p className="mt-3 text-2xl font-black tabular-nums text-[#0a1128]">{ticketsQuery.isLoading ? "—" : openCount}</p><p className="mt-1 text-xs text-[#7c8498]">Open or in progress</p></article><article className="rounded-2xl border border-[#dfe6ff] bg-white p-5 shadow-[0_8px_0_rgba(184,199,235,.55)]"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#7c8498]">Resolved</p><p className="mt-3 text-2xl font-black tabular-nums text-[#0a1128]">{ticketsQuery.isLoading ? "—" : resolvedCount}</p><p className="mt-1 text-xs text-[#7c8498]">Completed conversations</p></article></section>

    <section className="grid items-start gap-5 xl:grid-cols-[minmax(21rem,.8fr)_minmax(0,1.2fr)]">
      <article className="rounded-2xl border border-[#dfe6ff] bg-white p-5 sm:p-6"><div className="flex items-start gap-3"><span className="rounded-xl bg-[#eef3ff] p-2.5 text-[#155cff]"><LifeBuoy className="h-5 w-5" /></span><div><h2 className="text-base font-black text-[#0a1128]">Open a support ticket</h2><p className="mt-1 text-xs leading-5 text-[#7c8498]">Include the product, order number, steps, and expected outcome.</p></div></div><div className="mt-5 space-y-4"><label className="block text-xs font-black text-[#596176]">Subject<input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} placeholder="A short issue summary" className="mt-2 h-11 w-full rounded-xl border border-[#dfe6ff] px-4 text-sm font-semibold text-[#0a1128] outline-none focus:border-[#155cff]" /></label><label className="block text-xs font-black text-[#596176]">What happened?<textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="Order reference, steps already tried, and the outcome you need." className="mt-2 w-full resize-none rounded-xl border border-[#dfe6ff] px-4 py-3 text-sm leading-6 text-[#0a1128] outline-none focus:border-[#155cff]" /></label><label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-[#b9c7ff] bg-[#f8faff] p-4"><span className="flex min-w-0 items-center gap-3"><Paperclip className="h-4 w-4 shrink-0 text-[#155cff]" /><span className="min-w-0"><span className="block truncate text-sm font-black text-[#0a1128]">{attachment?.name || "Attach evidence"}</span><span className="text-xs text-[#7c8498]">PNG, JPG, WebP, or PDF · under 3MB</span></span></span><span className="rounded-lg bg-white px-3 py-2 text-[11px] font-black text-[#155cff] ring-1 ring-[#dfe6ff]">Choose</span><input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => chooseAttachment(e.target.files?.[0])} className="hidden" /></label><button onClick={handleCreate} disabled={createMutation.isPending || !subject.trim() || !message.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#155cff] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"><MessageCircle className="h-4 w-4" />{createMutation.isPending ? "Creating ticket..." : "Create support ticket"}</button></div></article>

      <article className="overflow-hidden rounded-2xl border border-[#dfe6ff] bg-white"><div className="border-b border-[#edf1ff] p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-base font-black text-[#0a1128]">Your conversations</h2><p className="mt-1 text-xs text-[#7c8498]">Open a ticket to read the complete thread and reply.</p></div><div className="flex gap-2"><label className="relative"><span className="sr-only">Search tickets</span><Search className="absolute left-3 top-3 h-4 w-4 text-[#9aa0b4]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="h-10 w-36 rounded-xl border border-[#dfe6ff] pl-9 pr-3 text-xs outline-none focus:border-[#155cff]" /></label><select aria-label="Ticket status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-xl border border-[#dfe6ff] bg-white px-3 text-xs font-bold text-[#596176]"><option value="all">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></div></div></div>
      {ticketsQuery.error ? <div role="alert" className="m-5 rounded-xl bg-[#fff5f7] p-4 text-sm text-[#b91a3f]">Tickets could not be loaded. <button onClick={() => ticketsQuery.refetch()} className="font-black underline">Retry</button></div> : ticketsQuery.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-[#f3f6ff]" />)}</div> : filtered.length ? <div className="divide-y divide-[#edf1ff]">{filtered.map((ticket) => <button key={ticket.id} type="button" onClick={() => setSelectedId(ticket.id)} className={`flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-[#fbfcff] ${selectedId === ticket.id ? "bg-[#f6f8ff]" : ""}`}><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef3ff] text-[#155cff]"><MessageSquare className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-3"><span className="truncate text-sm font-black text-[#0a1128]">{ticket.subject}</span><StatusBadge status={ticket.status || "open"} /></span><span className="mt-1 line-clamp-2 text-xs leading-5 text-[#7c8498]">{ticket.message}</span><span className="mt-2 block text-[11px] text-[#9aa0b4]">Ticket #{ticket.id} · {formatDate(ticket.createdAt)} · {ticket.priority || "medium"} priority</span></span></button>)}</div> : <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center"><MessageSquare className="h-7 w-7 text-[#9aa0b4]" /><h3 className="mt-3 text-sm font-black text-[#0a1128]">No matching conversations</h3><p className="mt-1 max-w-xs text-xs leading-5 text-[#7c8498]">Create a ticket after a direct or marketplace purchase.</p></div>}
      {selectedId !== null && <div className="border-t border-[#dfe6ff] bg-[#f8faff] p-5"><div className="flex items-center justify-between"><h3 className="text-sm font-black text-[#0a1128]">Ticket thread</h3><button onClick={() => setSelectedId(null)} aria-label="Close ticket thread" className="rounded-lg bg-white p-2 text-[#596176]"><X className="h-4 w-4" /></button></div>{detailQuery.isLoading ? <div className="mt-4 h-28 animate-pulse rounded-xl bg-white" /> : detailQuery.data ? <div className="mt-4 space-y-3"><div className="rounded-xl bg-white p-4 ring-1 ring-[#dfe6ff]"><div className="flex items-center justify-between"><p className="text-xs font-black text-[#0a1128]">You</p><span className="text-[10px] text-[#9aa0b4]">{formatDateTime(detailQuery.data.createdAt)}</span></div><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#596176]">{detailQuery.data.message}</p></div>{(detailQuery.data.replies || []).slice().reverse().map((item: any) => <div key={item.id} className={`rounded-xl p-4 ring-1 ${item.senderRole === "admin" ? "bg-[#eef3ff] ring-[#cdd8ff]" : "bg-white ring-[#dfe6ff]"}`}><div className="flex items-center justify-between"><p className="text-xs font-black text-[#0a1128]">{item.senderName}</p><span className="text-[10px] text-[#9aa0b4]">{formatDateTime(item.createdAt)}</span></div><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#596176]">{item.message}</p></div>)}<div className="flex gap-2"><textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder="Reply to this ticket" className="min-w-0 flex-1 resize-none rounded-xl border border-[#dfe6ff] bg-white px-3 py-2 text-xs outline-none focus:border-[#155cff]" /><button onClick={() => replyMutation.mutate({ ticketId: selectedId, message: reply.trim() })} disabled={replyMutation.isPending || !reply.trim()} aria-label="Send ticket reply" className="self-end rounded-xl bg-[#155cff] p-3 text-white disabled:opacity-50"><Send className="h-4 w-4" /></button></div></div> : <p className="mt-4 text-xs text-[#7c8498]">Ticket is no longer available.</p>}</div>}
      </article>
    </section>
  </div>;
}

// ── Profile Page ──

function ProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const utils = trpc.useUtils();
  const updateMutation = trpc.auth.updateProfile.useMutation({ onSuccess: async () => { toast.success("Profile updated"); await utils.auth.me.invalidate(); }, onError: (e) => toast.error(e.message) });
  const cleanName = name.trim();
  const isDirty = Boolean(cleanName) && cleanName !== (user?.name || "");
  const initials = (user?.name || user?.email || "U").split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

  return <div className="space-y-5">
    <section className="overflow-hidden rounded-2xl border border-[#dfe6ff] bg-[#0a1128] text-white shadow-[0_10px_0_#23335f]"><div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7"><div className="flex items-center gap-4"><span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl font-black ring-1 ring-white/15">{initials}</span><div><p className="text-[10px] font-black uppercase tracking-[.12em] text-white/55">Sasify account</p><h2 className="mt-1 text-2xl font-black">{user?.name || "Customer"}</h2><p className="mt-1 text-sm text-white/60">{user?.email}</p></div></div><span className="w-fit rounded-full bg-white/10 px-4 py-2 text-xs font-black capitalize text-white/75">{user?.role || "user"} account</span></div></section>
    <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <article className="rounded-2xl border border-[#dfe6ff] bg-white p-5 sm:p-6"><div className="flex items-start gap-3"><span className="rounded-xl bg-[#eef3ff] p-2.5 text-[#155cff]"><User className="h-5 w-5" /></span><div><h2 className="text-base font-black text-[#0a1128]">Personal information</h2><p className="mt-1 text-xs text-[#7c8498]">Your display name appears in account and support workspaces.</p></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs font-black text-[#596176]">Display name<input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#dfe6ff] px-4 text-sm font-semibold text-[#0a1128] outline-none focus:border-[#155cff]" /></label><label className="text-xs font-black text-[#596176]">Email address<input value={user?.email || ""} disabled className="mt-2 h-11 w-full rounded-xl border border-[#e8ecf8] bg-[#f8faff] px-4 text-sm font-semibold text-[#7c8498]" /></label></div><div className="mt-5 flex flex-col gap-3 rounded-xl bg-[#f7f9ff] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black text-[#0a1128]">{isDirty ? "Unsaved name change" : "Profile is up to date"}</p><p className="mt-1 text-[11px] text-[#7c8498]">Email changes require support verification.</p></div><button onClick={() => updateMutation.mutate({ name: cleanName })} disabled={updateMutation.isPending || !isDirty} className="rounded-xl bg-[#155cff] px-5 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{updateMutation.isPending ? "Saving..." : "Save profile"}</button></div></article>
      <aside className="space-y-5"><article className="rounded-2xl border border-[#dfe6ff] bg-white p-5"><h2 className="text-sm font-black text-[#0a1128]">Account identity</h2><dl className="mt-4 space-y-3"><div className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f9ff] p-3"><dt className="flex items-center gap-2 text-xs font-semibold text-[#7c8498]"><Hash className="h-3.5 w-3.5" /> User ID</dt><dd className="text-xs font-black text-[#0a1128]">#{user?.id}</dd></div><div className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f9ff] p-3"><dt className="flex items-center gap-2 text-xs font-semibold text-[#7c8498]"><Shield className="h-3.5 w-3.5" /> Role</dt><dd className="text-xs font-black capitalize text-[#0a1128]">{user?.role || "user"}</dd></div><div className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f9ff] p-3"><dt className="flex items-center gap-2 text-xs font-semibold text-[#7c8498]"><Mail className="h-3.5 w-3.5" /> Email</dt><dd className="max-w-[11rem] truncate text-xs font-black text-[#0a1128]">{user?.email}</dd></div></dl></article><article className="rounded-2xl border border-[#dfe6ff] bg-white p-5"><div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-[#0b8f34]" /><h2 className="text-sm font-black text-[#0a1128]">Account support</h2></div><p className="mt-3 text-xs leading-5 text-[#7c8498]">Never share delivered credentials or payment references outside trusted support channels.</p><div className="mt-4 grid gap-2"><Link to="/dashboard/support" className="rounded-xl bg-[#0a1128] px-4 py-2.5 text-center text-xs font-black text-white">Open support</Link><Link to="/dashboard/provider" className="rounded-xl border border-[#dfe6ff] bg-white px-4 py-2.5 text-center text-xs font-black text-[#155cff]">Provider program</Link></div></article></aside>
    </section>
  </div>;
}

// ── Scammer Reports Page ──

function ScammerReportsPage() {
  const { data: reports } = trpc.scammers.myReports.useQuery();
  const [scammerName, setScammerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [platform, setPlatform] = useState("Telegram");
  const [amountLost, setAmountLost] = useState("");
  const [description, setDescription] = useState("");
  const [proofScreenshots, setProofScreenshots] = useState<string[]>([]);
  const [proofNames, setProofNames] = useState<string[]>([]);
  const [reportStatus, setReportStatus] = useState("all");
  const utils = trpc.useUtils();
  const createMutation = trpc.scammers.submit.useMutation({
    onSuccess: () => {
      toast.success("Report submitted for review");
      utils.scammers.myReports.invalidate();
      setScammerName(""); setPhoneNumber(""); setPlatform("Telegram"); setAmountLost(""); setDescription(""); setProofScreenshots([]); setProofNames([]);
    },
    onError: (e) => toast.error(e.message),
  });
  const reportList = reports ?? [];
  const filteredReports = reportStatus === "all" ? reportList : reportList.filter((report: any) => String(report.status || "pending") === reportStatus);
  const pendingReports = reportList.filter((report: any) => String(report.status || "pending") === "pending").length;
  const approvedReports = reportList.filter((report: any) => report.status === "approved").length;
  const rejectedReports = reportList.filter((report: any) => report.status === "rejected").length;

  async function handleProofFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    if (files.length > 5) { toast.error("Upload up to 5 screenshots"); return; }
    if (files.some((file) => !["image/png", "image/jpeg", "image/webp"].includes(file.type))) { toast.error("Proof must be PNG, JPG, or WebP"); return; }
    if (files.some((file) => file.size > 3 * 1024 * 1024)) { toast.error("Each screenshot must be under 3MB"); return; }
    setProofScreenshots(await Promise.all(files.map(readPaymentScreenshot)));
    setProofNames(files.map((file) => file.name));
  }

  function submitReport() {
    if (!/^(03\d{9}|\+92\d{10})$/.test(phoneNumber.trim())) { toast.error("Enter a valid Pakistan mobile number"); return; }
    if (description.trim().length < 20) { toast.error("Add at least 20 characters of incident detail"); return; }
    if (!proofScreenshots.length) { toast.error("Upload at least one proof screenshot"); return; }
    createMutation.mutate({
      scammerName: scammerName.trim() || undefined,
      phoneNumber: phoneNumber.trim(),
      platform: platform.trim() || undefined,
      amountLost: amountLost.trim() || undefined,
      description: description.trim(),
      proofScreenshots,
    });
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-[#ffd8e2] bg-[#fff5f7] p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ffe9ec] text-[#d11f4a]"><ShieldAlert className="h-5 w-5" /></div>
          <div><h2 className="text-lg font-bold text-[#0a1128]">Help keep the marketplace safer</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#5c6478]">Submit factual details and proof of suspicious activity. Reports are reviewed privately before any public action.</p></div>
        </div>
        <span className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#d11f4a] ring-1 ring-[#ffd8e2]">Trust & safety</span>
      </section>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Report statuses">{[["Pending review", pendingReports, "#d97706"], ["Approved", approvedReports, "#0b8f34"], ["Rejected", rejectedReports, "#d11f4a"]].map(([label, value, tone]: any) => <button key={label} type="button" onClick={() => setReportStatus(label === "Pending review" ? "pending" : String(label).toLowerCase())} className="rounded-xl border border-[#dfe6ff] bg-white p-4 text-left"><div className="flex items-center justify-between"><p className="text-xs font-black text-[#596176]">{label}</p><span className="text-xl font-black tabular-nums" style={{ color: tone }}>{value}</span></div></button>)}</section>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(21rem,0.85fr)]">
        <div className="rounded-2xl border border-[#dfe6ff] bg-white p-5 sm:p-6">
          <h2 className="text-base font-bold text-[#0a1128]">Submit a report</h2>
          <p className="mt-1 text-sm text-[#7c8498]">Required proof helps the review team make a fair decision.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-[#5c6478]">Name or account label <span className="font-medium text-[#9aa0b4]">(optional)</span><input type="text" value={scammerName} onChange={(e) => setScammerName(e.target.value)} placeholder="Name used by the account" className="mt-2 h-11 w-full rounded-xl border border-[#dfe6ff] bg-white px-4 text-sm font-semibold text-[#0a1128] outline-none focus:border-[#d11f4a] focus:ring-2 focus:ring-[#d11f4a]/10" /></label>
            <label className="text-xs font-bold text-[#5c6478]">Pakistan mobile number<input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="03116185711 or +923..." className="mt-2 h-11 w-full rounded-xl border border-[#dfe6ff] bg-white px-4 text-sm font-semibold text-[#0a1128] outline-none focus:border-[#d11f4a] focus:ring-2 focus:ring-[#d11f4a]/10" /></label>
            <label className="text-xs font-bold text-[#5c6478]">Platform<input type="text" value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="Telegram, WhatsApp, Facebook" className="mt-2 h-11 w-full rounded-xl border border-[#dfe6ff] bg-white px-4 text-sm font-semibold text-[#0a1128] outline-none focus:border-[#d11f4a] focus:ring-2 focus:ring-[#d11f4a]/10" /></label>
            <label className="text-xs font-bold text-[#5c6478]">Amount lost <span className="font-medium text-[#9aa0b4]">(optional)</span><input type="number" min="0" step="0.01" value={amountLost} onChange={(e) => setAmountLost(e.target.value)} placeholder="Amount in PKR" className="mt-2 h-11 w-full rounded-xl border border-[#dfe6ff] bg-white px-4 text-sm font-semibold text-[#0a1128] outline-none focus:border-[#d11f4a] focus:ring-2 focus:ring-[#d11f4a]/10" /></label>
          </div>
          <label className="mt-4 block text-xs font-bold text-[#5c6478]">Incident details<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain what happened, when it happened, and how payment or contact took place." rows={6} className="mt-2 w-full resize-none rounded-xl border border-[#dfe6ff] bg-white px-4 py-3 text-sm font-medium leading-6 text-[#0a1128] outline-none focus:border-[#d11f4a] focus:ring-2 focus:ring-[#d11f4a]/10" /></label>
          <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-dashed border-[#f0a8b9] bg-[#fff8fa] px-4 py-4">
            <span className="flex min-w-0 items-center gap-3"><Paperclip className="h-4 w-4 shrink-0 text-[#d11f4a]" /><span className="min-w-0"><span className="block truncate text-sm font-bold text-[#0a1128]">{proofNames.length ? `${proofNames.length} screenshot${proofNames.length === 1 ? "" : "s"} selected` : "Upload proof screenshots"}</span><span className="block text-xs text-[#7c8498]">Required · 1–5 images · up to 3MB each</span></span></span>
            <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#d11f4a] ring-1 ring-[#ffd8e2]">Choose</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={handleProofFiles} className="hidden" />
          </label>
          {proofNames.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{proofNames.map((name) => <span key={name} className="max-w-full truncate rounded-full bg-[#f6f8ff] px-3 py-1 text-xs font-semibold text-[#5c6478]">{name}</span>)}</div>}
          <div className="mt-4 rounded-xl bg-[#f6f8ff] p-4"><p className="text-xs font-bold text-[#0a1128]">Before you submit</p><ul className="mt-2 space-y-2 text-xs leading-5 text-[#5c6478]"><li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0b8f34]" />Double-check the phone number and proof.</li><li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0b8f34]" />Use facts rather than assumptions.</li><li className="flex gap-2"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#f97316]" />For immediate financial risk, also contact your payment provider.</li></ul></div>
          <button type="button" onClick={submitReport} disabled={createMutation.isPending || !/^\+?[0-9][0-9\- ]{6,20}$/.test(phoneNumber.trim()) || description.trim().length < 20 || proofScreenshots.length === 0} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#d11f4a] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#b91a3f] disabled:cursor-not-allowed disabled:opacity-50"><ShieldAlert className="h-4 w-4" />{createMutation.isPending ? "Submitting report..." : "Submit private report"}</button>
        </div>

        <div className="rounded-2xl border border-[#dfe6ff] bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-bold text-[#0a1128]">Your reports</h2><p className="mt-1 text-sm text-[#7c8498]">Track review status here</p></div><select aria-label="Report status" value={reportStatus} onChange={(e) => setReportStatus(e.target.value)} className="h-9 rounded-lg border border-[#dfe6ff] bg-white px-2 text-xs font-bold text-[#596176]"><option value="all">All {reportList.length}</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
          {filteredReports.length > 0 ? <div className="mt-5 divide-y divide-[#f0f3ff]">{filteredReports.map((report: any) => <article key={report.id} className="py-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-bold text-[#0a1128]">{report.scammerName || report.phoneNumber}</p><p className="mt-1 text-xs font-medium text-[#5c6478]">{report.phoneNumber}{report.platform ? ` · ${report.platform}` : ""}</p>{report.description && <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#7c8498]">{report.description}</p>}</div><StatusBadge status={report.status || "pending"} /></div></article>)}</div> : <div className="flex min-h-64 flex-col items-center justify-center text-center"><ShieldCheck className="h-7 w-7 text-[#9aa0b4]" /><h3 className="mt-4 text-sm font-bold text-[#0a1128]">No reports submitted</h3><p className="mt-1 max-w-xs text-xs leading-5 text-[#7c8498]">Reports you submit will remain visible here with their review status.</p></div>}
        </div>
      </section>
    </div>
  );
}

// ── Provider Program Page ──

function ProviderPage() {
  const { user } = useAuth();
  const application = trpc.provider.myApplication.useQuery();
  const current = application.data as any;
  const status = String(current?.status || (user?.role === "provider" ? "approved" : "not_applied"));
  const steps = [{ title: "Submit a complete application", note: "Service, stock, wholesale pricing, and delivery method." }, { title: "Operator review", note: "Sasify checks delivery quality, proof, and commercial fit." }, { title: "Start supplying", note: "Approved providers coordinate catalog and fulfillment with operations." }];
  return <div className="space-y-5">
    <section className="overflow-hidden rounded-2xl border border-[#dfe6ff] bg-[#071a3d] text-white shadow-[0_10px_0_#203866]"><div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"><div><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black"><Store className="h-3.5 w-3.5" /> Provider program</span><h2 className="mt-5 max-w-2xl text-2xl font-black sm:text-3xl">Supply verified digital products through Sasify.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#c8d7f2]">The public application collects your operational details once. This dashboard tracks your latest application and next step.</p></div><div className="rounded-2xl border border-white/15 bg-white/10 p-5"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#a9c2ec]">Current status</p><p className="mt-2 text-xl font-black capitalize">{application.isLoading ? "Loading" : status.replace(/_/g, " ")}</p>{current?.createdAt && <p className="mt-1 text-xs text-[#c8d7f2]">Submitted {formatDate(current.createdAt)}</p>}</div></div></section>
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,.75fr)]"><article className="rounded-2xl border border-[#dfe6ff] bg-white p-5 sm:p-6"><div className="flex items-center gap-3"><span className="rounded-xl bg-[#eef3ff] p-2.5 text-[#155cff]"><Building2 className="h-5 w-5" /></span><div><h2 className="text-base font-black text-[#0a1128]">Provider onboarding</h2><p className="mt-1 text-xs text-[#7c8498]">A focused three-step review; no duplicate form in the dashboard.</p></div></div><ol className="mt-6 grid gap-4 md:grid-cols-3">{steps.map((step, index) => <li key={step.title} className="rounded-xl border border-[#dfe6ff] bg-[#f8faff] p-4"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#155cff] text-xs font-black text-white">{index + 1}</span><h3 className="mt-4 text-sm font-black text-[#0a1128]">{step.title}</h3><p className="mt-2 text-xs leading-5 text-[#7c8498]">{step.note}</p></li>)}</ol></article><aside className="rounded-2xl border border-[#dfe6ff] bg-white p-5 sm:p-6"><div className="flex items-center gap-3"><BadgeCheck className={`h-6 w-6 ${status === "approved" ? "text-[#0b8f34]" : status === "rejected" ? "text-[#d11f4a]" : "text-[#155cff]"}`} /><div><h2 className="text-sm font-black text-[#0a1128]">{status === "approved" ? "Provider approved" : status === "pending" ? "Application under review" : status === "rejected" ? "Application reviewed" : "Ready to apply?"}</h2><p className="mt-1 text-xs text-[#7c8498]">Latest application status</p></div></div>{current ? <div className="mt-5 space-y-3 rounded-xl bg-[#f7f9ff] p-4"><div><p className="text-[10px] font-black uppercase tracking-wide text-[#7c8498]">Service</p><p className="mt-1 text-sm font-black text-[#0a1128]">{current.serviceName || "Provider application"}</p></div>{current.adminNote && <div><p className="text-[10px] font-black uppercase tracking-wide text-[#7c8498]">Review note</p><p className="mt-1 text-xs leading-5 text-[#596176]">{current.adminNote}</p></div>}</div> : <p className="mt-5 text-xs leading-5 text-[#7c8498]">Prepare service details, available stock, wholesale pricing, delivery method, and proof of past work.</p>}{status !== "approved" && status !== "pending" && <Link to="/providers" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#155cff] px-5 py-3 text-sm font-black text-white">{status === "rejected" ? "Submit updated application" : "Open application"}<ExternalLink className="h-4 w-4" /></Link>}{status === "pending" && <p className="mt-5 rounded-xl bg-[#fff7df] p-4 text-xs font-semibold leading-5 text-[#9b6200]">No action is required while the operations team reviews your application.</p>}</aside></section>
  </div>;
}

// ── Main Dashboard Route ──

export default function Dashboard() {
  const location = useLocation();
  const { user, isLoading, logout } = useAuth({ redirectOnUnauthenticated: true });
  const { currency, setCurrency } = useCurrency();
  const { data: siteSettings } = trpc.public.siteSettings.useQuery(undefined, { staleTime: 30_000, refetchOnWindowFocus: false });
  const siteTemplate = resolveSiteTemplate(siteSettings?.site_template);
  const dashboardTemplate = resolveDashboardTemplate(siteSettings?.user_dashboard_template, siteTemplate);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7ff]">
        <div className="h-16 w-16 animate-pulse rounded-2xl bg-white/60" />
      </div>
    );
  }

  if (!user) return null;

  const renderContent = () => {
    switch (location.pathname) {
      case "/dashboard": return <DashboardHome />;
      case "/dashboard/wallet": return <WalletPage />;
      case "/dashboard/orders": return <OrdersPage />;
      case "/dashboard/referrals": return <ReferralDashboard />;
      case "/dashboard/support": return <SupportPage />;
      case "/dashboard/scammer-reports": return <ScammerReportsPage />;
      case "/dashboard/profile": return <ProfilePage />;
      case "/dashboard/provider": return <ProviderPage />;
      default: return <DashboardHome />;
    }
  };

  return (
    <div className="sas-user-dashboard relative min-h-screen bg-[#f4f7ff]" data-dashboard-template={dashboardTemplate}>
      <a href="#dashboard-main" className="sr-only z-50 rounded-lg bg-[#0a1128] px-4 py-2 text-sm font-black text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to dashboard content</a>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,#eef4ff_0%,#f8fbff_42%,#eef3ff_100%)]" />

      <Sidebar />
            <div className="relative z-10 lg:ml-60">
              {/* Fixed dashboard header — independent of global document overflow and never overlaps page content */}
              <header className="fixed inset-x-0 top-0 z-20 h-16 border-b border-[#dfe6ff]/60 bg-white/90 px-4 backdrop-blur-2xl shadow-[0_4px_18px_rgba(12,37,104,0.04)] sm:px-6 lg:left-60 lg:pl-8 lg:pr-8">
                <div className="flex h-full items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#cdd8ff] bg-[#eef3ff] text-[#155cff] shadow-sm"><User className="h-[18px] w-[18px]" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-[#9aa0b4]">Welcome, {user?.name || "User"}</p>
                      <h1 className="truncate text-[15px] font-black text-[#0a1128]">{navItems.find(n => n.href === location.pathname)?.label || "Dashboard"}</h1>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {/* Currency */}
                    <div className="hidden items-center rounded-full border border-[#e4e9ff]/80 bg-[#f8faff]/60 p-0.5 sm:flex" role="group" aria-label="Display currency">
                      {(["USD", "PKR"] as const).map((c) => (
                        <button key={c} type="button" aria-pressed={currency === c} onClick={() => setCurrency(c)}
                          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
                            currency === c ? (c === "USD" ? "bg-[#155cff] text-white" : "bg-[#0b8f34] text-white") : "text-[#9aa0b4] hover:text-[#5c6478]"
                          }`}>
                          <img src={`/flags/${c === "USD" ? "us" : "pk"}.png`} alt="" width="14" height="10" className="rounded-[1px]" /> {c}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center rounded-full border border-[#e4e9ff]/80 bg-[#f8faff]/60 p-0.5 sm:hidden" role="group" aria-label="Display currency">
                      {(["USD", "PKR"] as const).map((c) => <button key={c} type="button" title={`Use ${c}`} aria-pressed={currency === c} onClick={() => setCurrency(c)} className={`flex h-9 w-9 items-center justify-center rounded-full ${currency === c ? (c === "USD" ? "bg-[#155cff]" : "bg-[#0b8f34]") : ""}`}><img src={`/flags/${c === "USD" ? "us" : "pk"}.png`} alt={c} width="16" height="11" className="rounded-[1px]" /></button>)}
                    </div>
                    <button type="button" aria-label="Logout" onClick={() => logout()}
                      className="flex min-h-11 items-center gap-1.5 rounded-full border border-[#ffd6df]/60 bg-white/70 px-3 py-1.5 text-[11px] font-bold text-[#d11f4a] transition-colors hover:bg-[#fff0f4] lg:hidden">
                      <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Logout</span>
                    </button>
                  </div>
                </div>
              </header>
              <div aria-hidden="true" className="mb-5 h-16" />

              {/* Mobile-only horizontal nav row — sits below the fixed dashboard header */}
              <MobileDashboardNav variant="below" />

              <main id="dashboard-main" className="mx-auto max-w-[1440px] px-4 pb-10 sm:px-6 lg:px-8">
                {renderContent()}
              </main>
      </div>
    </div>
  );
}



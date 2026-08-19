import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Headphones,
  Infinity as InfinityIcon,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import PurchaseFlowModal, { type PurchaseFlowState } from "@/components/tools/PurchaseFlowModal";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";
import { clearPurchaseOperationKey, getPurchaseOperationKey } from "@/lib/purchase-idempotency";

type CatalogProduct = {
  id: number;
  slug?: string;
  name: string;
  categoryName?: string;
  categoryId?: string | number;
  description?: string;
  stock?: number;
  unlimited?: boolean;
  instant?: boolean;
  maxQuantity?: number;
  priceUsd?: number | string;
  priceCurrency?: string;
  priceDisplayAmount?: number | string;
  bulkTiers?: unknown[];
  fulfillmentType?: string;
  planId?: number;
  isDirect?: boolean;
};

type PurchaseTarget = { product: CatalogProduct; quantity: number };

function normalizeCategory(value?: string | null) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function checkoutUnitPrice(product: CatalogProduct) {
  const listed = Number(product.priceUsd || 0);
  return product.isDirect ? Math.round(listed * 95) / 100 : listed;
}

function isReadyStatus(status?: string | null) {
  return ["delivered", "viewed", "ready"].includes(String(status || "").toLowerCase());
}

function isClosedStatus(status?: string | null) {
  return ["refunded", "failed", "cancelled"].includes(String(status || "").toLowerCase());
}

export default function Tools() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id, slug: categorySlug } = useParams<{ id?: string; slug?: string }>();
  const { isAuthenticated, user } = useAuth();
  const { format } = useCurrency();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [flow, setFlow] = useState<PurchaseFlowState | null>(null);
  const purchaseTargetRef = useRef<PurchaseTarget | null>(null);
  const phaseTimerRef = useRef<number | null>(null);

  const { data, isLoading, error } = trpc.public.thirdPartyProductList.useQuery();
  const walletQuery = trpc.wallet.balance.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: true,
  });
  const products = useMemo(() => (data || []) as CatalogProduct[], [data]);
  const categories = useMemo(() => Array.from(new Set(products.map((product) => String(product.categoryName || "Digital Tools")))).sort(), [products]);
  const selectedId = id ? Number(id) : null;
  const selectedProduct = selectedId ? products.find((product) => product.id === selectedId && !product.isDirect) : null;

  useEffect(() => {
    if (!categorySlug || location.pathname.startsWith("/tools/")) return;
    const match = categories.find((category) => normalizeCategory(category) === normalizeCategory(categorySlug));
    if (match) setSelectedCategory(String(match));
  }, [categorySlug, categories, location.pathname]);

  useEffect(() => () => {
    if (phaseTimerRef.current !== null) window.clearTimeout(phaseTimerRef.current);
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch = !query || `${product.name} ${product.description || ""} ${product.categoryName || ""}`.toLowerCase().includes(query);
      const matchesCategory = selectedCategory === "all" || String(product.categoryName) === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const directOrderMutation = trpc.order.create.useMutation();
  const marketplaceMutation = trpc.thirdParty.buy.useMutation();
  const purchasePending = directOrderMutation.isPending || marketplaceMutation.isPending;

  function displayProductPrice(product: CatalogProduct) {
    return format(checkoutUnitPrice(product));
  }

  function formatUsdAmount(amount: number) {
    return format(amount);
  }

  function quantityFor(product: CatalogProduct) {
    return quantities[product.id] ?? 1;
  }

  function quantityLimit(product: CatalogProduct) {
    const configured = Math.max(1, Number(product.maxQuantity || 1));
    if (product.unlimited) return configured;
    return Math.max(1, Math.min(configured, Number(product.stock || 0)));
  }

  function updateQuantity(product: CatalogProduct, next: number) {
    const limit = quantityLimit(product);
    setQuantities((current) => ({ ...current, [product.id]: Math.max(1, Math.min(limit, next)) }));
  }

  async function runPurchase(product: CatalogProduct, quantity: number) {
    if (!isAuthenticated) {
      toast.info("Log in to buy with your Sasify wallet");
      navigate("/login");
      return;
    }
    if (!user?.id) {
      toast.error("Your session is still loading. Please try again.");
      return;
    }
    if (purchasePending) return;

    const normalizedQuantity = product.isDirect ? 1 : Math.max(1, Math.min(quantityLimit(product), quantity));
    const initialBalance = Number(walletQuery.data?.balance ?? 0);
    const estimatedDebit = checkoutUnitPrice(product) * normalizedQuantity;
    purchaseTargetRef.current = { product, quantity: normalizedQuantity };
    setFlow({
      status: "authorizing",
      productName: product.name,
      quantity: normalizedQuantity,
      channel: product.isDirect ? "direct" : "marketplace",
      beforeBalance: initialBalance,
      estimatedDebit,
    });
    const walletSnapshot = walletQuery.data ?? (await walletQuery.refetch().catch(() => null))?.data;
    const beforeBalance = Number(walletSnapshot?.balance ?? initialBalance);
    setFlow((current) => current && current.status === "authorizing" ? { ...current, beforeBalance } : current);
    phaseTimerRef.current = window.setTimeout(() => {
      setFlow((current) => current && current.status === "authorizing" ? { ...current, status: "acquiring" } : current);
    }, 650);

    try {
      if (product.isDirect) {
        if (!product.planId) throw new Error("This product does not have an active delivery plan.");
        const idempotencyKey = getPurchaseOperationKey("wallet-order", user.id, [product.id, product.planId]);
        const result = await directOrderMutation.mutateAsync({ productId: product.id, planId: product.planId, idempotencyKey });
        clearPurchaseOperationKey("wallet-order", user.id, [product.id, product.planId], idempotencyKey);
        const delivered = isReadyStatus(result.deliveryStatus);
        const actualDebit = Number(result.finalPrice || estimatedDebit);
        const nextStatus = delivered ? "delivered" : "pending";
        await Promise.all([
          utils.dashboard.summary.invalidate(),
          utils.wallet.balance.invalidate(),
          utils.wallet.transactions.invalidate(),
          utils.order.list.invalidate(),
        ]);
        setFlow({
          status: nextStatus,
          productName: product.name,
          quantity: 1,
          channel: "direct",
          beforeBalance,
          estimatedDebit,
          actualDebit,
          newBalance: Number(result.newBalance),
          orderId: result.orderId,
          orderReference: result.orderNumber,
          message: result.message,
        });
      } else {
        const idempotencyKey = getPurchaseOperationKey("third-party", user.id, [product.id, normalizedQuantity]);
        const result = await marketplaceMutation.mutateAsync({ id: product.id, quantity: normalizedQuantity, idempotencyKey });
        clearPurchaseOperationKey("third-party", user.id, [product.id, normalizedQuantity], idempotencyKey);
        const delivered = isReadyStatus(result.status);
        const closed = isClosedStatus(result.status);
        await Promise.all([
          utils.dashboard.summary.invalidate(),
          utils.wallet.balance.invalidate(),
          utils.wallet.transactions.invalidate(),
          utils.thirdParty.myOrders.invalidate(),
        ]);
        setFlow({
          status: delivered ? "delivered" : closed ? "refunded" : result.status === "pending_fulfillment" ? "pending" : "processing",
          productName: product.name,
          quantity: normalizedQuantity,
          channel: "marketplace",
          beforeBalance,
          estimatedDebit,
          actualDebit: Number(result.priceUsd || estimatedDebit),
          newBalance: Number(result.newBalance),
          orderId: result.id,
          orderReference: `Order #${result.id}`,
          message: result.message,
        });
      }
    } catch (purchaseError) {
      const message = purchaseError instanceof Error ? purchaseError.message : "Purchase could not be completed.";
      const target = purchaseTargetRef.current;
      const reconciliationPending = /pending reconciliation|outcome.*review|under review/i.test(message);
      const refunded = /refunded|wallet.*restored/i.test(message);
      const refreshed = await walletQuery.refetch().catch(() => null);
      setFlow((current) => current ? {
        ...current,
        status: reconciliationPending ? "processing" : refunded ? "refunded" : "error",
        newBalance: Number(refreshed?.data?.balance ?? current.beforeBalance),
        message,
      } : target ? {
        status: "error",
        productName: target.product.name,
        quantity: target.quantity,
        channel: target.product.isDirect ? "direct" : "marketplace",
        beforeBalance,
        estimatedDebit,
        message,
      } : null);
    } finally {
      if (phaseTimerRef.current !== null) window.clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
  }

  function closeFlow() {
    if (flow?.status === "authorizing" || flow?.status === "acquiring") return;
    setFlow(null);
  }

  function orderDestination(reveal: boolean) {
    if (!flow?.orderId) return "/dashboard/orders";
    const params = new URLSearchParams({ order: String(flow.orderId), channel: flow.channel });
    if (reveal) params.set("delivery", "1");
    return `/dashboard/orders?${params.toString()}`;
  }

  function renderPurchaseButton(product: CatalogProduct, quantity: number, className?: string) {
    const soldOut = !product.unlimited && Number(product.stock || 0) < 1;
    return <button
      type="button"
      disabled={soldOut || purchasePending}
      onClick={() => runPurchase(product, quantity)}
      className={className || "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#0a1128] px-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#155cff] disabled:cursor-not-allowed disabled:opacity-45"}
    >
      <ShoppingBag className="h-4 w-4" />
      {soldOut ? "Out of stock" : "Buy now"}
    </button>;
  }

  if (isLoading) {
    return <Layout pageKey="tools"><div className="mx-auto max-w-7xl px-4 py-10 sm:px-6"><div className="h-44 animate-pulse rounded-[2rem] bg-white shadow-sm ring-1 ring-[#dfe6ff]" /><div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-[25rem] animate-pulse rounded-3xl bg-white ring-1 ring-[#dfe6ff]" />)}</div></div></Layout>;
  }

  if (selectedId) {
    if (!selectedProduct) {
      return <Layout pageKey="tools"><div className="mx-auto max-w-4xl px-4 py-20 text-center"><h1 className="text-3xl font-black text-[#050816]">Tool not found</h1><p className="mt-3 text-sm font-semibold text-[#7c8498]">This product may be unavailable or no longer listed.</p><Link to="/tools" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-[#155cff] px-5 text-sm font-black text-white">Back to tools</Link></div></Layout>;
    }
    const quantity = quantityFor(selectedProduct);
    return (
      <Layout pageKey="tools">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <Link to="/tools" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-xs font-black text-[#596176] ring-1 ring-[#dfe6ff] hover:text-[#155cff]"><ArrowLeft className="h-4 w-4" /> All tools</Link>
          <div className="mt-5 grid overflow-hidden rounded-[2rem] border border-[#dfe6ff] bg-white shadow-[0_24px_80px_rgba(12,37,104,.12)] lg:grid-cols-[1.1fr_.9fr]">
            <section className="p-6 sm:p-9">
              <div className="flex flex-wrap gap-2"><span className="rounded-full bg-[#eef3ff] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#155cff]">{selectedProduct.categoryName}</span><span className="inline-flex items-center gap-1 rounded-full bg-[#eafff0] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#0b8f34]"><Zap className="h-3 w-3" /> {selectedProduct.instant ? "Instant" : "Managed delivery"}</span></div>
              <h1 className="mt-5 text-[clamp(2rem,7vw,4.6rem)] font-black leading-[.98] text-[#050816]" style={{ fontFamily: "Space Grotesk" }}>{selectedProduct.name}</h1>
              <p className="mt-5 max-w-2xl whitespace-pre-line text-sm font-medium leading-7 text-[#596176] sm:text-base">{selectedProduct.description || "Secure digital delivery with dashboard order tracking."}</p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">{[[ShieldCheck, "Protected checkout", "Atomic wallet debit"], [PackageCheck, "Secure delivery", "Masked in dashboard"], [Headphones, "Ticket support", "Help after purchase"]].map(([Icon, label, note]: any) => <div key={label} className="rounded-2xl border border-[#dfe6ff] bg-[#f8faff] p-4"><Icon className="h-5 w-5 text-[#155cff]" /><p className="mt-3 text-xs font-black text-[#0a1128]">{label}</p><p className="mt-1 text-[11px] font-semibold text-[#7c8498]">{note}</p></div>)}</div>
            </section>
            <aside className="bg-[linear-gradient(155deg,#07143b_0%,#075dff_56%,#6d35ff_100%)] p-6 text-white sm:p-9">
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/60">Wallet checkout</p><p className="mt-3 text-4xl font-black">{displayProductPrice(selectedProduct)}</p><p className="mt-2 text-xs font-semibold text-white/65">Per account · no hidden checkout fee</p>
              <div className="mt-7 rounded-2xl border border-white/15 bg-white/10 p-4"><div className="flex items-center justify-between"><span className="text-xs font-black">Quantity</span><div className="flex items-center rounded-xl bg-white text-[#0a1128]"><button type="button" onClick={() => updateQuantity(selectedProduct, quantity - 1)} aria-label="Decrease quantity" className="h-11 w-11"><Minus className="mx-auto h-4 w-4" /></button><span className="min-w-10 text-center text-sm font-black tabular-nums">{quantity}</span><button type="button" onClick={() => updateQuantity(selectedProduct, quantity + 1)} aria-label="Increase quantity" className="h-11 w-11"><Plus className="mx-auto h-4 w-4" /></button></div></div><div className="mt-4 flex items-center justify-between border-t border-white/15 pt-4 text-xs font-semibold text-white/70"><span>Order total</span><strong className="text-lg text-white">{formatUsdAmount(checkoutUnitPrice(selectedProduct) * quantity)}</strong></div></div>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-white/75">{selectedProduct.unlimited ? <InfinityIcon className="h-4 w-4" /> : <PackageCheck className="h-4 w-4" />} {selectedProduct.unlimited ? "Available on demand" : `${selectedProduct.stock} accounts available`}</div>
              {renderPurchaseButton(selectedProduct, quantity, "mt-7 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#ffe21f] px-5 text-sm font-black text-[#07143b] shadow-[0_16px_35px_rgba(255,226,31,.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45")}
              <p className="mt-4 text-center text-[11px] font-semibold leading-5 text-white/55">Buy now opens a live secure flow. Delivery is only marked ready after server confirmation.</p>
            </aside>
          </div>
        </div>
        <PurchaseFlowModal flow={flow} formatAmount={formatUsdAmount} onClose={closeFlow} onReady={() => navigate(orderDestination(true))} onTrack={() => navigate(orderDestination(false))} onRetry={() => purchaseTargetRef.current && runPurchase(purchaseTargetRef.current.product, purchaseTargetRef.current.quantity)} />
      </Layout>
    );
  }

  return (
    <Layout pageKey="tools">
      <div className="border-b border-[#dfe6ff] bg-[radial-gradient(circle_at_85%_20%,rgba(109,53,255,.16),transparent_28%),linear-gradient(180deg,#f8faff_0%,#eef3ff_100%)]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl"><div className="flex items-center gap-2 text-xs font-black text-[#7c8498]"><Link to="/" className="hover:text-[#155cff]">Home</Link><ChevronRight className="h-3.5 w-3.5" /><span className="text-[#155cff]">Tools</span></div><div className="mt-5 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#155cff] text-white shadow-[0_10px_25px_rgba(21,92,255,.24)]"><Sparkles className="h-5 w-5" /></span><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#155cff]">Digital marketplace</p></div><h1 className="mt-3 text-[clamp(2.25rem,6vw,4.5rem)] font-black leading-[.95] text-[#050816]" style={{ fontFamily: "Space Grotesk" }}>Find your next tool.</h1><p className="mt-4 max-w-xl text-sm font-semibold leading-6 text-[#596176] sm:text-base">Search verified digital accounts and subscriptions, then follow wallet settlement and delivery in one protected flow.</p></div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">{[[BadgeCheck, "Verified", "catalog"], [Zap, "Fast", "delivery"], [Wallet, "Wallet", "protected"]].map(([Icon, value, label]: any) => <div key={value} className="min-w-0 rounded-2xl border border-white/80 bg-white/75 p-3 text-center shadow-sm backdrop-blur sm:min-w-24"><Icon className="mx-auto h-4 w-4 text-[#155cff]" /><p className="mt-2 text-xs font-black text-[#0a1128]">{value}</p><p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-[#9aa0b4]">{label}</p></div>)}</div>
          </div>

          <div className="mt-8 rounded-[1.4rem] border border-[#ced9ff] bg-white p-2 shadow-[0_16px_45px_rgba(12,37,104,.10)] sm:flex sm:items-center">
            <label className="relative block min-w-0 flex-1"><span className="sr-only">Search tools</span><Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#155cff]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by tool, category or feature" aria-label="Search tools" className="h-14 w-full rounded-2xl bg-transparent pl-12 pr-12 text-sm font-bold text-[#0a1128] outline-none placeholder:text-[#9aa0b4] focus:bg-[#f8faff]" />{search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-[#f1f4ff] text-[#596176]"><X className="h-4 w-4" /></button>}</label>
            <div className="flex items-center justify-between gap-3 border-t border-[#edf1ff] px-3 py-2 sm:border-l sm:border-t-0 sm:px-5"><div><p className="text-lg font-black tabular-nums text-[#0a1128]">{filteredProducts.length}</p><p className="text-[9px] font-black uppercase tracking-wide text-[#9aa0b4]">results</p></div><ArrowRight className="h-4 w-4 text-[#155cff]" /></div>
          </div>

          <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Tool categories"><div className="flex w-max gap-2"><button type="button" onClick={() => setSelectedCategory("all")} aria-pressed={selectedCategory === "all"} className={`min-h-11 rounded-full px-4 text-xs font-black transition ${selectedCategory === "all" ? "bg-[#0a1128] text-white" : "border border-[#d8e0fb] bg-white text-[#596176] hover:border-[#155cff] hover:text-[#155cff]"}`}>All tools <span className="ml-1 opacity-60">{products.length}</span></button>{categories.map((category) => { const count = products.filter((product) => String(product.categoryName) === String(category)).length; return <button key={String(category)} type="button" onClick={() => setSelectedCategory(String(category))} aria-pressed={selectedCategory === String(category)} className={`min-h-11 rounded-full px-4 text-xs font-black transition ${selectedCategory === String(category) ? "bg-[#155cff] text-white" : "border border-[#d8e0fb] bg-white text-[#596176] hover:border-[#155cff] hover:text-[#155cff]"}`}>{category} <span className="ml-1 opacity-60">{count}</span></button>; })}</div></div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {error ? <div role="alert" className="rounded-3xl border border-[#ffd8e1] bg-[#fff5f7] p-7 text-center"><p className="text-base font-black text-[#b91a3f]">Catalog could not be loaded</p><p className="mt-2 text-sm font-semibold text-[#7c8498]">Please refresh or try again shortly.</p></div>
          : filteredProducts.length === 0 ? <div className="rounded-3xl border border-dashed border-[#bdc9ef] bg-[#f8faff] px-6 py-16 text-center"><Search className="mx-auto h-8 w-8 text-[#9aa0b4]" /><h2 className="mt-4 text-xl font-black text-[#0a1128]">No matching tools</h2><p className="mt-2 text-sm font-semibold text-[#7c8498]">Try a broader search or clear the selected category.</p><button type="button" onClick={() => { setSearch(""); setSelectedCategory("all"); }} className="mt-5 min-h-11 rounded-xl bg-[#155cff] px-5 text-xs font-black text-white">Reset filters</button></div>
            : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filteredProducts.map((product, index) => {
              const quantity = quantityFor(product);
              const detailsHref = product.isDirect ? `/tools/${product.slug}` : `/tools/third-party/${product.id}`;
              const soldOut = !product.unlimited && Number(product.stock || 0) < 1;
              return <motion.article key={`${product.isDirect ? "direct" : "marketplace"}-${product.id}`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.05, 0.25) }} className="group flex min-h-[27rem] flex-col overflow-hidden rounded-[1.6rem] border border-[#dfe6ff] bg-white shadow-[0_16px_45px_rgba(12,37,104,.08)] transition duration-300 hover:-translate-y-1 hover:border-[#bfd0ff] hover:shadow-[0_24px_60px_rgba(12,37,104,.14)]">
                <div className="relative h-2 overflow-hidden bg-[#edf1ff]"><div className="h-full w-2/3 bg-[linear-gradient(90deg,#075dff,#6d35ff)] transition-all duration-500 group-hover:w-full" /></div>
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-[#eef3ff] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#155cff]">{product.categoryName || "Digital tool"}</span><span className="inline-flex items-center gap-1 rounded-full bg-[#eafff0] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#0b8f34]"><Zap className="h-3 w-3" /> {product.instant ? "Instant" : "Managed"}</span></div><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0a1128] text-sm font-black text-white">{product.name.charAt(0).toUpperCase()}</span></div>
                  <h2 className="mt-5 line-clamp-2 text-xl font-black leading-tight text-[#0a1128]" style={{ fontFamily: "Space Grotesk" }}>{product.name}</h2><p className="mt-3 line-clamp-3 text-sm font-medium leading-6 text-[#687087]">{product.description || "Secure digital delivery with order tracking and support."}</p>
                  <div className="mt-5 flex items-end justify-between gap-3 border-t border-[#edf1ff] pt-5"><div><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#9aa0b4]">Wallet price</p><p className="mt-1 text-3xl font-black tabular-nums text-[#155cff]">{displayProductPrice(product)}</p><p className="mt-1 text-[10px] font-semibold text-[#7c8498]">per account</p></div><div className={`rounded-2xl px-3 py-2 text-right ${soldOut ? "bg-[#fff5f7] text-[#b91a3f]" : "bg-[#f3fff7] text-[#0b8f34]"}`}><p className="text-[10px] font-black uppercase tracking-wide">Stock</p><p className="mt-1 flex items-center justify-end gap-1 text-xs font-black">{product.unlimited ? <><InfinityIcon className="h-3.5 w-3.5" /> On demand</> : soldOut ? "Unavailable" : `${product.stock} ready`}</p></div></div>
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[#e2e7f7] bg-[#f8faff] p-2.5"><div className="px-1"><p className="text-[10px] font-black uppercase tracking-wide text-[#9aa0b4]">Quantity</p><p className="mt-0.5 text-[11px] font-semibold text-[#596176]">Max {quantityLimit(product)}</p></div><div className="flex items-center rounded-xl border border-[#d8e0fb] bg-white"><button type="button" onClick={() => updateQuantity(product, quantity - 1)} aria-label={`Decrease ${product.name} quantity`} className="h-10 w-10 text-[#596176] hover:text-[#155cff]"><Minus className="mx-auto h-4 w-4" /></button><span className="min-w-9 text-center text-sm font-black tabular-nums text-[#0a1128]">{quantity}</span><button type="button" onClick={() => updateQuantity(product, quantity + 1)} aria-label={`Increase ${product.name} quantity`} className="h-10 w-10 text-[#596176] hover:text-[#155cff]"><Plus className="mx-auto h-4 w-4" /></button></div></div>
                  <div className="mt-auto grid grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)] gap-2 pt-5"><Link to={detailsHref} className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-[#d8e0fb] bg-white px-3 text-xs font-black text-[#596176] transition hover:border-[#155cff] hover:text-[#155cff]">Details <ChevronRight className="h-3.5 w-3.5" /></Link>{renderPurchaseButton(product, quantity)}</div>
                </div>
              </motion.article>;
            })}</div>}
      </main>

      <PurchaseFlowModal flow={flow} formatAmount={formatUsdAmount} onClose={closeFlow} onReady={() => navigate(orderDestination(true))} onTrack={() => navigate(orderDestination(false))} onRetry={() => purchaseTargetRef.current && runPurchase(purchaseTargetRef.current.product, purchaseTargetRef.current.quantity)} />
    </Layout>
  );
}

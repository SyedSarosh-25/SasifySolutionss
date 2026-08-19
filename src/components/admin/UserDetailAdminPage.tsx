import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { trpc } from "@/providers/trpc";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";
import { clearPurchaseOperationKey, getPurchaseOperationKey } from "@/lib/purchase-idempotency";
import {
  Activity,
  ArrowDownCircle,
  ArrowLeft,
  ArrowUpCircle,
  Copy,
  CreditCard,
  Eye,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  User,
  Wallet,
  XCircle,
} from "lucide-react";

function formatDateTime(date?: string | Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusTone(status: string) {
  const value = String(status || "pending").toLowerCase();
  if (["delivered", "paid", "completed"].includes(value)) return "border-[#bde9ca] bg-[#f2fcf5] text-[#0b8f34]";
  if (["refunded", "cancelled", "failed", "rejected"].includes(value)) return "border-[#f2c6d1] bg-[#fff7f9] text-[#d11f4a]";
  if (["processing", "pending_fulfillment"].includes(value)) return "border-[#d6e1ff] bg-[#f5f8ff] text-[#155cff]";
  return "border-[#eadfb8] bg-[#fffaf0] text-[#9b6200]";
}

export default function UserDetailAdminPage() {
  const location = useLocation();
  const userId = Number(new URLSearchParams(location.search).get("id"));
  const query = trpc.admin.userById.useQuery({ id: userId }, { enabled: userId > 0 });
  const { format } = useCurrency();
  const utils = trpc.useUtils();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentVerified, setAdjustmentVerified] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [transactionSearch, setTransactionSearch] = useState("");
  const [transactionType, setTransactionType] = useState<"all" | "credit" | "debit">("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderType, setOrderType] = useState<"all" | "direct" | "marketplace">("all");
  const [orderStatus, setOrderStatus] = useState("all");

  const orderRows = useMemo(() => {
    if (!query.data) return [] as any[];
    const direct = query.data.directOrders.map((order: any) => ({
      ...order,
      type: "direct",
      displayId: order.orderNumber || `#${order.id}`,
      amount: Number(order.finalPrice || 0),
      items: [],
    }));
    const marketplace = query.data.marketplaceOrders.map((order: any) => ({
      ...order,
      type: "marketplace",
      displayId: `#${order.id}`,
      amount: Number(order.priceUsd || 0),
    }));
    return [...direct, ...marketplace].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [query.data]);

  const metrics = useMemo(() => {
    const transactions = query.data?.walletTransactions || [];
    const delivered = orderRows.filter((order) => String(order.status) === "delivered");
    const retainedOrderValue = orderRows
      .filter((order) => !["refunded", "cancelled", "failed"].includes(String(order.status)))
      .reduce((sum, order) => sum + Number(order.amount || 0), 0);
    return {
      totalOrders: orderRows.length,
      delivered: delivered.length,
      retainedOrderValue,
      walletEvents: transactions.length,
    };
  }, [query.data, orderRows]);

  const visibleTransactions = useMemo(() => {
    const rows = query.data?.walletTransactions || [];
    const search = transactionSearch.trim().toLowerCase();
    return rows.filter((transaction: any) => {
      if (transactionType !== "all" && transaction.type !== transactionType) return false;
      if (!search) return true;
      return [transaction.id, transaction.type, transaction.amount, transaction.note, transaction.referenceType]
        .some((value) => String(value ?? "").toLowerCase().includes(search));
    });
  }, [query.data, transactionType, transactionSearch]);

  const visibleOrders = useMemo(() => {
    const search = orderSearch.trim().toLowerCase();
    return orderRows.filter((order) => {
      if (orderType !== "all" && order.type !== orderType) return false;
      if (orderStatus !== "all" && String(order.status) !== orderStatus) return false;
      if (!search) return true;
      return [order.displayId, order.productName, order.status, order.type]
        .some((value) => String(value ?? "").toLowerCase().includes(search));
    });
  }, [orderRows, orderType, orderStatus, orderSearch]);

  const statuses = useMemo(() => Array.from(new Set(orderRows.map((order) => String(order.status || "pending")))).sort(), [orderRows]);
  const currentBalance = Number(query.data?.user?.walletBalance || 0);
  const adjustmentAmount = Number(amount || 0);
  const projectedBalance = type === "credit" ? currentBalance + adjustmentAmount : currentBalance - adjustmentAmount;
  const invalidDebit = type === "debit" && adjustmentAmount > currentBalance;

  const adjust = trpc.admin.walletAdjust.useMutation({
    onSuccess: (result, variables) => {
      toast.success(result.replayed ? "Wallet adjustment already applied" : "Wallet adjusted");
      clearPurchaseOperationKey("admin-wallet-adjust", userId, [variables.type, Math.round(variables.amount * 100), variables.note.trim()], variables.idempotencyKey);
      setAmount("");
      setNote("");
      setAdjustmentVerified(false);
      setAdjustmentOpen(false);
      utils.admin.userById.invalidate({ id: userId });
      utils.admin.userList.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  function submitAdjustment(event: React.FormEvent) {
    event.preventDefault();
    if (!Number.isFinite(adjustmentAmount) || adjustmentAmount <= 0) return toast.error("Enter a positive amount");
    if (!note.trim()) return toast.error("Enter an internal reason");
    if (invalidDebit) return toast.error("Debit exceeds the available wallet balance");
    if (!adjustmentVerified) return toast.error("Confirm the wallet adjustment review");
    const trimmedNote = note.trim();
    adjust.mutate({
      userId,
      type,
      amount: adjustmentAmount,
      note: trimmedNote,
      idempotencyKey: getPurchaseOperationKey("admin-wallet-adjust", userId, [type, Math.round(adjustmentAmount * 100), trimmedNote]),
    });
  }

  function resetAdjustment() {
    setAdjustmentOpen(false);
    setAmount("");
    setNote("");
    setType("credit");
    setAdjustmentVerified(false);
  }

  function copyItem(value: string) {
    navigator.clipboard.writeText(value).then(() => toast.success("Copied"));
  }

  if (userId <= 0) {
    return <div className="rounded-xl border border-[#f2c6d1] bg-[#fff7f9] p-8 text-center"><p className="text-sm font-bold text-[#d11f4a]">Invalid user reference</p><Link to="/admin/users" className="mt-3 inline-flex text-xs font-bold text-[#155cff]">Return to users</Link></div>;
  }
  if (query.isLoading) {
    return <div className="space-y-4" aria-busy="true"><div className="h-32 animate-pulse rounded-xl bg-[#e9efff]" /><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-xl bg-[#e9efff]" />)}</div><div className="h-80 animate-pulse rounded-xl bg-[#e9efff]" /></div>;
  }
  if (query.error || !query.data) {
    return <div className="rounded-xl border border-[#f2c6d1] bg-[#fff7f9] p-8 text-center"><p className="text-sm font-bold text-[#d11f4a]">User profile could not be loaded.</p><p className="mt-1 text-xs text-[#7c8498]">{query.error?.message || "User not found"}</p><div className="mt-3 flex justify-center gap-3"><button type="button" onClick={() => query.refetch()} className="text-xs font-bold text-[#155cff]">Try again</button><Link to="/admin/users" className="text-xs font-bold text-[#596176]">Back to users</Link></div></div>;
  }

  const { user } = query.data;
  const initial = String(user.name || user.email || "U").trim().charAt(0).toUpperCase();

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-xl border border-[#263861] bg-[linear-gradient(135deg,#18284e_0%,#0a1128_72%)] p-5 text-white shadow-[0_7px_0_#050816,0_18px_34px_rgba(10,17,40,0.22)]">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/10" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-[linear-gradient(145deg,#4f82ff,#6d35ff)] text-xl font-black shadow-[0_5px_0_#293386]">{initial}</span>
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-xl font-black tracking-[-0.025em]">{user.name || "Unnamed user"}</h2><span className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${user.role === "admin" ? "border-[#f1d691]/30 bg-[#f1d691]/10 text-[#ffe5a3]" : "border-white/15 bg-white/10 text-white/75"}`}>{user.role || "user"}</span></div><p className="mt-1 truncate text-xs text-white/60">{user.email || "No email recorded"}</p><p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">User #{user.id} · Joined {formatDateTime(user.createdAt)}</p></div>
          </div>
          <div className="flex flex-wrap gap-2"><Link to="/admin/users" className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 text-xs font-bold text-white hover:bg-white/15"><ArrowLeft className="h-3.5 w-3.5" /> Users</Link><button type="button" onClick={() => setAdjustmentOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-xs font-bold text-[#0a1128] hover:bg-[#eef3ff]"><Wallet className="h-3.5 w-3.5 text-[#155cff]" /> Adjust wallet</button></div>
        </div>
      </section>

      <section aria-label="User account metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Wallet balance", value: format(currentBalance), note: `${metrics.walletEvents} ledger entries`, icon: Wallet, tone: "border-[#bde9ca] bg-[linear-gradient(145deg,#f8fff9,#eafff0)] shadow-[0_6px_0_#b9e5c5,0_14px_24px_rgba(11,143,52,0.09)]", valueTone: "text-[#0b8f34]" },
          { label: "Total orders", value: metrics.totalOrders, note: "Direct + marketplace", icon: ShoppingBag, tone: "border-[#d6e1ff] bg-[linear-gradient(145deg,#ffffff,#eef3ff)] shadow-[0_6px_0_#ccd9fb,0_14px_24px_rgba(21,92,255,0.08)]", valueTone: "text-[#155cff]" },
          { label: "Delivered", value: metrics.delivered, note: `${metrics.totalOrders - metrics.delivered} other outcomes`, icon: PackageCheck, tone: "border-[#bde9ca] bg-[linear-gradient(145deg,#ffffff,#f0fff4)] shadow-[0_6px_0_#c5e9cf,0_14px_24px_rgba(11,143,52,0.07)]", valueTone: "text-[#0b8f34]" },
          { label: "Retained order value", value: format(metrics.retainedOrderValue), note: "Excludes refunded/failed", icon: Activity, tone: "border-[#ffdfad] bg-[linear-gradient(145deg,#fffdf7,#fff5df)] shadow-[0_6px_0_#f5dfb9,0_14px_24px_rgba(184,120,0,0.09)]", valueTone: "text-[#9b6200]" },
        ].map((item) => <article key={item.label} className={`rounded-xl border p-4 ${item.tone}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8992aa]">{item.label}</p><p className={`mt-3 text-xl font-black leading-tight tabular-nums sm:text-2xl ${item.valueTone}`}>{item.value}</p><p className="mt-1 text-[11px] text-[#7c8498]">{item.note}</p></div><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white bg-white/80 text-[#155cff] shadow-sm"><item.icon className="h-4 w-4" /></span></div></article>)}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="rounded-xl border border-[#dfe6ff] bg-white p-5 shadow-[0_8px_24px_rgba(12,37,104,0.06)]"><div className="flex items-center gap-2"><User className="h-4 w-4 text-[#155cff]" /><h3 className="text-sm font-bold text-[#0a1128]">Account profile</h3></div><dl className="mt-4 grid gap-4 sm:grid-cols-2">{[["Full name", user.name || "Not recorded"], ["Email address", user.email || "Not recorded"], ["Account role", String(user.role || "user")], ["Created", formatDateTime(user.createdAt)], ["User ID", `#${user.id}`], ["Last updated", formatDateTime(user.updatedAt)]].map(([label, value]) => <div key={label} className="rounded-lg border border-[#e7ecff] bg-[#f8faff] p-3"><dt className="text-[10px] font-bold uppercase tracking-wide text-[#8992aa]">{label}</dt><dd className="mt-1 break-words text-xs font-semibold capitalize text-[#0a1128]">{value}</dd></div>)}</dl></article>
        <aside className="rounded-xl border border-[#dfe6ff] bg-white p-5 shadow-[0_8px_24px_rgba(12,37,104,0.06)]"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#0b8f34]" /><h3 className="text-sm font-bold text-[#0a1128]">Financial controls</h3></div><p className="mt-3 text-xs leading-5 text-[#7c8498]">Manual wallet adjustments are audited and idempotent. Every credit or debit requires a reason and projected-balance confirmation.</p><div className="mt-4 rounded-lg border border-[#dfe6ff] bg-[#f8faff] p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[#8992aa]">Current available balance</p><p className="mt-2 text-xl font-black tabular-nums text-[#0b8f34]">{format(currentBalance)}</p></div><button type="button" onClick={() => setAdjustmentOpen(true)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0a1128] px-4 py-2.5 text-xs font-bold text-white"><Wallet className="h-3.5 w-3.5" /> Open wallet adjustment</button></aside>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#dfe6ff] bg-white shadow-[0_10px_30px_rgba(12,37,104,0.06)]">
        <div className="border-b border-[#e7ecff] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-[#155cff]" /><h3 className="text-sm font-bold text-[#0a1128]">Wallet ledger</h3></div><p className="mt-1 text-[11px] text-[#8992aa]">Audited balance movements and resulting wallet position</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8992aa]" /><input type="search" value={transactionSearch} onChange={(event) => setTransactionSearch(event.target.value)} placeholder="Search ledger note or reference" className="h-9 w-full rounded-lg border border-[#dfe6ff] bg-[#f8faff] pl-8 pr-3 text-xs text-[#0a1128] outline-none focus:border-[#155cff] sm:w-64" /></label><select value={transactionType} onChange={(event) => setTransactionType(event.target.value as any)} className="h-9 rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs font-semibold text-[#596176]"><option value="all">All movements</option><option value="credit">Credits</option><option value="debit">Debits</option></select></div></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[58rem] text-left"><thead className="bg-[#f8faff] text-[10px] font-bold uppercase tracking-[0.1em] text-[#7c8498]"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Movement</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Balance after</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Note</th></tr></thead><tbody className="divide-y divide-[#e7ecff]">{visibleTransactions.map((transaction: any) => <tr key={transaction.id} className="text-[#596176] hover:bg-[#fbfcff]"><td className="px-4 py-3 text-[11px]">{formatDateTime(transaction.createdAt)}</td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-bold uppercase ${transaction.type === "credit" ? "border-[#bde9ca] bg-[#f2fcf5] text-[#0b8f34]" : "border-[#f2c6d1] bg-[#fff7f9] text-[#d11f4a]"}`}>{transaction.type === "credit" ? <ArrowDownCircle className="h-3 w-3" /> : <ArrowUpCircle className="h-3 w-3" />}{transaction.type}</span></td><td className={`px-4 py-3 text-xs font-black tabular-nums ${transaction.type === "credit" ? "text-[#0b8f34]" : "text-[#d11f4a]"}`}>{transaction.type === "credit" ? "+" : "−"}{format(Number(transaction.amount || 0))}</td><td className="px-4 py-3 text-xs font-bold tabular-nums text-[#0a1128]">{format(Number(transaction.balanceAfter || 0))}</td><td className="px-4 py-3 font-mono text-[10px] text-[#8992aa]">{transaction.referenceType ? String(transaction.referenceType).replaceAll("_", " ") : `TX #${transaction.id}`}</td><td className="px-4 py-3"><p className="max-w-[18rem] truncate text-xs">{transaction.note || "No note"}</p></td></tr>)}</tbody></table></div>
        {visibleTransactions.length === 0 && <div className="border-t border-[#e7ecff] px-4 py-10 text-center text-xs text-[#8992aa]">No matching wallet movements.</div>}
        {visibleTransactions.length > 0 && <div className="border-t border-[#e7ecff] bg-[#fbfcff] px-4 py-2.5 text-[11px] text-[#7c8498]">Showing <span className="font-bold text-[#0a1128]">{visibleTransactions.length}</span> of {query.data.walletTransactions.length} ledger entries</div>}
      </section>

      <section className="overflow-hidden rounded-xl border border-[#dfe6ff] bg-white shadow-[0_10px_30px_rgba(12,37,104,0.06)]">
        <div className="border-b border-[#e7ecff] p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-[#155cff]" /><h3 className="text-sm font-bold text-[#0a1128]">Unified order history</h3></div><p className="mt-1 text-[11px] text-[#8992aa]">Direct and marketplace purchases in one operational view</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8992aa]" /><input type="search" value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder="Search order or product" className="h-9 w-full rounded-lg border border-[#dfe6ff] bg-[#f8faff] pl-8 pr-3 text-xs text-[#0a1128] outline-none sm:w-56" /></label><select value={orderType} onChange={(event) => setOrderType(event.target.value as any)} className="h-9 rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs font-semibold text-[#596176]"><option value="all">All order types</option><option value="direct">Direct</option><option value="marketplace">Marketplace</option></select><select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)} className="h-9 rounded-lg border border-[#dfe6ff] bg-white px-3 text-xs font-semibold capitalize text-[#596176]"><option value="all">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></div></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[62rem] text-left"><thead className="bg-[#f8faff] text-[10px] font-bold uppercase tracking-[0.1em] text-[#7c8498]"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Created</th><th className="px-4 py-3 text-right">Delivery</th></tr></thead><tbody className="divide-y divide-[#e7ecff]">{visibleOrders.map((order) => <tr key={`${order.type}-${order.id}`} className="text-[#596176] hover:bg-[#fbfcff]"><td className="px-4 py-3 font-mono text-xs font-bold text-[#0a1128]">{order.displayId}</td><td className="px-4 py-3"><p className="max-w-[16rem] truncate text-xs font-semibold text-[#0a1128]">{order.productName || "Product"}</p>{order.quantity && <p className="mt-1 text-[10px] text-[#8992aa]">Quantity {order.quantity}</p>}</td><td className="px-4 py-3"><span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8498]">{order.type}</span></td><td className="px-4 py-3"><span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${statusTone(order.status)}`}>{String(order.status).replaceAll("_", " ")}</span></td><td className="px-4 py-3 text-xs font-black tabular-nums text-[#0a1128]">{format(order.amount)}</td><td className="px-4 py-3 text-[11px] text-[#7c8498]">{formatDateTime(order.createdAt)}</td><td className="px-4 py-3 text-right">{Array.isArray(order.items) && order.items.length > 0 ? <button type="button" onClick={() => setSelectedOrder(order)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dfe6ff] bg-white px-2.5 text-xs font-bold text-[#155cff]"><Eye className="h-3.5 w-3.5" /> View items</button> : <span className="text-[11px] text-[#b0b6c6]">No items</span>}</td></tr>)}</tbody></table></div>
        {visibleOrders.length === 0 && <div className="border-t border-[#e7ecff] px-4 py-10 text-center text-xs text-[#8992aa]">No matching orders.</div>}
        {visibleOrders.length > 0 && <div className="border-t border-[#e7ecff] bg-[#fbfcff] px-4 py-2.5 text-[11px] text-[#7c8498]">Showing <span className="font-bold text-[#0a1128]">{visibleOrders.length}</span> of {orderRows.length} orders</div>}
      </section>

      {adjustmentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050816]/60 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="wallet-adjustment-title" onClick={resetAdjustment}><form onSubmit={submitAdjustment} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4 border-b border-[#e7ecff] px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8992aa]">Audited financial action</p><h2 id="wallet-adjustment-title" className="mt-1 text-lg font-bold text-[#0a1128]">Adjust {user.name || "user"}'s wallet</h2></div><button type="button" onClick={resetAdjustment} className="rounded-lg border border-[#dfe6ff] p-2 text-[#596176]" aria-label="Close wallet adjustment"><XCircle className="h-4 w-4" /></button></div><div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3"><div className="rounded-lg border border-[#dfe6ff] bg-[#f8faff] p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[#8992aa]">Current balance</p><p className="mt-1 text-lg font-black tabular-nums text-[#0a1128]">{format(currentBalance)}</p></div><div className={`rounded-lg border p-3 ${invalidDebit ? "border-[#f2c6d1] bg-[#fff7f9]" : "border-[#bde9ca] bg-[#f2fcf5]"}`}><p className="text-[10px] font-bold uppercase tracking-wide text-[#8992aa]">Projected balance</p><p className={`mt-1 text-lg font-black tabular-nums ${invalidDebit ? "text-[#d11f4a]" : "text-[#0b8f34]"}`}>{format(projectedBalance)}</p></div></div>
          <div><span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8498]">Adjustment type</span><div className="mt-2 grid grid-cols-2 rounded-lg border border-[#dfe6ff] bg-[#f8faff] p-1">{(["credit", "debit"] as const).map((value) => <button key={value} type="button" onClick={() => { setType(value); setAdjustmentVerified(false); }} className={`rounded-md px-3 py-2.5 text-xs font-bold capitalize ${type === value ? value === "credit" ? "bg-[#0b8f34] text-white shadow-sm" : "bg-[#d11f4a] text-white shadow-sm" : "text-[#7c8498]"}`}>{value}</button>)}</div></div>
          <label className="block"><span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8498]">Amount (USD)</span><input type="number" step="0.01" min="0.01" value={amount} onChange={(event) => { setAmount(event.target.value); setAdjustmentVerified(false); }} placeholder="0.00" className="mt-2 h-11 w-full rounded-lg border border-[#dfe6ff] px-3 text-sm text-[#0a1128] outline-none focus:border-[#155cff]" /></label>
          <label className="block"><span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8498]">Required internal reason</span><textarea value={note} onChange={(event) => { setNote(event.target.value); setAdjustmentVerified(false); }} rows={3} placeholder="Why is this wallet adjustment required?" maxLength={500} className="mt-2 w-full rounded-lg border border-[#dfe6ff] p-3 text-sm text-[#0a1128] outline-none focus:border-[#155cff]" /><span className="mt-1 block text-right text-[10px] text-[#8992aa]">{note.length}/500</span></label>
          {invalidDebit && <div className="rounded-lg border border-[#f2c6d1] bg-[#fff7f9] p-3 text-xs font-semibold text-[#d11f4a]">Debit exceeds the available wallet balance.</div>}
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#dfe6ff] bg-[#f8faff] p-3 text-xs leading-5 text-[#0a1128]"><input type="checkbox" checked={adjustmentVerified} onChange={(event) => setAdjustmentVerified(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#155cff]" /><span>I verified the user, adjustment type, amount, projected balance, and audit reason. I understand this changes the wallet ledger.</span></label>
          <div className="flex justify-end gap-2 border-t border-[#e7ecff] pt-4"><button type="button" onClick={resetAdjustment} className="rounded-lg border border-[#dfe6ff] px-4 py-2.5 text-xs font-bold text-[#596176]">Cancel</button><button type="submit" disabled={adjust.isPending || !adjustmentVerified || !note.trim() || adjustmentAmount <= 0 || invalidDebit} className={`rounded-lg px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 ${type === "credit" ? "bg-[#0b8f34]" : "bg-[#d11f4a]"}`}>{adjust.isPending ? "Applying..." : `${type === "credit" ? "Credit" : "Debit"} ${format(adjustmentAmount)}`}</button></div>
        </div></form></div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050816]/60 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delivered-items-title" onClick={() => setSelectedOrder(null)}><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4 border-b border-[#e7ecff] px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-wide text-[#155cff]">Delivered order {selectedOrder.displayId}</p><h2 id="delivered-items-title" className="mt-1 text-lg font-bold text-[#0a1128]">{selectedOrder.productName}</h2></div><button type="button" onClick={() => setSelectedOrder(null)} className="rounded-lg border border-[#dfe6ff] p-2 text-[#596176]" aria-label="Close delivered items"><XCircle className="h-4 w-4" /></button></div><div className="space-y-3 p-5">{(selectedOrder.items || []).map((item: any, index: number) => { const content = String(item?.content || item || ""); return <div key={index} className="flex items-start gap-3 rounded-lg border border-[#dfe6ff] bg-[#f8faff] p-4"><pre className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-[11px] leading-5 text-[#0a1128]">{content}</pre><button type="button" onClick={() => copyItem(content)} className="rounded-lg border border-[#dfe6ff] bg-white p-2 text-[#155cff]" aria-label={`Copy delivered item ${index + 1}`}><Copy className="h-3.5 w-3.5" /></button></div>; })}</div></div></div>
      )}
    </div>
  );
}

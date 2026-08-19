import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";
import {
  Copy,
  Eye,
  RefreshCw,
  RotateCcw,
  X,
  AlertCircle,
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
  const s = String(status).toLowerCase();
  if (s === "delivered") return "bg-[#eafff0] text-[#0b8f34]";
  if (s === "refunded" || s === "cancelled" || s === "failed") return "bg-[#fff0f4] text-[#d11f4a]";
  if (s === "processing") return "bg-[#eef3ff] text-[#155cff]";
  return "bg-[#fff7df] text-[#9b6200]";
}

export default function MarketplaceOrdersAdmin() {
  const { data: orders, isLoading } = trpc.admin.thirdPartyOrderList.useQuery();
  const utils = trpc.useUtils();
  const { format } = useCurrency();
  const [selected, setSelected] = useState<any | null>(null);
  const [deliveryItems, setDeliveryItems] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");

  const resolve = trpc.admin.thirdPartyOrderResolve.useMutation({
    onSuccess: () => {
      toast.success("Order reconciled");
      utils.admin.thirdPartyOrderList.invalidate();
      setSelected(null);
      setDeliveryItems("");
      setResolutionNote("");
    },
    onError: (e) => toast.error(e.message),
  });

  const refund = trpc.admin.thirdPartyOrderRefund.useMutation({
    onSuccess: () => {
      toast.success("Order refunded");
      utils.admin.thirdPartyOrderList.invalidate();
      setSelected(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const retry = trpc.admin.thirdPartyOrderRetryProvider.useMutation({
    onSuccess: () => {
      toast.success("Provider retry queued");
      utils.admin.thirdPartyOrderList.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function copyItem(value: string) {
    navigator.clipboard.writeText(value).then(() => toast.success("Copied"));
  }

  function open(order: any) {
    setSelected(order);
    setDeliveryItems((order.items || []).map((item: any) => item?.content || String(item)).join("\n"));
    setResolutionNote("Verified against provider order");
  }

  const rows = Array.isArray(orders) ? orders : [];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-6 shadow-[0_16px_42px_rgba(12,37,104,0.1)] ring-1 ring-[#dfe6ff]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-medium text-[#050816]">Marketplace Orders</h3>
            <p className="text-xs text-[#7c8498]">Provider delivery results and reconciliation queue</p>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[64rem] w-full text-sm">
            <thead>
              <tr className="border-b border-[#dfe6ff] text-left text-xs uppercase tracking-wider text-[#7c8498]">
                <th className="pb-3 pr-4">Order</th>
                <th className="pb-3 pr-4">User</th>
                <th className="pb-3 pr-4">Product</th>
                <th className="pb-3 pr-4">Provider</th>
                <th className="pb-3 pr-4">Price</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Created</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7ecff]">
              {isLoading ? (
                <tr><td colSpan={8} className="py-6 text-center text-[#7c8498]">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="py-6 text-center text-[#7c8498]">No marketplace orders yet.</td></tr>
              ) : (
                rows.map((order: any) => (
                  <tr key={order.id} className="text-[#596176]">
                    <td className="py-3 pr-4 font-mono text-xs">#{order.id}</td>
                    <td className="py-3 pr-4">
                      <span className="block text-[#050816]">{order.userName || "Customer"}</span>
                      {order.userEmail && <span className="block text-xs text-[#7c8498]">{order.userEmail}</span>}
                    </td>
                    <td className="py-3 pr-4 text-[#050816]">{order.productName}</td>
                    <td className="py-3 pr-4 capitalize">{order.provider}</td>
                    <td className="py-3 pr-4 text-[#050816]">{format(Number(order.priceUsd || 0))}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${statusTone(order.status)}`}>
                        {String(order.status).replaceAll("_", " ")}
                      </span>
                      {order.reconciliationStatus === "needs_review" && (
                        <span className="mt-1 block text-[10px] text-[#d11f4a]">Needs review</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-xs">{formatDateTime(order.createdAt)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => open(order)}
                          className="tap-target inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef3ff] text-[#155cff] hover:bg-[#dfe6ff]"
                          title="View provider delivery"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {!["delivered", "refunded", "cancelled", "failed"].includes(String(order.status)) && (
                          <>
                            <button
                              type="button"
                              onClick={() => retry.mutate({ id: order.id })}
                              disabled={retry.isPending}
                              className="tap-target inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0fdf4] text-[#0b8f34] hover:bg-[#dcfce7] disabled:opacity-50"
                              title="Retry provider purchase"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => refund.mutate({ id: order.id, note: "Refunded by admin" })}
                              disabled={refund.isPending}
                              className="tap-target inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0f4] text-[#d11f4a] hover:bg-[#ffe4ec] disabled:opacity-50"
                              title="Refund"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050816]/55 p-4 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#155cff]">Marketplace order #{selected.id}</p>
                <h3 className="mt-1 text-lg font-bold text-[#0a1128]">{selected.productName}</h3>
                <p className="mt-1 text-xs text-[#7c8498]">{selected.userName} · {selected.userEmail || "No email"} · {selected.provider}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="tap-target rounded-xl bg-[#f4f6ff] p-2 text-[#5c6478]"><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-[#f8faff] p-3 ring-1 ring-[#dfe6ff]">
                <p className="text-[10px] font-bold uppercase text-[#7c8498]">Status</p>
                <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-black ${statusTone(selected.status)}`}>{String(selected.status).replaceAll("_", " ")}</p>
              </div>
              <div className="rounded-xl bg-[#f8faff] p-3 ring-1 ring-[#dfe6ff]">
                <p className="text-[10px] font-bold uppercase text-[#7c8498]">Price</p>
                <p className="mt-1 text-sm font-bold text-[#0a1128]">{format(Number(selected.priceUsd || 0))}</p>
              </div>
              <div className="rounded-xl bg-[#f8faff] p-3 ring-1 ring-[#dfe6ff]">
                <p className="text-[10px] font-bold uppercase text-[#7c8498]">Created</p>
                <p className="mt-1 text-xs text-[#0a1128]">{formatDateTime(selected.createdAt)}</p>
              </div>
              <div className="rounded-xl bg-[#f8faff] p-3 ring-1 ring-[#dfe6ff]">
                <p className="text-[10px] font-bold uppercase text-[#7c8498]">Provider ID</p>
                <p className="mt-1 break-all font-mono text-xs text-[#0a1128]">{selected.externalOrderId || "—"}</p>
              </div>
            </div>

            {selected.errorMessage && (
              <div className="mt-4 rounded-xl bg-[#fff0f4] p-4 text-sm text-[#d11f4a]">
                <div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{selected.errorMessage}</span></div>
                {selected.errorCode && <p className="mt-1 font-mono text-xs">{selected.errorCode}</p>}
              </div>
            )}

            <div className="mt-5 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#7c8498]">Delivered items</p>
              {(selected.items || []).length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#dfe6ff] p-5 text-center text-sm text-[#9aa0b4]">No delivered item recorded yet.</p>
              ) : (
                (selected.items || []).map((item: any, index: number) => {
                  const content = String(item?.content || item || "");
                  return (
                    <div key={index} className="flex items-start gap-3 rounded-2xl border border-[#dfe6ff] bg-[#f8faff] p-4">
                      <pre className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-[12px] leading-6 text-[#0a1128]">{content}</pre>
                      <button type="button" onClick={() => copyItem(content)} className="tap-target rounded-lg bg-white p-2 text-[#155cff]"><Copy className="h-3.5 w-3.5" /></button>
                    </div>
                  );
                })
              )}
            </div>

            {!["delivered", "refunded", "cancelled", "failed"].includes(String(selected.status)) && (
              <div className="mt-5 space-y-3 border-t border-[#f0f3ff] pt-5">
                <div>
                  <label className="text-[11px] font-bold uppercase text-[#7c8498]">Delivered item(s), one per line</label>
                  <textarea value={deliveryItems} onChange={(e) => setDeliveryItems(e.target.value)} rows={5} className="mt-1 w-full rounded-xl border border-[#dfe6ff] bg-[#f8faff] p-3 font-mono text-xs text-[#0a1128] outline-none focus:border-[#155cff]" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-[#7c8498]">Resolution note</label>
                  <input value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} className="mt-1 w-full rounded-xl border border-[#dfe6ff] bg-[#f8faff] px-3 py-2.5 text-xs text-[#0a1128] outline-none focus:border-[#155cff]" />
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <button type="button" disabled={resolve.isPending} onClick={() => resolve.mutate({ id: selected.id, resolution: "delivered", items: deliveryItems.split("\n").map((item) => item.trim()).filter(Boolean), note: resolutionNote })} className="rounded-xl bg-[#155cff] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Mark Delivered</button>
                  <button type="button" disabled={refund.isPending} onClick={() => refund.mutate({ id: selected.id, note: resolutionNote || "Refunded by admin" })} className="rounded-xl bg-[#0a1128] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Refund</button>
                  <button type="button" disabled={resolve.isPending} onClick={() => resolve.mutate({ id: selected.id, resolution: "cancelled", items: [], note: resolutionNote || "Cancelled by admin" })} className="rounded-xl bg-[#fff0f4] px-4 py-2.5 text-xs font-bold text-[#d11f4a] disabled:opacity-50">Cancel + Refund</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

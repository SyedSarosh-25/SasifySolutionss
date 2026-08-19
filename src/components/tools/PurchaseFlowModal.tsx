import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CircleDollarSign,
  Clock3,
  LoaderCircle,
  LockKeyhole,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";

export type PurchaseFlowStatus =
  | "authorizing"
  | "acquiring"
  | "delivered"
  | "processing"
  | "pending"
  | "refunded"
  | "error";

export type PurchaseFlowState = {
  status: PurchaseFlowStatus;
  productName: string;
  quantity: number;
  channel: "direct" | "marketplace";
  beforeBalance: number;
  estimatedDebit: number;
  actualDebit?: number;
  newBalance?: number;
  orderId?: number;
  orderReference?: string;
  message?: string;
};

type PurchaseFlowModalProps = {
  flow: PurchaseFlowState | null;
  formatAmount: (amount: number) => string;
  onClose: () => void;
  onReady: () => void;
  onTrack: () => void;
  onRetry: () => void;
};

const terminalStatuses: PurchaseFlowStatus[] = ["delivered", "processing", "pending", "refunded", "error"];

function stageState(status: PurchaseFlowStatus, index: number) {
  if (status === "authorizing") return index === 0 ? "active" : "waiting";
  if (status === "acquiring") return index < 1 ? "complete" : index === 1 ? "active" : "waiting";
  if (status === "delivered") return "complete";
  if (status === "processing" || status === "pending") return index < 2 ? "complete" : index === 2 ? "active" : "waiting";
  if (status === "refunded") return index === 0 ? "complete" : "waiting";
  return index === 0 ? "error" : "waiting";
}

export default function PurchaseFlowModal({ flow, formatAmount, onClose, onReady, onTrack, onRetry }: PurchaseFlowModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const isPending = flow?.status === "authorizing" || flow?.status === "acquiring";
  const isTerminal = flow ? terminalStatuses.includes(flow.status) : false;
  const progress = flow?.status === "authorizing"
    ? 22
    : flow?.status === "acquiring"
      ? 58
      : flow?.status === "delivered"
        ? 100
        : flow?.status === "processing" || flow?.status === "pending"
          ? 78
          : flow?.status === "refunded"
            ? 100
            : 34;
  const title = flow?.status === "authorizing"
    ? "Checking your wallet"
    : flow?.status === "acquiring"
      ? "Getting your account"
      : flow?.status === "delivered"
        ? "Your account is ready"
        : flow?.status === "processing" || flow?.status === "pending"
          ? "Delivery is in progress"
          : flow?.status === "refunded"
            ? "Purchase refunded"
            : "Purchase could not complete";
  const subtitle = flow?.status === "authorizing"
    ? "Verifying your balance, price and secure purchase request."
    : flow?.status === "acquiring"
      ? "Your request is being finalized. We only mark delivery ready after the server confirms it."
      : flow?.status === "delivered"
        ? "The secure delivery is now available in your dashboard."
        : flow?.status === "processing" || flow?.status === "pending"
          ? flow.message || "Your order is confirmed and still being fulfilled. Track the authoritative status in Orders."
          : flow?.status === "refunded"
            ? flow.message || "The purchase did not settle and the wallet amount was restored."
            : flow?.message || "Nothing was marked delivered. You can safely retry with the same protected purchase request.";
  const debit = flow?.actualDebit ?? flow?.estimatedDebit ?? 0;
  const debitLabel = flow?.status === "error" ? "No confirmed debit" : flow?.status === "refunded" ? "Debit reversed" : isTerminal ? "Order debit" : "Expected debit";
  const balanceLabel = flow?.status === "error" ? "Wallet unchanged" : flow?.status === "refunded" ? "Wallet restored" : isTerminal && flow?.newBalance !== undefined ? "Wallet after" : "Expected after";
  const steps = [
    { label: "Wallet authorization", note: "Balance and order amount" },
    { label: "Secure debit", note: "Atomic wallet settlement" },
    { label: "Account acquisition", note: "Protected fulfillment" },
    { label: "Dashboard delivery", note: "Masked until you reveal" },
  ];

  useEffect(() => {
    if (!flow) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [flow, isPending, onClose]);

  return (
    <AnimatePresence>
      {flow && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#050816]/70 p-3 backdrop-blur-md sm:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={() => { if (!isPending) onClose(); }}
        >
          <motion.section
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-flow-title"
            aria-describedby="purchase-flow-description"
            className="relative max-h-[calc(100vh-1.5rem)] w-full max-w-3xl overflow-y-auto rounded-[1.75rem] border border-white/15 bg-white shadow-[0_30px_100px_rgba(5,8,22,.45)]"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="relative overflow-hidden bg-[linear-gradient(135deg,#07143b_0%,#075dff_55%,#6d35ff_100%)] px-5 pb-6 pt-5 text-white sm:px-7 sm:pb-7">
              <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full border border-white/15 bg-white/10" />
              <div className="pointer-events-none absolute right-8 top-9 h-24 w-24 rounded-full border border-white/10" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <motion.div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/12 shadow-[0_12px_32px_rgba(0,0,0,.18)] ${isPending ? "animate-pulse" : ""}`}
                    animate={isPending ? { rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] } : { rotate: 0, scale: 1 }}
                    transition={{ duration: 2.2, repeat: isPending ? Infinity : 0 }}
                  >
                    {flow.status === "delivered" ? <PackageCheck className="h-7 w-7" /> : flow.status === "refunded" || flow.status === "error" ? <RotateCcw className="h-7 w-7" /> : <LockKeyhole className="h-7 w-7" />}
                  </motion.div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#dbe6ff]">Secure checkout</p>
                    <h2 id="purchase-flow-title" className="mt-1 text-xl font-black leading-tight sm:text-2xl" style={{ fontFamily: "Space Grotesk" }}>{title}</h2>
                    <p id="purchase-flow-description" className="mt-2 max-w-xl text-xs font-semibold leading-5 text-white/75 sm:text-sm">{subtitle}</p>
                  </div>
                </div>
                <button type="button" onClick={onClose} disabled={isPending} aria-label={isPending ? "Purchase is still processing" : "Close purchase status"} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-35"><X className="h-4 w-4" /></button>
              </div>
              <div className="relative mt-6 h-1.5 overflow-hidden rounded-full bg-white/15" aria-label={`Purchase progress ${progress}%`}>
                <motion.div className="h-full rounded-full bg-[#ffe21f]" initial={{ width: "8%" }} animate={{ width: `${progress}%` }} transition={{ duration: 0.7, ease: "easeOut" }} />
              </div>
            </div>

            <div className="p-5 sm:p-7">
              <div className="flex flex-col gap-2 rounded-2xl border border-[#dfe6ff] bg-[#f8faff] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#0a1128]">{flow.productName}</p>
                  <p className="mt-1 text-xs font-semibold text-[#7c8498]">Quantity {flow.quantity}{flow.orderReference ? ` · ${flow.orderReference}` : ""}</p>
                </div>
                <span className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#155cff] ring-1 ring-[#dfe6ff]">{flow.channel === "marketplace" ? "Instant marketplace" : "Sasify delivery"}</span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3" aria-label="Wallet settlement">
                <div className="rounded-2xl border border-[#dfe6ff] bg-white p-4"><div className="flex items-center gap-2 text-[#7c8498]"><Wallet className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-wide">Wallet before</span></div><p className="mt-3 text-lg font-black tabular-nums text-[#0a1128]">{formatAmount(flow.beforeBalance)}</p></div>
                <div className="rounded-2xl border border-[#ffe0e8] bg-[#fff7f9] p-4"><div className="flex items-center gap-2 text-[#d11f4a]"><CircleDollarSign className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-wide">{debitLabel}</span></div><p className="mt-3 text-lg font-black tabular-nums text-[#d11f4a]">{flow.status === "error" ? "—" : flow.status === "refunded" ? `↺ ${formatAmount(debit)}` : `−${formatAmount(debit)}`}</p></div>
                <div className="rounded-2xl border border-[#ccefd7] bg-[#f3fff7] p-4"><div className="flex items-center gap-2 text-[#0b8f34]"><ShieldCheck className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-wide">{balanceLabel}</span></div><p className="mt-3 text-lg font-black tabular-nums text-[#0b8f34]">{formatAmount(flow.newBalance ?? Math.max(0, flow.beforeBalance - debit))}</p></div>
              </div>

              <ol className="mt-6 grid gap-3 sm:grid-cols-2" aria-live="polite">
                {steps.map((step, index) => {
                  const state = stageState(flow.status, index);
                  return <li key={step.label} className={`flex items-center gap-3 rounded-2xl border p-4 transition-colors ${state === "complete" ? "border-[#ccefd7] bg-[#f3fff7]" : state === "active" ? "border-[#bfd0ff] bg-[#eef3ff]" : state === "error" ? "border-[#ffd6df] bg-[#fff5f7]" : "border-[#e6eaf6] bg-white"}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${state === "complete" ? "bg-[#0b8f34] text-white" : state === "active" ? "bg-[#155cff] text-white" : state === "error" ? "bg-[#d11f4a] text-white" : "bg-[#f0f2f8] text-[#9aa0b4]"}`}>
                      {state === "complete" ? <Check className="h-4 w-4" /> : state === "active" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />}
                    </span>
                    <div><p className="text-xs font-black text-[#0a1128]">{step.label}</p><p className="mt-1 text-[11px] font-semibold text-[#7c8498]">{step.note}</p></div>
                  </li>;
                })}
              </ol>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-[11px] font-semibold text-[#7c8498]"><ShieldCheck className="h-4 w-4 text-[#155cff]" /> Idempotent payment protection is active.</p>
                {flow.status === "delivered" ? <button type="button" onClick={onReady} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#075dff,#6d35ff)] px-5 text-sm font-black text-white shadow-[0_12px_30px_rgba(21,92,255,.24)]"><PackageCheck className="h-4 w-4" /> Ready account</button>
                  : flow.status === "processing" || flow.status === "pending" ? <button type="button" onClick={onTrack} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0a1128] px-5 text-sm font-black text-white"><Clock3 className="h-4 w-4" /> Track order</button>
                    : flow.status === "error" ? <button type="button" onClick={onRetry} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0a1128] px-5 text-sm font-black text-white"><RotateCcw className="h-4 w-4" /> Try again</button>
                      : flow.status === "refunded" ? <button type="button" onClick={onClose} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#dfe6ff] bg-white px-5 text-sm font-black text-[#0a1128]">Close</button>
                        : <span className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#eef3ff] px-5 text-sm font-black text-[#155cff]"><LoaderCircle className="h-4 w-4 animate-spin" /> Secure processing</span>}
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

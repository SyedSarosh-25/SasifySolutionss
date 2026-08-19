import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import { Zap, Loader2 } from "lucide-react";

export default function PlatformApiToggle() {
  const { data: enabled, isLoading } = trpc.admin.platformApiRealModeGet.useQuery();
  const utils = trpc.useUtils();
  const mutation = trpc.admin.platformApiRealModeSet.useMutation({
    onSuccess: () => {
      toast.success("Platform API mode updated");
      utils.admin.platformApiRealModeGet.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function toggle() {
    mutation.mutate({ enabled: !enabled });
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-[0_4px_24px_rgba(12,37,104,0.06)] ring-1 ring-black/[0.04]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-[15px] font-bold text-[#0a1128]">Platform API Mode</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-[#5c6478]">
            When ON, marketplace purchases hit real provider APIs. When OFF, all purchases run in smoke / manual mode.
          </p>
        </div>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-[#155cff]" />
        ) : (
          <button
            type="button"
            onClick={toggle}
            disabled={mutation.isPending}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white transition-all ${
              enabled
                ? "bg-[#0b8f34] shadow-[0_2px_12px_rgba(11,143,52,0.25)] hover:bg-[#0a7a2d]"
                : "bg-[#d11f4a] shadow-[0_2px_12px_rgba(209,31,74,0.25)] hover:bg-[#b91b3f]"
            }`}
          >
            <Zap className="h-4 w-4" />
            {mutation.isPending ? "Saving..." : enabled ? "Real API Mode ON" : "Smoke / Manual Mode"}
          </button>
        )}
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#f8faff] p-4 ring-1 ring-[#dfe6ff]">
        <div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${enabled ? "bg-[#0b8f34]" : "bg-[#d11f4a]"}`} />
        <p className="text-xs leading-5 text-[#5c6478]">
          {enabled
            ? "Live provider calls are active. Every enabled product with provider purchase enabled will be bought from the upstream provider."
            : "Smoke / manual mode is active. Purchases will create pending_fulfillment orders that admins must resolve manually."}
        </p>
      </div>
    </div>
  );
}

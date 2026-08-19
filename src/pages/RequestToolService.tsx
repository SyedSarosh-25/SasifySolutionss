import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link } from "react-router";
import { ArrowLeft, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/layout/Layout";
import { trpc } from "@/providers/trpc";
import { useCurrency } from "@/hooks/useCurrency";

const budgetOptions = [
  { value: "under-10", label: (format: (value: number) => string) => `Under ${format(10)}` },
  { value: "10-25", label: (format: (value: number) => string) => `${format(10)} - ${format(25)}` },
  { value: "25-50", label: (format: (value: number) => string) => `${format(25)} - ${format(50)}` },
  { value: "50-100", label: (format: (value: number) => string) => `${format(50)} - ${format(100)}` },
  { value: "100-plus", label: (format: (value: number) => string) => `${format(100)}+` },
];

function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

export default function RequestToolService() {
  const { format } = useCurrency();
  const [form, setForm] = useState({
    requesterName: "",
    requesterEmail: "",
    requestType: "tool" as "tool" | "service",
    itemName: "",
    desiredPlan: "",
    budget: "",
    notes: "",
  });
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | undefined>();
  const [screenshotName, setScreenshotName] = useState("");
  const createRequest = trpc.requests.create.useMutation({
    onSuccess: () => {
      toast.success("Request submitted. Sasify support will review it.");
      setForm({
        requesterName: "",
        requesterEmail: "",
        requestType: "tool",
        itemName: "",
        desiredPlan: "",
        budget: "",
        notes: "",
      });
      setScreenshotDataUrl(undefined);
      setScreenshotName("");
    },
    onError: (error) => toast.error(error.message),
  });

  async function handleScreenshot(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Upload PNG, JPG, or WebP screenshot");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Screenshot must be under 2MB");
      return;
    }
    setScreenshotDataUrl(await readImage(file));
    setScreenshotName(file.name);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.budget) {
      toast.error("Select your budget bracket");
      return;
    }
    const selectedBudget = budgetOptions.find((option) => option.value === form.budget);
    createRequest.mutate({
      ...form,
      budget: selectedBudget?.label(format) ?? form.budget,
      screenshotDataUrl,
      notes: form.notes || undefined,
    });
  }

  return (
    <Layout pageKey="request-tool">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <Link to="/" className="tap-target inline-flex items-center gap-2 text-sm font-black text-[#155cff]">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="mt-6 rounded-[1.5rem] bg-white p-5 shadow-[0_24px_70px_rgba(12,37,104,0.12)] ring-1 ring-[#dfe6ff] sm:rounded-[2rem] sm:p-8">
          <h1 className="text-balance text-3xl font-black text-[#050816] sm:text-4xl">Request a Tool/Service</h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-[#596176]">
            Tell us what you need. Share the tool/service name, screenshot, plan, and budget so the Sasify team can source it and list it if available.
          </p>

          <form onSubmit={submit} className="mt-8 grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-[#596176]">Your Name</span>
                <input
                  value={form.requesterName}
                  onChange={(e) => setForm({ ...form, requesterName: e.target.value })}
                  required
                  className="mt-2 w-full rounded-xl border border-[#dfe6ff] bg-white px-4 py-3 text-sm font-semibold text-[#050816] outline-none focus:border-[#155cff]"
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-[#596176]">Email</span>
                <input
                  type="email"
                  value={form.requesterEmail}
                  onChange={(e) => setForm({ ...form, requesterEmail: e.target.value })}
                  required
                  className="mt-2 w-full rounded-xl border border-[#dfe6ff] bg-white px-4 py-3 text-sm font-semibold text-[#050816] outline-none focus:border-[#155cff]"
                />
              </label>
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-wide text-[#596176]">What do you need?</span>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(["tool", "service"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm({ ...form, requestType: type })}
                  className={`tap-target rounded-xl border px-4 py-3 text-sm font-black capitalize ${
                      form.requestType === type
                        ? "border-[#155cff] bg-[#eef3ff] text-[#155cff]"
                        : "border-[#dfe6ff] bg-white text-[#596176]"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-[#596176]">Tool / Service Name</span>
              <input
                value={form.itemName}
                onChange={(e) => setForm({ ...form, itemName: e.target.value })}
                placeholder="Example: ChatGPT Team, CapCut Pro, LinkedIn Sales Navigator"
                required
                className="mt-2 w-full rounded-xl border border-[#dfe6ff] bg-white px-4 py-3 text-sm font-semibold text-[#050816] outline-none focus:border-[#155cff]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-[#596176]">Screenshot</span>
              <div className="mt-2 rounded-xl border border-dashed border-[#cfd9ff] bg-[#f7f9ff] p-4">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center">
                  <UploadCloud className="h-7 w-7 text-[#155cff]" />
                  <span className="text-sm font-black text-[#050816]">
                    {screenshotName || "Upload screenshot of the tool/service"}
                  </span>
                  <span className="text-xs font-medium text-[#7c8498]">PNG, JPG, or WebP under 2MB</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleScreenshot} className="hidden" />
                </label>
                {screenshotDataUrl && (
                  <img src={screenshotDataUrl} alt="Selected request screenshot" loading="lazy" decoding="async" className="mt-4 max-h-48 w-full rounded-xl object-contain ring-1 ring-[#dfe6ff]" />
                )}
              </div>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-[#596176]">Subscription Plan</span>
                <input
                  value={form.desiredPlan}
                  onChange={(e) => setForm({ ...form, desiredPlan: e.target.value })}
                  placeholder="Monthly, yearly, team, 3 months..."
                  required
                  className="mt-2 w-full rounded-xl border border-[#dfe6ff] bg-white px-4 py-3 text-sm font-semibold text-[#050816] outline-none focus:border-[#155cff]"
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-[#596176]">Budget</span>
                <select
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  required
                  className="mt-2 w-full rounded-xl border border-[#dfe6ff] bg-white px-4 py-3 text-sm font-semibold text-[#050816] outline-none focus:border-[#155cff]"
                >
                  <option value="">Select budget bracket</option>
                  {budgetOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label(format)}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-[#596176]">Extra Details</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={4}
                placeholder="Quantity, country/region, account type, deadline, or anything else..."
                className="mt-2 w-full rounded-xl border border-[#dfe6ff] bg-white px-4 py-3 text-sm font-semibold text-[#050816] outline-none focus:border-[#155cff]"
              />
            </label>

            <button
              type="submit"
              disabled={createRequest.isPending}
              className="tap-target rounded-full bg-[linear-gradient(135deg,#075dff,#6d35ff)] px-7 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(21,92,255,0.28)] disabled:opacity-60"
            >
              {createRequest.isPending ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}


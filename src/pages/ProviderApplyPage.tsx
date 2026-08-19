import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, CheckCircle, Store, Truck, Users } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";

export default function ProviderApplyPage() {
  const { isAuthenticated, user } = useAuth();
  const { data: application } = trpc.provider.myApplication.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const [form, setForm] = useState({
    fullName: user?.name ?? "",
    email: user?.email ?? "",
    whatsappNumber: "",
    serviceName: "",
    availableStock: "",
    wholesalePrice: "",
    deliveryMethod: "",
    notes: "",
  });
  const utils = trpc.useUtils();

  const apply = trpc.provider.submitApplication.useMutation({
    onSuccess: () => {
      toast.success("Provider application submitted!");
      utils.provider.myApplication.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Layout pageKey="provider-apply">
      <section className="relative overflow-hidden px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="rounded-3xl bg-[linear-gradient(135deg,#061652,#075dff_54%,#6d35ff)] p-6 text-white shadow-[0_24px_70px_rgba(21,92,255,0.28)] sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#ffe21f] ring-1 ring-white/20">
              <Store className="h-3.5 w-3.5" />
              Sell with Sasify
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl" style={{ fontFamily: "Space Grotesk" }}>
              Become a verified digital service provider.
            </h1>
            <p className="mt-4 text-sm font-medium leading-relaxed text-white/78 sm:text-base">
              Apply if you can supply genuine digital tools, subscriptions, activations, or delivery-ready inventory for SASIFY customers.
            </p>

            <div className="mt-8 grid gap-3">
              {[
                { icon: CheckCircle, title: "Admin reviewed", text: "Every provider is manually checked before approval." },
                { icon: Truck, title: "Clear delivery method", text: "Tell us exactly how you deliver stock or activations." },
                { icon: Users, title: "Customer focused", text: "We prioritize reliable support and repeatable service quality." },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/16">
                  <div className="flex items-start gap-3">
                    <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#ffe21f]" />
                    <div>
                      <h2 className="text-sm font-black">{item.title}</h2>
                      <p className="mt-1 text-xs font-medium leading-relaxed text-white/70">{item.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-[0_18px_54px_rgba(12,37,104,0.11)] ring-1 ring-[#dfe6ff] sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#155cff]">Provider application</p>
                <h2 className="mt-1 text-2xl font-black text-[#050816]" style={{ fontFamily: "Space Grotesk" }}>
                  Share your service details
                </h2>
              </div>
              <Link to="/tools" className="tap-target inline-flex items-center gap-2 rounded-full bg-[#eef3ff] px-4 py-2 text-xs font-black text-[#155cff]">
                View marketplace
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {!isAuthenticated ? (
              <div className="mt-6 rounded-2xl bg-[#f7f9ff] p-5 ring-1 ring-[#dfe6ff]">
                <p className="text-sm font-semibold leading-relaxed text-[#39415d]">
                  Please create an account or sign in before applying. This lets us track your application and contact you from the admin panel.
                </p>
                <Link
                  to="/login"
                  className="tap-target mt-4 inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#075dff,#6d35ff)] px-6 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(21,92,255,0.28)]"
                >
                  Sign in to apply
                </Link>
              </div>
            ) : application ? (
              <div className="mt-6 rounded-2xl bg-[#f7f9ff] p-5 ring-1 ring-[#dfe6ff]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-[#596176]">Application status</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${
                    application.status === "approved" ? "bg-[#eafff0] text-[#0b8f34]" :
                    application.status === "rejected" ? "bg-[#fff0f4] text-[#d11f4a]" :
                    "bg-[#fff7df] text-[#9b6200]"
                  }`}>
                    {application.status}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-[#596176]">Service: {application.serviceName}</p>
              </div>
            ) : (
              <>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[
                    { key: "fullName", label: "Full Name", type: "text" },
                    { key: "email", label: "Email", type: "email" },
                    { key: "whatsappNumber", label: "WhatsApp Number", type: "text" },
                    { key: "serviceName", label: "Service/Tool Name", type: "text" },
                    { key: "availableStock", label: "Available Stock", type: "number" },
                    { key: "wholesalePrice", label: "Wholesale Price Range", type: "text" },
                  ].map((field) => (
                    <label key={field.key} className="block">
                      <span className="text-sm font-semibold text-[#596176]">{field.label}</span>
                      <input
                        type={field.type}
                        value={(form as any)[field.key]}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                        className="mt-1 h-11 w-full rounded-xl border border-[#dfe6ff] bg-white px-4 text-sm font-semibold text-[#050816] outline-none focus:border-[#155cff] focus:ring-4 focus:ring-[#155cff]/12"
                      />
                    </label>
                  ))}
                  <label className="block sm:col-span-2">
                    <span className="text-sm font-semibold text-[#596176]">Delivery Method</span>
                    <textarea
                      value={form.deliveryMethod}
                      onChange={(e) => setForm({ ...form, deliveryMethod: e.target.value })}
                      rows={4}
                      className="mt-1 w-full rounded-xl border border-[#dfe6ff] bg-white px-4 py-3 text-sm font-semibold text-[#050816] outline-none focus:border-[#155cff] focus:ring-4 focus:ring-[#155cff]/12"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-sm font-semibold text-[#596176]">Notes (optional)</span>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      rows={3}
                      className="mt-1 w-full rounded-xl border border-[#dfe6ff] bg-white px-4 py-3 text-sm font-semibold text-[#050816] outline-none focus:border-[#155cff] focus:ring-4 focus:ring-[#155cff]/12"
                    />
                  </label>
                </div>
                <button
                  onClick={() => {
                    if (!form.fullName || !form.email || !form.whatsappNumber || !form.serviceName || !form.availableStock || !form.wholesalePrice || !form.deliveryMethod) {
                      toast.error("Please fill all required fields");
                      return;
                    }
                    apply.mutate({ ...form, availableStock: parseInt(form.availableStock) });
                  }}
                  disabled={apply.isPending}
                  className="tap-target mt-5 inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#075dff,#6d35ff)] px-6 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(21,92,255,0.28)] disabled:opacity-50"
                >
                  {apply.isPending ? "Submitting..." : "Submit Application"}
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}


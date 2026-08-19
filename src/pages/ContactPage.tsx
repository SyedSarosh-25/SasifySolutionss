import { Link } from "react-router";
import { Mail, MapPin, MessageSquare } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { trpc } from "@/providers/trpc";

export default function ContactPage() {
  const { data: settings } = trpc.public.publicSettings.useQuery();
  const supportEmail = settings?.support_email || "support@sasify.solutions";

  return (
    <Layout pageKey="contact">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h1 className="text-center text-3xl font-black text-[#050816] sm:text-4xl" style={{ fontFamily: 'Space Grotesk' }}>
          Contact Us
        </h1>
        <p className="mt-4 text-center text-base font-medium leading-relaxed text-[#596176] sm:text-lg">
          Use support tickets for customer help, inquiries, or provider applications. WhatsApp access is shown only after purchase.
        </p>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-[0_16px_42px_rgba(12,37,104,0.1)] ring-1 ring-[#dfe6ff]">
            <h2 className="text-lg font-black text-[#050816]" style={{ fontFamily: 'Space Grotesk' }}>
              Need help?
            </h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-[#596176]">
              Customer questions are handled through support tickets so every conversation is attached to your account and order history.
            </p>
            <div className="mt-6 grid gap-3">
              <Link to="/dashboard/support" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#075dff,#6d35ff)] py-3 text-center text-sm font-black text-white shadow-[0_12px_28px_rgba(21,92,255,0.28)]">
                <MessageSquare className="h-4 w-4" />
                Open Support Ticket
              </Link>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <Link to="/dashboard/support" className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#dfe6ff] transition-colors hover:bg-[#f7f9ff]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eef3ff]">
                <MessageSquare className="h-6 w-6 text-[#155cff]" />
              </div>
              <div>
                <p className="font-black text-[#050816]">Support Tickets</p>
                <p className="text-sm font-medium text-[#596176]">Private help desk for all pre-purchase questions</p>
              </div>
            </Link>

            <div className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#dfe6ff]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eef3ff]">
                <Mail className="h-6 w-6 text-[#155cff]" />
              </div>
              <div>
                <p className="font-black text-[#050816]">Email</p>
                <p className="text-sm font-medium text-[#596176]">{supportEmail}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#dfe6ff]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eef3ff]">
                <MapPin className="h-6 w-6 text-[#155cff]" />
              </div>
              <div>
                <p className="font-black text-[#050816]">Location</p>
                <p className="text-sm font-medium text-[#596176]">Pakistan / Islamabad / Rawalpindi & Worldwide Online</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}


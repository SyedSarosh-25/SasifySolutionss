import { Link } from "react-router";
import { ArrowRight, PackageCheck, Store, Truck } from "lucide-react";
import type { BuilderSection } from "@/site-builder/schema";

const providerCards = [
  { icon: PackageCheck, title: "Share stock details", text: "Tell us what you can supply and your wholesale range." },
  { icon: Truck, title: "Explain delivery", text: "Describe how customers receive credentials or activations." },
  { icon: Store, title: "Admin approval", text: "Sasify reviews every provider before anything goes live." },
];

export default function ProviderCtaSection({ content }: { content?: BuilderSection["content"] }) {
  const displayCards = content?.items.length ? content.items.map((row, index) => ({ ...providerCards[index % providerCards.length], title: row.title, text: row.text })) : providerCards;
  return (
    <section className="relative px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#061652,#075dff_52%,#6d35ff)] p-6 text-white shadow-[0_24px_70px_rgba(21,92,255,0.28)] sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#ffe21f] ring-1 ring-white/20">
              <Store className="h-3.5 w-3.5" />
              {content?.eyebrow || "For suppliers"}
            </div>
            <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl" style={{ fontFamily: "Space Grotesk" }}>
              {content?.title || "Want to sell digital tools through Sasify?"}
            </h2>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-white/78 sm:text-base">
              {content?.body || "If you can provide reliable subscriptions, activations, or digital stock, apply from the public provider form. Customers keep a clean buying dashboard while providers have a separate approval flow."}
            </p>
            <Link
              to={content?.primaryHref || "/become-provider"}
              className="tap-target mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-[#155cff] shadow-[0_14px_34px_rgba(0,0,0,0.16)]"
            >
              {content?.primaryLabel || "Apply as Provider"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {displayCards.map((item) => (
              <div key={item.title} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/16">
                <div className="flex items-start gap-3">
                  <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#ffe21f]" />
                  <div>
                    <h3 className="text-sm font-black">{item.title}</h3>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-white/70">{item.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

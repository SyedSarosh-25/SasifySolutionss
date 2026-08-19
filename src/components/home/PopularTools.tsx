import { motion } from "framer-motion";
import { Link } from "react-router";
import { ArrowRight, PackageCheck, Zap } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useCurrency } from "@/hooks/useCurrency";
import type { BuilderSection } from "@/site-builder/schema";

export default function PopularTools({ content }: { content?: BuilderSection["content"] }) {
  const { format } = useCurrency();
  const { data: products, isLoading, error } = trpc.public.thirdPartyProductList.useQuery(undefined, {
    staleTime: 30_000,
  });
  const popularProducts = (products ?? []).slice(0, 6);

  return (
    <section className="relative py-14 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-black leading-tight tracking-[-0.025em] text-[#050816] sm:text-4xl" style={{ fontFamily: "Space Grotesk" }}>
              {content?.title || "Popular digital tools"}
            </h2>
            <p className="mt-3 max-w-2xl text-base font-medium text-[#596176] sm:text-lg">
              {content?.body || "Browse active products selected for fast, supported delivery."}
            </p>
          </div>
          <Link to={content?.primaryHref || "/tools"} className="tap-target inline-flex w-fit items-center gap-2 rounded-xl border border-[#dfe6ff] bg-white px-4 py-2.5 text-sm font-black text-[#155cff] transition-colors hover:border-[#155cff]/30 hover:bg-[#eef3ff]">
            {content?.primaryLabel || "View all tools"} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading popular tools">
            {[...Array(6)].map((_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-white ring-1 ring-[#dfe6ff]" />)}
          </div>
        ) : error ? (
          <div className="mt-10 rounded-2xl border border-[#ffd8e2] bg-white px-6 py-10 text-center">
            <p className="font-bold text-[#d11f4a]">Popular tools could not be loaded.</p>
            <p className="mt-1 text-sm text-[#596176]">Open the full catalog or try again shortly.</p>
          </div>
        ) : popularProducts.length === 0 ? (
          <div className="mt-10 flex flex-col items-center rounded-2xl border border-[#dfe6ff] bg-white px-6 py-12 text-center">
            <PackageCheck className="h-8 w-8 text-[#155cff]" />
            <h3 className="mt-4 text-lg font-black text-[#050816]">New tools are being prepared</h3>
            <p className="mt-2 max-w-md text-sm font-medium text-[#596176]">Active products will appear here as soon as they are ready to order.</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {popularProducts.map((product: any) => (
              <motion.article key={product.id} whileHover={{ y: -4 }} transition={{ duration: 0.18 }} className="flex flex-col rounded-2xl bg-white p-6 ring-1 ring-[#dfe6ff] shadow-[0_8px_24px_rgba(12,37,104,0.06)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-[#eef3ff] px-2.5 py-1 text-xs font-black text-[#155cff]">{product.categoryName}</span>
                  {product.instant && <span className="inline-flex items-center gap-1 rounded-full bg-[#ebfff5] px-2.5 py-1 text-xs font-black text-[#008a4c]"><Zap className="h-3 w-3" /> Instant</span>}
                </div>
                <h3 className="mt-4 text-lg font-black text-[#050816]" style={{ fontFamily: "Space Grotesk" }}>{product.name}</h3>
                <p className="mt-2 line-clamp-2 text-sm font-medium leading-relaxed text-[#596176]">{product.description || "A supported digital product available through Sasify."}</p>
                <div className="mt-auto flex items-end justify-between gap-3 pt-6">
                  <div>
                    <p className="text-xs font-bold text-[#7c8498]">Sasify price</p>
                    <p className="mt-1 text-xl font-black text-[#155cff]" style={{ fontFamily: "Space Grotesk" }}>{format(product.priceUsd)}</p>
                  </div>
                  <span className="rounded-full bg-[#f6f8ff] px-3 py-1.5 text-xs font-bold text-[#596176]">{product.unlimited ? "In stock" : `${product.stock} available`}</span>
                </div>
                <Link to={`/tools/third-party/${product.id}`} className="tap-target mt-5 flex items-center justify-center gap-2 rounded-xl bg-[#155cff] px-4 py-3 text-sm font-black text-white transition-colors hover:bg-[#0d4fd9]">
                  View details <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { CreditCard, Search, Tag, Shield } from "lucide-react";
import type { BuilderSection } from "@/site-builder/schema";

const features = [
  {
    number: "01",
    icon: Search,
    title: "Smart tool search",
    description: "Find Cursor, Grok, GPT, Claude, Gemini, cloud services, and more instantly.",
  },
  {
    number: "02",
    icon: CreditCard,
    title: "Flexible checkout",
    description: "Buy with guest direct payment or use your SASIFY wallet for discounted checkout.",
  },
  {
    number: "03",
    icon: Tag,
    title: "Sasify pricing",
    description: "Clear local offers, plan durations, and activation details before you order.",
  },
  {
    number: "04",
    icon: Shield,
    title: "Secure delivery",
    description: "Credentials, license keys, activation links, or instructions are delivered only after successful payment.",
  },
];

export default function FeatureCards({ content }: { content?: BuilderSection["content"] }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const displayFeatures = content?.items.length ? content.items.map((row, index) => ({ ...features[index % features.length], number: String(index + 1).padStart(2, "0"), title: row.title, description: row.text })) : features;

  return (
    <section className="relative py-14 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-[#dfe6ff] bg-white px-4 py-1.5 text-xs font-black tracking-wide text-[#155cff] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#155cff]" />
            {content?.eyebrow || "Learn more about SASIFY"}
          </span>
          <h2
            className="mt-6 text-[clamp(1.75rem,4vw,3rem)] font-black leading-tight tracking-normal text-[#050816]"
            style={{ fontFamily: 'Space Grotesk' }}
          >
            {content?.title || "Built for fast, secure digital access"}
          </h2>
          <p className="mt-4 max-w-lg text-base font-medium leading-relaxed text-[#596176] sm:text-lg">
            {content?.body || "Search, pay directly or through wallet, and receive your digital product through a clean marketplace."}
          </p>
        </motion.div>

        <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4">
          {displayFeatures.map((feature, index) => (
            <motion.div
              key={feature.number}
              initial={{ opacity: 0, y: 36 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.12 * index, ease: [0.16, 1, 0.3, 1] }}
              className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-[0_16px_42px_rgba(12,37,104,0.1)] ring-1 ring-[#dfe6ff] transition-transform hover:-translate-y-1 sm:p-6 lg:p-8"
            >
              <span className="absolute -bottom-2 right-4 text-7xl font-black text-[#eef3ff]">
                {feature.number}
              </span>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#075dff,#6d35ff)] shadow-[0_12px_26px_rgba(21,92,255,0.25)]">
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="mt-5 text-xl font-black text-[#050816]" style={{ fontFamily: 'Space Grotesk' }}>
                {feature.title}
              </h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-[#596176]">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

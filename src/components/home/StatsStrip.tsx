import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import type { BuilderSection } from "@/site-builder/schema";

const stats = [
  { label: "MARKETPLACE", value: "Premium AI Tools" },
  { label: "SASIFY OFFER", value: "Best Local Prices" },
  { label: "DELIVERY", value: "Instant Activation", highlight: true },
  { label: "SUPPORT", value: "Private Tickets" },
];

export default function StatsStrip({ content }: { content?: BuilderSection["content"] }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const displayStats = content?.items.length ? content.items.map((row, index) => ({ label: row.title, value: row.text || row.value, highlight: index === 2 })) : stats;

  return (
    <section ref={ref} className="relative z-10 border-y border-[#dfe6ff] bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center divide-x divide-[#dfe6ff] sm:flex-nowrap sm:justify-start">
        {displayStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex w-1/2 flex-col items-center px-4 py-5 sm:w-auto sm:flex-1 sm:px-8"
          >
            <span className="text-[0.6875rem] font-black uppercase tracking-[0.08em] text-[#7c8498]">
              {stat.label}
            </span>
            <span className={`mt-1 text-sm font-black ${stat.highlight ? "text-[#10b83f]" : "text-[#050816]"}`}>
              {stat.value}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

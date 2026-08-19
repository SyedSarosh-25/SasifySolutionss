import { motion, useInView, useReducedMotion } from "framer-motion";
import { useId, useRef } from "react";
import { CreditCard, Package, Search, UserPlus, Wallet } from "lucide-react";
import type { BuilderSection } from "@/site-builder/schema";

const steps = [
  { icon: Search, title: "Search and select your digital tool", description: "Browse our catalog or use the AI search to find exactly what you need." },
  { icon: CreditCard, title: "Pay directly as a guest", description: "First-time visitors can pay to our NayaPay, EasyPaisa, JazzCash, USDT, or Binance Pay accounts and submit proof without creating an account." },
  { icon: UserPlus, title: "Create an account when you want", description: "Accounts are optional for direct checkout, but useful for dashboard orders, wallet balance, and support tickets." },
  { icon: Wallet, title: "Use the SASIFY wallet for savings", description: "Deposit funds once and use wallet checkout when you want the automatic 5% website discount." },
  { icon: Package, title: "Receive delivery and support", description: "Get your credentials, license keys, or activation links delivered securely. 24/7 support available." },
];

const desktopPath = "M 50 0 C 88 70 12 130 50 200 S 88 330 50 400 S 12 530 50 600 S 88 730 50 800 S 12 930 50 1000";
const mobilePath = "M 24 0 C 46 70 2 130 24 200 S 46 330 24 400 S 2 530 24 600 S 46 730 24 800 S 2 930 24 1000";

function SnakeRail({ path, viewBox, id, reducedMotion, className }: { path: string; viewBox: string; id: string; reducedMotion: boolean; className: string }) {
  return (
    <div className={`pointer-events-none absolute bottom-0 top-0 ${className}`} aria-hidden="true">
      <svg className="h-full w-full overflow-visible" viewBox={viewBox} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`${id}-gradient`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--site-accent)" }} />
            <stop offset="52%" style={{ stopColor: "var(--site-accent-2)" }} />
            <stop offset="100%" stopColor="#10b83f" />
          </linearGradient>
          <filter id={`${id}-glow`} x="-80%" y="-20%" width="260%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <path d={path} fill="none" stroke="var(--site-edge)" strokeWidth="2" vectorEffect="non-scaling-stroke" opacity="0.5" />
        <motion.path
          d={path}
          fill="none"
          stroke={`url(#${id}-gradient)`}
          strokeWidth="4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: reducedMotion ? 0 : 2.1, ease: [0.16, 1, 0.3, 1] }}
          filter={`url(#${id}-glow)`}
        />
        <motion.path
          d={path}
          fill="none"
          stroke="rgba(255,255,255,.9)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="3 18"
          vectorEffect="non-scaling-stroke"
          animate={reducedMotion ? undefined : { strokeDashoffset: [0, -84] }}
          transition={reducedMotion ? undefined : { duration: 2.8, ease: "linear", repeat: Infinity }}
          opacity="0.86"
        />
        {!reducedMotion && (
          <circle r="6" fill="var(--site-accent)" stroke="white" strokeWidth="2" vectorEffect="non-scaling-stroke" filter={`url(#${id}-glow)`}>
            <animateMotion dur="7s" repeatCount="indefinite" path={path} />
          </circle>
        )}
      </svg>
    </div>
  );
}

export default function HowItWorks({ content }: { content?: BuilderSection["content"] }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const reducedMotion = Boolean(useReducedMotion());
  const railId = useId().replace(/:/g, "");
  const displaySteps = content?.items.length ? content.items.map((row, index) => ({ ...steps[index % steps.length], title: row.title, description: row.text })) : steps;

  return (
    <section className="relative overflow-hidden py-14 sm:py-20 lg:py-28">
      <div className="pointer-events-none absolute inset-x-0 top-1/3 h-64 bg-[radial-gradient(circle,rgba(21,92,255,.08),transparent_68%)]" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6" ref={ref}>
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center text-[clamp(1.75rem,4vw,3rem)] font-black leading-tight tracking-normal text-[#050816]"
          style={{ fontFamily: "Space Grotesk" }}
        >
          {content?.title || "How SASIFY works"}
        </motion.h2>

        <div className="relative mt-10 sm:mt-16">
          <SnakeRail path={mobilePath} viewBox="0 0 48 1000" id={`${railId}-mobile`} reducedMotion={reducedMotion} className="left-0 w-12 lg:hidden" />
          <SnakeRail path={desktopPath} viewBox="0 0 100 1000" id={`${railId}-desktop`} reducedMotion={reducedMotion} className="left-1/2 hidden w-36 -translate-x-1/2 lg:block" />

          {displaySteps.map((step, index) => (
            <motion.div
              key={`${step.title}-${index}`}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.15 * index, ease: [0.16, 1, 0.3, 1] }}
              className={`relative mb-8 flex items-start gap-5 last:mb-0 sm:mb-12 sm:gap-8 ${index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"}`}
            >
              <motion.div
                className="absolute left-6 z-10 h-4 w-4 -translate-x-1/2 rounded-full border-[3px] border-white bg-[var(--site-accent)] shadow-[0_0_0_6px_rgba(21,92,255,0.15)] lg:left-1/2"
                style={{ top: 22 }}
                animate={reducedMotion ? undefined : { scale: [1, 1.18, 1], boxShadow: ["0 0 0 6px rgba(21,92,255,.12)", "0 0 0 11px rgba(21,92,255,0)", "0 0 0 6px rgba(21,92,255,.12)"] }}
                transition={reducedMotion ? undefined : { duration: 2.4, delay: index * 0.24, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className="hidden w-1/2 lg:block" />

              <motion.div
                whileHover={reducedMotion ? undefined : { y: -4, scale: 1.01 }}
                transition={{ duration: 0.2 }}
                className="ml-10 min-w-0 flex-1 rounded-2xl bg-white p-5 shadow-[0_16px_42px_rgba(12,37,104,0.1)] ring-1 ring-[#dfe6ff] sm:p-6 lg:ml-0 lg:max-w-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#075dff,#6d35ff)]">
                    <step.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-black text-[#155cff]">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-4 text-lg font-black text-[#050816]" style={{ fontFamily: "Space Grotesk" }}>{step.title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-[#596176]">{step.description}</p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

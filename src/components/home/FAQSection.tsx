import { useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { BuilderSection } from "@/site-builder/schema";

const faqs = [
  {
    question: "Is SASIFY Solutions an official reseller of these brands?",
    answer: "No. SASIFY Solutions is an independent digital services marketplace. Brand names are used only to identify services requested by customers unless official partnership proof is added by admin.",
  },
  {
    question: "How do I buy a product?",
    answer: "Open any product page, choose a plan, then either submit a guest direct payment order or log in and pay through your SASIFY wallet. Customer help is handled through support tickets; WhatsApp access appears only after purchase.",
  },
  {
    question: "Why should I use the SASIFY wallet?",
    answer: "The wallet is optional, but website wallet purchases automatically receive a 5% discount.",
  },
  {
    question: "Can I buy without creating an account?",
    answer: "Yes. Guest direct checkout lets you pay to our listed account, upload payment proof, and submit your order for admin verification.",
  },
  {
    question: "How are payments verified?",
    answer: "Wallet deposits and guest direct payments are verified from the submitted transaction reference and payment screenshot. NayaPay wallet deposits may be credited automatically when the receipt email matches.",
  },
  {
    question: "When do I receive my product?",
    answer: "Delivery time depends on the product and plan. Each product page displays its delivery estimate.",
  },
];

export default function FAQSection({ content }: { content?: BuilderSection["content"] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const displayFaqs = content?.items.length ? content.items.map((row) => ({ question: row.title, answer: row.text })) : faqs;

  return (
    <section className="relative py-14 sm:py-20 lg:py-28" ref={ref}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 text-center text-[clamp(1.75rem,4vw,3rem)] font-black leading-tight tracking-normal text-[#050816] sm:mb-12"
          style={{ fontFamily: 'Space Grotesk' }}
        >
          {content?.title || "Frequently Asked Questions"}
        </motion.h2>

        <div className="flex flex-col gap-2">
          {displayFaqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 * index }}
              className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#dfe6ff] transition-transform hover:-translate-y-0.5"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="tap-target flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-[#f7f9ff] sm:px-6 sm:py-5"
              >
                <span className="text-sm font-black text-[#050816]">{faq.question}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-[#155cff] transition-transform duration-250 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="px-6 pb-5">
                      <p className="text-sm font-medium leading-relaxed text-[#596176]">{faq.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

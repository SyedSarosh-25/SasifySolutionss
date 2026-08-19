import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Layout from "@/components/layout/Layout";

const faqs = [
  {
    question: "Is SASIFY Solutions an official reseller of these brands?",
    answer: "No. SASIFY Solutions is an independent digital services marketplace. Brand names are used only to identify services requested by customers unless official partnership proof is added by admin.",
  },
  {
    question: "How do I buy a product?",
    answer: "Choose a product and plan, then either submit a guest direct payment order or log in and pay through your SASIFY wallet. Use support tickets for help; WhatsApp access is shown only after purchase.",
  },
  {
    question: "Why should I use the SASIFY wallet?",
    answer: "The wallet is optional, but wallet purchases automatically receive a 5% discount on every website purchase.",
  },
  {
    question: "Can I buy without creating an account?",
    answer: "Yes. Guest direct checkout lets you pay to our listed account, upload payment proof, and submit your order for admin verification.",
  },
  {
    question: "How are USDT deposits verified?",
    answer: "The system checks the TXID, network, token, receiver wallet, amount, confirmation status, and duplicate usage.",
  },
  {
    question: "When do I receive my product?",
    answer: "Delivery time depends on the product and plan. Each product page displays its delivery estimate.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept USDT TRC20, USDT BEP20, EasyPaisa, NayaPay, JazzCash, and Binance Pay for guest direct payments and wallet deposits.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes. We use encryption for sensitive data, secure authentication, and never share your information with third parties.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <Layout pageKey="faq">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-center text-3xl font-black text-[#050816] sm:text-4xl" style={{ fontFamily: 'Space Grotesk' }}>
          Frequently Asked Questions
        </h1>
        <p className="mt-4 text-center text-base font-medium text-[#52607a] sm:text-lg">
          Find answers to common questions about SASIFY Solutions
        </p>

        <div className="mt-12 flex flex-col gap-2">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl bg-white shadow-[0_14px_38px_rgba(12,37,104,0.08)] ring-1 ring-[#dfe6ff]"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-[#f5f7ff]"
              >
                <span className="text-sm font-bold text-[#050816]">{faq.question}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-[#075dff] transition-transform ${
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
                      <p className="text-sm leading-relaxed text-[#52607a]">{faq.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}


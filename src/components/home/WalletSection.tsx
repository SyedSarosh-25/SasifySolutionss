import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router";
import { Tag } from "lucide-react";
import type { BuilderSection } from "@/site-builder/schema";

type PaymentMethod = {
  name: string;
  description: string;
  logo: string;
  logoClassName: string;
  networkLogo?: string;
};

const methods: PaymentMethod[] = [
  {
    name: "USDT TRC20",
    description: "Blockchain-verified deposits using transaction hash verification.",
    logo: "/payment-logos/usdt-trc20.svg",
    logoClassName: "h-10 w-10",
  },
  {
    name: "USDT BEP20",
    description: "BSC network deposits submitted with transaction hash and screenshot.",
    logo: "/payment-logos/usdt.svg",
    logoClassName: "h-10 w-10",
    networkLogo: "/payment-logos/bnb-chain.svg",
  },
  {
    name: "EasyPaisa",
    description: "Manual deposit approval after TRX ID and screenshot upload.",
    logo: "/payment-logos/easypaisa.png",
    logoClassName: "h-auto w-[4.25rem]",
  },
  {
    name: "NayaPay",
    description: "Automatic wallet credit after matching TRX ID from NayaPay email.",
    logo: "/payment-logos/nayapay.svg",
    logoClassName: "h-auto w-[4.25rem]",
  },
  {
    name: "JazzCash",
    description: "Manual deposit approval after screenshot upload.",
    logo: "/payment-logos/jazzcash.svg",
    logoClassName: "h-11 w-11",
  },
  {
    name: "Binance Pay",
    description: "Manual deposit approval after TRX ID and screenshot upload.",
    logo: "/payment-logos/binance.svg",
    logoClassName: "h-10 w-10",
  },
];

export default function WalletSection({ content }: { content?: BuilderSection["content"] }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const displayMethods = content?.items.length
    ? content.items.map((row, index) => ({
        ...methods[index % methods.length],
        name: row.title,
        description: row.text,
      }))
    : methods;

  return (
    <section className="relative py-14 sm:py-20 lg:py-28" ref={ref}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2
              className="text-[clamp(1.75rem,4vw,3rem)] font-black leading-tight tracking-normal text-[#050816]"
              style={{ fontFamily: "Space Grotesk" }}
            >
              {content?.title || "Wallet savings when customers want them"}
            </h2>
            <p className="mt-4 text-base font-medium leading-relaxed text-[#596176] sm:text-lg">
              {content?.body ||
                "Customers can buy directly from each product page without an account. The SASIFY wallet remains available for repeat buyers who want to deposit once and receive an automatic 5% website discount."}
            </p>
            <div className="mt-8 rounded-r-2xl border-l-[4px] border-[#155cff] bg-white py-4 pl-5 pr-4 shadow-sm ring-1 ring-[#dfe6ff]">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-[#155cff]" />
                <span className="text-sm font-black text-[#155cff]">
                  {content?.eyebrow || "Wallet purchases receive 5% discount on every website purchase."}
                </span>
              </div>
            </div>
            <Link
              to={content?.primaryHref || "/dashboard/wallet"}
              className="tap-target mt-6 inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#075dff,#6d35ff)] px-6 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(21,92,255,0.28)]"
            >
              {content?.primaryLabel || "Open Wallet"}
            </Link>
          </motion.div>

          <div className="flex flex-col gap-3">
            {displayMethods.map((method, index) => (
              <motion.div
                key={method.name}
                initial={{ opacity: 0, x: 30 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.12 * index, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-[0_16px_42px_rgba(12,37,104,0.1)] ring-1 ring-[#dfe6ff] sm:p-5"
              >
                <div className="relative flex h-14 w-[4.75rem] shrink-0 items-center justify-center overflow-visible rounded-2xl bg-white px-1.5 shadow-[0_8px_24px_rgba(10,24,66,0.10)] ring-1 ring-[#dfe6ff]">
                  <img
                    src={method.logo}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    decoding="async"
                    className={`max-h-11 max-w-[4.25rem] object-contain ${method.logoClassName}`}
                  />
                  {method.networkLogo && (
                    <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#111827] shadow-md ring-2 ring-white">
                      <img
                        src={method.networkLogo}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        className="h-4.5 w-4.5 object-contain"
                      />
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-[#050816]" style={{ fontFamily: "Space Grotesk" }}>
                    {method.name}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-[#596176]">{method.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

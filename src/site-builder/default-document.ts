import type { BuilderSection, PublicPageKey, SiteBuilderDocument } from "./schema";

export const PUBLIC_PAGE_LABELS: Record<PublicPageKey, string> = {
  home: "Homepage",
  tools: "Tools Catalogue",
  "product-detail": "Product Detail",
  scammers: "Scammer Directory",
  faq: "FAQ",
  reviews: "Reviews",
  contact: "Contact",
  "request-tool": "Request a Tool",
  "provider-apply": "Provider Application",
  legal: "Legal Pages",
};

type BuilderContent = BuilderSection["content"];
const emptyContent = (): BuilderContent => ({ eyebrow: "", title: "", body: "", primaryLabel: "", primaryHref: "", secondaryLabel: "", secondaryHref: "", imageUrl: "", items: [] });
const style = () => ({ surface: "default" as const, width: "wide" as const, spacing: "normal" as const, align: "left" as const });
const item = (id: string, title: string, text: string, value = "") => ({ id, title, text, label: "", href: "", imageUrl: "", value });

function system(id: string, systemKey: string, overrides: Partial<BuilderContent> = {}): BuilderSection {
  return { id, type: "system", systemKey, variant: "default", visible: true, content: { ...emptyContent(), ...overrides }, style: style() };
}

export function createDefaultSiteBuilderDocument(): SiteBuilderDocument {
  return {
    schemaVersion: 1,
    theme: { accent: "blue", radius: "soft", density: "comfortable" },
    pages: {
      home: {
        label: PUBLIC_PAGE_LABELS.home,
        sections: [
          system("home-hero", "home.hero", {
            title: "Your One-Stop\nDestination\nFor All Digital Needs",
            body: "Access leading AI, coding, design, and SaaS tools through a secure marketplace with instant activation and ticket-based support.",
            primaryLabel: "View all plans",
            primaryHref: "/tools",
            secondaryLabel: "Request a Tool/Service",
            secondaryHref: "/request-tool-service",
          }),
          system("home-stats", "home.stats", {
            title: "Marketplace highlights",
            items: [
              item("home-stat-marketplace", "MARKETPLACE", "Premium AI Tools"),
              item("home-stat-offer", "SASIFY OFFER", "Best Local Prices"),
              item("home-stat-delivery", "DELIVERY", "Instant Activation"),
              item("home-stat-support", "SUPPORT", "Private Tickets"),
            ],
          }),
          system("home-features", "home.features", {
            eyebrow: "Learn more about SASIFY",
            title: "Built for fast, secure digital access",
            body: "Search, pay directly or through wallet, and receive your digital product through a clean marketplace.",
            items: [
              item("home-feature-search", "Smart tool search", "Find Cursor, Grok, GPT, Claude, Gemini, cloud services, and more instantly."),
              item("home-feature-checkout", "Flexible checkout", "Buy with guest direct payment or use your SASIFY wallet for discounted checkout."),
              item("home-feature-pricing", "Sasify pricing", "Clear local offers, plan durations, and activation details before you order."),
              item("home-feature-delivery", "Secure delivery", "Credentials, license keys, activation links, or instructions are delivered only after successful payment."),
            ],
          }),
          system("home-answer-engine", "home.answer-engine", {
            eyebrow: "SASIFY Overview",
            title: "Clear answers for customers and search engines",
            body: "The website explains exactly what SASIFY offers, how checkout works, and how customers receive help after purchase.",
            items: [
              item("home-answer-what", "What is SASIFY Solutions?", "SASIFY Solutions is an independent digital services marketplace for AI tools, SaaS subscriptions, productivity tools, coding tools, design tools, and support-backed activations."),
              item("home-answer-buy", "How do users buy AI tools?", "Customers choose a plan and either pay directly as guests or use a SASIFY wallet account for discounted checkout and dashboard tracking."),
              item("home-answer-private", "Are accounts private?", "Where supported by a product, activation can be assisted on the customer email or account. Each product page explains the exact delivery method."),
              item("home-answer-who", "Who is it for?", "Students, creators, freelancers, developers, agencies, and businesses use SASIFY to access affordable digital tools with clear support."),
            ],
          }),
          system("home-popular-tools", "home.popular-tools", {
            title: "Popular digital tools",
            body: "Browse active products selected for fast, supported delivery.",
            primaryLabel: "View all tools",
            primaryHref: "/tools",
          }),
          system("home-how-it-works", "home.how-it-works", {
            title: "How SASIFY works",
            items: [
              item("home-step-search", "Search and select your digital tool", "Browse our catalog or use the AI search to find exactly what you need."),
              item("home-step-pay", "Pay directly as a guest", "First-time visitors can pay to our NayaPay, EasyPaisa, JazzCash, USDT, or Binance Pay accounts and submit proof without creating an account."),
              item("home-step-account", "Create an account when you want", "Accounts are optional for direct checkout, but useful for dashboard orders, wallet balance, and support tickets."),
              item("home-step-wallet", "Use the SASIFY wallet for savings", "Deposit funds once and use wallet checkout when you want the automatic 5% website discount."),
              item("home-step-delivery", "Receive delivery and support", "Get your credentials, license keys, or activation links delivered securely. 24/7 support available."),
            ],
          }),
          system("home-wallet", "home.wallet", {
            title: "Wallet savings when customers want them",
            body: "Customers can buy directly from each product page without an account. The SASIFY wallet remains available for repeat buyers who want to deposit once and receive an automatic 5% website discount.",
            eyebrow: "Wallet purchases receive 5% discount on every website purchase.",
            primaryLabel: "Open Wallet",
            primaryHref: "/dashboard/wallet",
            items: [
              item("wallet-trc20", "USDT TRC20", "Blockchain-verified deposits using transaction hash verification."),
              item("wallet-bep20", "USDT BEP20", "BSC network deposits submitted with transaction hash and screenshot."),
              item("wallet-easypaisa", "EasyPaisa", "Manual deposit approval after TRX ID and screenshot upload."),
              item("wallet-nayapay", "NayaPay", "Automatic wallet credit after matching TRX ID from NayaPay email."),
              item("wallet-jazzcash", "JazzCash", "Manual deposit approval after screenshot upload."),
              item("wallet-binance", "Binance Pay", "Manual deposit approval after TRX ID and screenshot upload."),
            ],
          }),
          system("home-provider-cta", "home.provider-cta", {
            eyebrow: "For suppliers",
            title: "Want to sell digital tools through Sasify?",
            body: "If you can provide reliable subscriptions, activations, or digital stock, apply from the public provider form. Customers keep a clean buying dashboard while providers have a separate approval flow.",
            primaryLabel: "Apply as Provider",
            primaryHref: "/become-provider",
            items: [
              item("provider-stock", "Share stock details", "Tell us what you can supply and your wholesale range."),
              item("provider-delivery", "Explain delivery", "Describe how customers receive credentials or activations."),
              item("provider-approval", "Admin approval", "Sasify reviews every provider before anything goes live."),
            ],
          }),
          system("home-faq", "home.faq", {
            title: "Frequently Asked Questions",
            items: [
              item("faq-independent", "Is SASIFY Solutions an official reseller of these brands?", "No. SASIFY Solutions is an independent digital services marketplace. Brand names are used only to identify services requested by customers unless official partnership proof is added by admin."),
              item("faq-buy", "How do I buy a product?", "Open any product page, choose a plan, then either submit a guest direct payment order or log in and pay through your SASIFY wallet. Customer help is handled through support tickets; WhatsApp access appears only after purchase."),
              item("faq-wallet", "Why should I use the SASIFY wallet?", "The wallet is optional, but website wallet purchases automatically receive a 5% discount."),
              item("faq-guest", "Can I buy without creating an account?", "Yes. Guest direct checkout lets you pay to our listed account, upload payment proof, and submit your order for admin verification."),
              item("faq-payment", "How are payments verified?", "Wallet deposits and guest direct payments are verified from the submitted transaction reference and payment screenshot. NayaPay wallet deposits may be credited automatically when the receipt email matches."),
              item("faq-delivery", "When do I receive my product?", "Delivery time depends on the product and plan. Each product page displays its delivery estimate."),
            ],
          }),
        ],
      },
      tools: { label: PUBLIC_PAGE_LABELS.tools, sections: [system("tools-catalog", "tools.catalog", { title: "Tools Catalogue" })] },
      "product-detail": { label: PUBLIC_PAGE_LABELS["product-detail"], sections: [system("product-detail", "product.detail", { title: "Product Detail" })] },
      scammers: { label: PUBLIC_PAGE_LABELS.scammers, sections: [system("scammers-directory", "scammers.directory", { title: "Scammer Directory" })] },
      faq: { label: PUBLIC_PAGE_LABELS.faq, sections: [system("faq-page", "faq.page", { title: "FAQ" })] },
      reviews: { label: PUBLIC_PAGE_LABELS.reviews, sections: [system("reviews-page", "reviews.page", { title: "Reviews" })] },
      contact: { label: PUBLIC_PAGE_LABELS.contact, sections: [system("contact-form", "contact.form", { title: "Contact" })] },
      "request-tool": { label: PUBLIC_PAGE_LABELS["request-tool"], sections: [system("request-tool-form", "request-tool.form", { title: "Request a Tool" })] },
      "provider-apply": { label: PUBLIC_PAGE_LABELS["provider-apply"], sections: [system("provider-apply-form", "provider-apply.form", { title: "Provider Application" })] },
      legal: { label: PUBLIC_PAGE_LABELS.legal, sections: [system("legal-content", "legal.content", { title: "Legal Pages" })] },
    },
  };
}

export const SECTION_LIBRARY: Array<{ type: BuilderSection["type"]; label: string; variants: string[] }> = [
  { type: "hero", label: "Hero", variants: ["split", "centered", "compact"] },
  { type: "cards", label: "Card Grid", variants: ["three-column", "feature", "pricing"] },
  { type: "slider", label: "Slider", variants: ["cards", "testimonials", "logos"] },
  { type: "stats", label: "Stats", variants: ["strip", "cards"] },
  { type: "steps", label: "Steps", variants: ["numbered", "timeline"] },
  { type: "faq", label: "FAQ", variants: ["accordion", "split"] },
  { type: "trust", label: "Trust Section", variants: ["badges", "split"] },
  { type: "cta", label: "Call to Action", variants: ["solid", "split", "compact"] },
  { type: "rich-text", label: "Rich Text", variants: ["article", "announcement"] },
  { type: "spacer", label: "Divider / Space", variants: ["space", "line"] },
];

export function createLibrarySection(type: BuilderSection["type"], id: string): BuilderSection {
  const entry = SECTION_LIBRARY.find((entry) => entry.type === type);
  return {
    id,
    type,
    variant: entry?.variants[0] ?? "default",
    visible: true,
    content: {
      ...emptyContent(),
      eyebrow: type === "hero" ? "SASIFY SOLUTIONS" : "",
      title: entry?.label ?? "New section",
      body: type === "spacer" ? "" : "Add clear, customer-facing content for this section.",
      primaryLabel: type === "hero" || type === "cta" ? "Explore tools" : "",
      primaryHref: type === "hero" || type === "cta" ? "/tools" : "",
      items: ["cards", "slider", "stats", "steps", "faq", "trust"].includes(type)
        ? [1, 2, 3].map((number) => item(`${id}-item-${number}`, `Item ${number}`, "Describe this item.", type === "stats" ? `${number}00+` : ""))
        : [],
    },
    style: style(),
  };
}

import { useEffect } from "react";
import { useLocation } from "react-router";

type SeoProps = {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalPath?: string;
  image?: string;
  type?: "website" | "article";
};

const SITE_URL = "https://sasify.solutions";
const DEFAULT_TITLE = "SASIFY Solutions | AI Tools and Digital Services Marketplace";
const DEFAULT_DESCRIPTION =
  "SASIFY Solutions is a digital tools marketplace for AI subscriptions, SaaS tools, coding tools, productivity tools, design tools, wallet payments, and support-backed activations in Pakistan and worldwide.";
const DEFAULT_KEYWORDS = [
  "Sasify Solutions",
  "AI tools marketplace",
  "buy AI tools",
  "ChatGPT Plus subscription",
  "private AI accounts",
  "SaaS tools Pakistan",
  "AI subscriptions Pakistan",
  "affordable AI tools",
  "digital tools marketplace",
  "coding AI tools",
  "productivity AI tools",
  "design AI tools",
  "automation tools",
  "AI accounts on email",
  "private subscription tools",
];

function setMeta(selector: string, attrs: Record<string, string>) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement("meta");
    document.head.appendChild(tag);
  }
  Object.entries(attrs).forEach(([key, value]) => tag?.setAttribute(key, value));
}

function setLink(selector: string, attrs: Record<string, string>) {
  let tag = document.head.querySelector<HTMLLinkElement>(selector);
  if (!tag) {
    tag = document.createElement("link");
    document.head.appendChild(tag);
  }
  Object.entries(attrs).forEach(([key, value]) => tag?.setAttribute(key, value));
}

export default function Seo({
  title,
  description,
  keywords = DEFAULT_KEYWORDS,
  canonicalPath = "/",
  image = "/brand/sasify-logo.jpg",
  type = "website",
}: SeoProps) {
  const location = useLocation();

  useEffect(() => {
    const pageMeta = getPageMeta(location.pathname);
    const pageTitle = title ?? pageMeta.title;
    const pageDescription = description ?? pageMeta.description;
    const pageCanonicalPath = canonicalPath === "/" ? location.pathname : canonicalPath;
    const canonicalUrl = new URL(pageCanonicalPath, SITE_URL).toString();
    const imageUrl = new URL(image, SITE_URL).toString();

    document.title = pageTitle;
    setMeta('meta[name="description"]', { name: "description", content: pageDescription });
    setMeta('meta[name="keywords"]', { name: "keywords", content: keywords.join(", ") });
    setMeta('meta[name="robots"]', { name: "robots", content: "index, follow, max-image-preview:large" });
    setMeta('meta[name="theme-color"]', { name: "theme-color", content: "#075DFF" });
    setLink('link[rel="canonical"]', { rel: "canonical", href: canonicalUrl });

    setMeta('meta[property="og:title"]', { property: "og:title", content: pageTitle });
    setMeta('meta[property="og:description"]', { property: "og:description", content: pageDescription });
    setMeta('meta[property="og:type"]', { property: "og:type", content: type });
    setMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    setMeta('meta[property="og:image"]', { property: "og:image", content: imageUrl });
    setMeta('meta[property="og:site_name"]', { property: "og:site_name", content: "SASIFY Solutions" });

    setMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    setMeta('meta[name="twitter:title"]', { name: "twitter:title", content: pageTitle });
    setMeta('meta[name="twitter:description"]', { name: "twitter:description", content: pageDescription });
    setMeta('meta[name="twitter:image"]', { name: "twitter:image", content: imageUrl });
  }, [canonicalPath, description, image, keywords, location.pathname, title, type]);

  return null;
}

export { DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS, DEFAULT_TITLE, SITE_URL };

function getPageMeta(pathname: string) {
  if (pathname.startsWith("/tools/")) {
    return {
      title: "Digital Tool Details | SASIFY Solutions",
      description:
        "View digital tool plans, pricing, delivery details, wallet discount, support terms, and order options on SASIFY Solutions.",
    };
  }

  if (pathname.startsWith("/categories/")) {
    return {
      title: "Digital Tool Category | SASIFY Solutions",
      description: "Browse digital tools and services in this SASIFY Solutions category.",
    };
  }

  const meta: Record<string, { title: string; description: string }> = {
    "/": {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
    },
    "/tools": {
      title: "Browse AI Tools and Digital Services | SASIFY Solutions",
      description:
        "Browse AI tools, SaaS subscriptions, coding tools, productivity tools, design tools, and digital services available through SASIFY Solutions.",
    },
    "/categories": {
      title: "Digital Tool Categories | SASIFY Solutions",
      description:
        "Explore SASIFY Solutions categories for AI tools, productivity tools, SaaS subscriptions, coding tools, design tools, video tools, and cloud services.",
    },
    "/scammers": {
      title: "Scammer Numbers and Proof | SASIFY Solutions",
      description:
        "Browse admin-approved scammer number reports with proof screenshots submitted by the SASIFY Solutions community.",
    },
    "/reviews": {
      title: "Customer Reviews | SASIFY Solutions",
      description:
        "Read customer feedback for SASIFY Solutions digital tools, wallet deposits, activation support, and support ticket experience.",
    },
    "/faq": {
      title: "FAQ | SASIFY Solutions",
      description:
        "Answers about SASIFY Solutions, wallet deposits, AI tool purchases, private activation support, delivery, support tickets, and account rules.",
    },
    "/contact": {
      title: "Contact SASIFY Solutions",
      description:
        "Contact SASIFY Solutions for customer support, tool requests, digital service questions, and account help through private support tickets.",
    },
    "/terms": { title: "Terms & Conditions | SASIFY Solutions", description: "Terms governing purchases, accounts, wallet usage, delivery, and support on SASIFY Solutions." },
    "/privacy": { title: "Privacy Policy | SASIFY Solutions", description: "How SASIFY Solutions handles account, order, payment, and support information." },
    "/refund-policy": { title: "Refund Policy | SASIFY Solutions", description: "Refund eligibility and handling for SASIFY Solutions digital products and services." },
    "/disclaimer": { title: "Disclaimer | SASIFY Solutions", description: "Important service, product, and third-party disclaimer information for SASIFY Solutions." },
    "/providers": { title: "Become a Provider | SASIFY Solutions", description: "Apply to supply digital products and services through SASIFY Solutions." },
    "/become-provider": { title: "Become a Provider | SASIFY Solutions", description: "Apply to supply digital products and services through SASIFY Solutions." },
    "/request-tool-service": {
      title: "Request a Tool or Service | SASIFY Solutions",
      description:
        "Request a digital tool, AI subscription, SaaS service, plan, or activation support that is not yet listed on SASIFY Solutions.",
    },
    "/login": {
      title: "Login or Create Account | SASIFY Solutions",
      description:
        "Sign in or create a SASIFY Solutions account to manage wallet deposits, orders, support tickets, and digital service purchases.",
    },
  };

  if (pathname.startsWith("/dashboard")) {
    return {
      title: "Customer Dashboard | SASIFY Solutions",
      description:
        "Manage SASIFY wallet balance, deposits, orders, profile, provider application, and support tickets from your customer dashboard.",
    };
  }

  if (pathname.startsWith("/admin")) {
    return {
      title: "Admin Panel | SASIFY Solutions",
      description: "Protected SASIFY Solutions administration area.",
    };
  }

  return meta[pathname] ?? {
    title: "Page Not Found | SASIFY Solutions",
    description: "The requested SASIFY Solutions page could not be found.",
  };
}

import { Link } from "react-router";
import {
  ArrowUpRight,
  BadgeCheck,
  ChevronDown,
  Clock3,
  Headphones,
  LifeBuoy,
  LockKeyhole,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

const FOOTER_GROUPS = [
  {
    title: "Explore",
    links: [
      { label: "Browse tools", href: "/tools" },
      { label: "Customer reviews", href: "/reviews" },
      { label: "Scammer check", href: "/scammers" },
      { label: "Request a service", href: "/request-tool-service" },
    ],
  },
  {
    title: "Your account",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Wallet", href: "/dashboard/wallet" },
      { label: "Orders", href: "/dashboard/orders" },
      { label: "Referrals", href: "/dashboard/referrals" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Become a provider", href: "/become-provider" },
      { label: "Contact", href: "/contact" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Refund policy", href: "/refund-policy" },
      { label: "Disclaimer", href: "/disclaimer" },
    ],
  },
] as const;

const TRUST_POINTS = [
  { label: "Protected wallet checkout", icon: WalletCards },
  { label: "Private dashboard delivery", icon: LockKeyhole },
  { label: "Human ticket support", icon: Headphones },
] as const;

export default function Footer() {
  return (
    <footer className="public-footer relative overflow-hidden border-t" aria-label="Sasify footer">
      <div className="public-footer-glow pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section className="public-footer-desk grid gap-5 rounded-[1.75rem] border p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center" aria-labelledby="support-desk-title">
          <div className="flex items-start gap-4">
            <span className="public-footer-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border">
              <LifeBuoy className="h-5 w-5" />
            </span>
            <div>
              <p className="public-footer-eyebrow text-[0.63rem] font-black uppercase tracking-[0.2em]">Sasify support desk</p>
              <h2 id="support-desk-title" className="mt-1.5 text-xl font-black tracking-[-0.025em] sm:text-2xl">Help stays connected to your order.</h2>
              <p className="public-footer-copy mt-2 max-w-2xl text-sm font-medium leading-6">Use a private ticket for activation, delivery, wallet, or account questions. Your order context stays inside your dashboard.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/dashboard/support" className="public-footer-support inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black text-white">
              Open support
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link to="/tools" className="public-footer-secondary inline-flex min-h-12 items-center justify-center rounded-xl border px-5 text-sm font-black">Browse tools</Link>
          </div>
        </section>

        <div className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.85fr)] lg:gap-14 lg:py-12">
          <div>
            <Link to="/" className="inline-flex items-center gap-3" aria-label="Sasify Solutions home">
              <span className="public-footer-brand-mark flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border">
                <img src="/brand/sasify-logo.jpg" alt="" width="48" height="48" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </span>
              <span>
                <span className="block text-xl font-black tracking-[-0.025em]">SASIFY</span>
                <span className="mt-1 block text-[0.65rem] font-black uppercase tracking-[0.22em] text-[#7aa2ff]">Solutions</span>
              </span>
            </Link>
            <p className="public-footer-copy mt-5 max-w-md text-sm font-medium leading-6">A focused marketplace for digital tools and services, with protected checkout, dashboard delivery, and real support when an order needs attention.</p>

            <div className="mt-6 space-y-2.5">
              {TRUST_POINTS.map(({ label, icon: Icon }) => (
                <div key={label} className="flex items-center gap-2.5 text-xs font-bold">
                  <span className="public-footer-trust-icon flex h-7 w-7 items-center justify-center rounded-lg"><Icon className="h-3.5 w-3.5" /></span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sm:hidden" role="navigation" aria-label="Footer navigation">
            {FOOTER_GROUPS.map((group) => (
              <details key={group.title} className="public-footer-mobile-group border-b">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-[0.7rem] font-black uppercase tracking-[0.15em]">
                  {group.title}
                  <ChevronDown className="h-4 w-4 transition-transform" aria-hidden="true" />
                </summary>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 pb-4">
                  {group.links.map((item) => (
                    <li key={item.href}>
                      <Link to={item.href} className="public-footer-link inline-flex min-h-10 items-center text-sm font-semibold transition-colors">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>

          <div className="hidden grid-cols-4 gap-x-6 gap-y-9 sm:grid" role="navigation" aria-label="Footer navigation">
            {FOOTER_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="public-footer-heading text-[0.64rem] font-black uppercase tracking-[0.18em]">{group.title}</h3>
                <ul className="mt-4 space-y-3.5">
                  {group.links.map((item) => (
                    <li key={item.href}>
                      <Link to={item.href} className="public-footer-link inline-flex min-h-7 items-center text-sm font-semibold transition-colors">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="public-footer-rule h-px" />
        <div className="grid gap-5 py-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <p className="public-footer-meta max-w-4xl text-[0.69rem] font-medium leading-5">SASIFY Solutions is an independent digital services marketplace. Brand names identify services requested by customers and do not imply affiliation, endorsement, or an official connection unless explicitly stated.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:justify-end">
            <span className="public-footer-assurance inline-flex items-center gap-1.5 text-[0.68rem] font-bold"><BadgeCheck className="h-3.5 w-3.5" /> Independent marketplace</span>
            <span className="public-footer-assurance inline-flex items-center gap-1.5 text-[0.68rem] font-bold"><Clock3 className="h-3.5 w-3.5" /> Order-linked support</span>
          </div>
        </div>

        <div className="public-footer-bottom flex flex-col gap-3 border-t pt-5 text-[0.68rem] font-semibold sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} SASIFY Solutions. All rights reserved.</p>
          <p className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Built for protected digital delivery.</p>
        </div>
      </div>
    </footer>
  );
}

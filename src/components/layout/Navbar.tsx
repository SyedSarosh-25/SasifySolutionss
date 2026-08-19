import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  ChevronRight,
  LifeBuoy,
  LogOut,
  Menu,
  Shield,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";

const NAV_LINKS = [
  { label: "Tools", href: "/tools" },
  { label: "Reviews", href: "/reviews" },
  { label: "Scammer Check", href: "/scammers" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
] as const;

function isNavActive(pathname: string, href: string) {
  if (href === "/tools") return pathname === "/tools" || pathname.startsWith("/tools/") || pathname.startsWith("/categories");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const { user, isAuthenticated, logout } = useAuth();
  const { currency, setCurrency } = useCurrency();

  const closeMobileMenu = useCallback(() => {
    setMobileOpen(false);
    window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileMenu();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.offsetParent !== null);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen, closeMobileMenu]);

  return (
    <header className="public-shell-header fixed inset-x-0 top-0 z-50 h-[4.75rem]">
      <nav className="public-shell-nav h-full border-b" aria-label="Primary navigation">
        <div className="mx-auto grid h-full max-w-[1440px] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="group flex min-w-0 shrink-0 items-center gap-3" aria-label="Sasify Solutions home">
            <span className="public-shell-logo-mark relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[0.9rem] border">
              <img
                src="/brand/sasify-logo.jpg"
                alt=""
                width="44"
                height="44"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </span>
            <span className="min-w-0 leading-none">
              <span className="block text-[1.02rem] font-black tracking-[-0.025em] text-[#050816]">SASIFY</span>
              <span className="mt-1 block text-[0.62rem] font-black uppercase tracking-[0.2em] text-[#155cff]">Solutions</span>
            </span>
            <span className="hidden h-8 w-px bg-[#dfe6ff] lg:block" aria-hidden="true" />
            <span className="hidden text-[0.68rem] font-bold leading-[1.35] text-[#7c8498] lg:block">
              Digital tools.<br />Human support.
            </span>
          </Link>

          <div className="hidden min-w-0 items-center justify-center gap-1 xl:flex">
            {NAV_LINKS.map((link) => {
              const active = isNavActive(location.pathname, link.href);
              return (
                <NavLink
                  key={link.href}
                  to={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`public-shell-nav-link relative rounded-xl px-3 py-2.5 text-[0.78rem] font-bold transition-colors ${
                    active ? "text-[#155cff]" : "text-[#39415d] hover:text-[#155cff]"
                  }`}
                >
                  {link.label}
                  <span
                    aria-hidden="true"
                    className={`public-shell-active-rail absolute inset-x-3 -bottom-[0.93rem] h-0.5 rounded-full transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
                  />
                </NavLink>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
            <div className="public-shell-currency hidden h-10 items-center rounded-xl border p-1 xl:flex" role="group" aria-label="Display currency">
              {(["USD", "PKR"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setCurrency(code)}
                  aria-pressed={currency === code}
                  className={`flex h-8 items-center gap-1.5 rounded-lg px-2 text-[0.67rem] font-black transition-all ${
                    currency === code ? "public-shell-currency-active text-white" : "text-[#667089] hover:text-[#155cff]"
                  }`}
                >
                  <img src={code === "USD" ? "/flags/us.png" : "/flags/pk.png"} alt="" width="16" height="12" className="h-3 w-4 rounded-[2px] object-cover" />
                  {code}
                </button>
              ))}
            </div>

            {isAuthenticated ? (
              <div className="hidden items-center gap-2 xl:flex">
                {user?.role === "admin" && (
                  <Link to="/admin" className="public-shell-admin inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-black">
                    <Shield className="h-3.5 w-3.5" />
                    Admin
                  </Link>
                )}
                <Link to="/dashboard" className="public-shell-account inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black text-[#25304d]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#eef3ff] text-[#155cff]">
                    <User className="h-3.5 w-3.5" />
                  </span>
                  <span className="max-w-24 truncate">{user?.name || "Dashboard"}</span>
                </Link>
                <button type="button" onClick={logout} className="public-shell-icon-button flex h-10 w-10 items-center justify-center rounded-xl border text-[#667089] hover:text-[#d11f4a]" aria-label="Logout">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 xl:flex">
                <Link to="/login" className="inline-flex h-10 items-center px-2 text-sm font-bold text-[#39415d] transition-colors hover:text-[#155cff]">Sign in</Link>
                <Link to="/tools" className="public-shell-primary inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-black text-white">
                  Browse tools
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMobileOpen(true)}
              className="public-shell-icon-button flex h-11 w-11 items-center justify-center rounded-xl border text-[#102055] xl:hidden"
              aria-label="Open navigation"
              aria-controls="public-mobile-navigation"
              aria-expanded={mobileOpen}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] cursor-default bg-[#071126]/50 backdrop-blur-sm xl:hidden"
              onClick={closeMobileMenu}
            />
            <motion.aside
              ref={drawerRef}
              id="public-mobile-navigation"
              role="dialog"
              aria-modal="true"
              aria-label="Site navigation"
              initial={reduceMotion ? false : { x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: reduceMotion ? 0 : 0.24, ease: "easeOut" }}
              className="public-shell-drawer fixed inset-y-0 right-0 z-[70] flex h-dvh w-[min(23rem,100vw)] flex-col overflow-y-auto border-l shadow-2xl xl:hidden"
            >
              <div className="flex h-[4.75rem] shrink-0 items-center justify-between border-b border-[#e3e9fb] px-4 sm:px-5">
                <Link to="/" className="flex items-center gap-3" aria-label="Sasify home">
                  <img src="/brand/sasify-logo.jpg" alt="" width="42" height="42" className="h-10.5 w-10.5 rounded-xl border border-[#dfe6ff] object-cover" />
                  <span>
                    <span className="block text-base font-black leading-none text-[#050816]">SASIFY</span>
                    <span className="mt-1 block text-[0.59rem] font-black uppercase tracking-[0.2em] text-[#155cff]">Solutions</span>
                  </span>
                </Link>
                <button ref={closeButtonRef} type="button" onClick={closeMobileMenu} className="public-shell-icon-button flex h-10 w-10 items-center justify-center rounded-xl border text-[#102055]" aria-label="Close navigation">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-1 flex-col px-4 py-5 sm:px-5">
                <div className="mb-5 flex items-center gap-2 rounded-2xl border border-[#dfe6ff] bg-[#f7f9ff] p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#155cff] shadow-sm ring-1 ring-[#dfe6ff]">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-black text-[#0a1128]">Secure digital marketplace</span>
                    <span className="mt-0.5 block text-[0.68rem] font-semibold text-[#7c8498]">Protected checkout and private support</span>
                  </span>
                </div>

                <p className="mb-2 px-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#8a94aa]">Explore</p>
                <div className="space-y-1">
                  {NAV_LINKS.map((link) => {
                    const active = isNavActive(location.pathname, link.href);
                    return (
                      <NavLink
                        key={link.href}
                        to={link.href}
                        onClick={closeMobileMenu}
                        aria-current={active ? "page" : undefined}
                        className={`flex min-h-12 items-center justify-between rounded-xl px-3.5 text-sm font-bold transition-colors ${
                          active ? "bg-[#eef3ff] text-[#155cff]" : "text-[#39415d] hover:bg-[#f4f6ff] hover:text-[#155cff]"
                        }`}
                      >
                        {link.label}
                        <ChevronRight className="h-4 w-4" />
                      </NavLink>
                    );
                  })}
                </div>

                <div className="my-5 h-px bg-[#e7ecff]" />

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-[#0a1128]">Display currency</p>
                    <p className="mt-0.5 text-[0.67rem] font-semibold text-[#7c8498]">Prices update across the marketplace</p>
                  </div>
                  <div className="public-shell-currency flex shrink-0 items-center rounded-xl border p-1" role="group" aria-label="Display currency">
                    {(["USD", "PKR"] as const).map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setCurrency(code)}
                        aria-pressed={currency === code}
                        className={`flex h-8 items-center gap-1.5 rounded-lg px-2 text-[0.65rem] font-black ${currency === code ? "public-shell-currency-active text-white" : "text-[#667089]"}`}
                      >
                        <img src={code === "USD" ? "/flags/us.png" : "/flags/pk.png"} alt="" width="16" height="12" className="h-3 w-4 rounded-[2px] object-cover" />
                        {code}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-auto pt-6">
                  <Link to="/dashboard/support" className="mb-3 flex items-center justify-between rounded-2xl bg-[#071126] p-4 text-white shadow-[0_14px_32px_rgba(7,17,38,.16)]">
                    <span className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><LifeBuoy className="h-4.5 w-4.5" /></span>
                      <span>
                        <span className="block text-xs font-black">Need order help?</span>
                        <span className="mt-0.5 block text-[0.68rem] font-semibold text-white/65">Open a private support ticket</span>
                      </span>
                    </span>
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>

                  {isAuthenticated ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Link to="/dashboard" className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#eef3ff] px-3 text-xs font-black text-[#155cff]">
                        <User className="h-4 w-4" /> Dashboard
                      </Link>
                      <button type="button" onClick={logout} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#fff0f4] px-3 text-xs font-black text-[#d11f4a]">
                        <LogOut className="h-4 w-4" /> Logout
                      </button>
                      {user?.role === "admin" && (
                        <Link to="/admin" className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#fff7df] px-3 text-xs font-black text-[#9b6200]">
                          <Shield className="h-4 w-4" /> Admin panel
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Link to="/login" className="flex min-h-11 items-center justify-center rounded-xl border border-[#cfd9ff] bg-white px-3 text-xs font-black text-[#25304d]">Sign in</Link>
                      <Link to="/tools" className="public-shell-primary flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-black text-white">Browse tools <ArrowUpRight className="h-3.5 w-3.5" /></Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

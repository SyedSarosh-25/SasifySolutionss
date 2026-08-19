import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Search,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import HeroSolarSystem from "./HeroSolarSystem";
import type { BuilderSection } from "@/site-builder/schema";

const categoryChips = ["AI Tools", "Productivity", "SaaS", "Design", "Video", "Cloud"];

export default function HeroSection({ content }: { content?: BuilderSection["content"] }) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const titleLines = (content?.title || "Your One-Stop\nDestination\nFor All Digital Needs").split("\n").filter(Boolean);

  const { data: suggestions, isLoading } = trpc.public.search.useQuery(
    { query },
    { enabled: query.length > 0 }
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!suggestions?.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        navigate(`/tools/${suggestions[selectedIndex].slug}`);
        setIsFocused(false);
        setQuery("");
      }
    } else if (e.key === "Escape") {
      setIsFocused(false);
    }
  };

  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-8 sm:px-6 sm:pt-10 lg:pb-20 lg:pt-12">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="min-w-0"
        >
          {content?.eyebrow && <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-[#155cff]">{content.eyebrow}</p>}
          <h1 className="max-w-[18rem] text-[2rem] font-black leading-[1.08] tracking-normal text-[#050816] min-[375px]:max-w-[21rem] min-[375px]:text-[2.18rem] min-[430px]:max-w-[23rem] min-[430px]:text-[2.34rem] sm:max-w-2xl sm:text-[3.05rem] sm:leading-[1.04] lg:text-[4.05rem] xl:text-[4.55rem]">
            {titleLines.map((line, index) => <span key={`${line}-${index}`} className={`block ${index === titleLines.length - 1 ? "bg-[linear-gradient(92deg,#075dff,#6d35ff_58%,#9f36ff)] bg-clip-text text-transparent" : ""}`}>{line}</span>)}
          </h1>

          <p className="mt-4 max-w-xl text-sm font-medium leading-6 text-[#31384f] min-[430px]:text-[0.95rem] sm:mt-6 sm:text-lg sm:leading-relaxed lg:text-xl">
            {content?.body || "Access leading AI, coding, design, and SaaS tools through a secure marketplace with instant activation and ticket-based support."}
          </p>

          <div ref={searchRef} className="relative mt-6 max-w-2xl sm:mt-8">
            <div
              className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-[0_16px_45px_rgba(15,48,135,0.12)] transition-all ${
                isFocused ? "border-[#155cff] ring-4 ring-[#155cff]/12" : "border-[#dfe6ff]"
              }`}
            >
              <Search className="h-5 w-5 shrink-0 text-[#155cff]" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(-1);
                }}
                onFocus={() => setIsFocused(true)}
                onKeyDown={handleKeyDown}
                placeholder="Search Cursor, SuperGrok, ChatGPT, Claude..."
                aria-label="Search the marketplace"
                className="hero-search-input h-11 min-w-0 flex-1 rounded-none border-0 bg-transparent text-sm font-semibold text-[#080914] !shadow-none !outline-none placeholder-[#8992aa] focus:!border-0 focus:!shadow-none focus:!outline-none focus:!ring-0 focus-visible:!shadow-none focus-visible:!outline-none focus-visible:!ring-0 sm:text-base"
              />
              <button
                aria-label="Search"
                className="tap-target flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#075dff,#6d35ff)] text-white shadow-[0_8px_20px_rgba(21,92,255,0.32)] transition-transform hover:scale-105"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>

            <AnimatePresence>
              {isFocused && query.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-[#dfe6ff] bg-white shadow-[0_20px_50px_rgba(12,37,104,0.16)]"
                >
                  {isLoading ? (
                    <div className="p-4">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-[#eef3ff]" />
                    </div>
                  ) : suggestions && suggestions.length > 0 ? (
                    <div className="max-h-[320px] overflow-y-auto py-2">
                      {suggestions.map((item, index) => (
                        <Link
                          key={item.id}
                          to={`/tools/${item.slug}`}
                          onClick={() => {
                            setIsFocused(false);
                            setQuery("");
                          }}
                          className={`flex items-center justify-between px-4 py-3 transition-colors ${
                            index === selectedIndex ? "bg-[#eef3ff]" : "hover:bg-[#f7f9ff]"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <Search className="h-4 w-4 shrink-0 text-[#155cff]" />
                            <span className="truncate text-sm font-bold text-[#111827]">{item.name}</span>
                          </div>
                          <span className="ml-3 shrink-0 rounded-full bg-[#eef3ff] px-2.5 py-0.5 text-xs font-bold text-[#155cff]">
                            {item.categoryName}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-center text-sm font-semibold text-[#7c8498]">
                      No results found for &quot;{query}&quot;
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to="/tools"
              className="tap-target inline-flex items-center rounded-full bg-[linear-gradient(135deg,#075dff,#6d35ff)] px-4 py-2 text-xs font-black text-white shadow-[0_10px_24px_rgba(21,92,255,0.24)]"
            >
              All Tools
            </Link>
            {categoryChips.map((chip) => (
              <Link
                key={chip}
                to={`/categories/${chip.toLowerCase().replace(/\s+/g, "-")}`}
                className="tap-target inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-black text-[#155cff] shadow-sm ring-1 ring-[#dfe6ff] transition-transform hover:-translate-y-0.5"
              >
                {chip}
              </Link>
            ))}
          </div>

          <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
            <Link to={content?.primaryHref || "/tools"} className="tap-target inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#075dff,#6d35ff)] px-6 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(21,92,255,0.32)] transition-transform hover:-translate-y-0.5">
              {content?.primaryLabel || "View all plans"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to={content?.secondaryHref || "/request-tool-service"}
              className="tap-target inline-flex items-center justify-center gap-2 rounded-full bg-[#eef3ff] px-6 py-3 text-sm font-black text-[#061652] shadow-[0_10px_24px_rgba(12,37,104,0.1)] ring-1 ring-[#cfd9ff] transition-transform hover:-translate-y-0.5"
            >
              {content?.secondaryLabel || "Request a Tool/Service"}
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative min-h-[31rem] sm:min-h-[35rem] lg:min-h-[39rem] lg:self-start"
        >
          <HeroSolarSystem />
        </motion.div>
      </div>
    </section>
  );
}

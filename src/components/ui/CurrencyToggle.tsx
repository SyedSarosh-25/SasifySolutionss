import type { Currency } from "@/lib/currency";
import { useCurrency } from "@/hooks/useCurrency";

type CurrencyToggleProps = {
  className?: string;
  compact?: boolean;
};

export default function CurrencyToggle({ className = "", compact = false }: CurrencyToggleProps) {
  const { currency, setCurrency } = useCurrency();

  const options: Currency[] = ["USD", "PKR"];

  return (
    <div
      className={`inline-flex items-center rounded-full border border-[#cfd9ff] bg-white/88 p-1 shadow-[0_10px_24px_rgba(12,37,104,0.08)] backdrop-blur-xl ${className}`}
      role="tablist"
      aria-label="Currency switcher"
    >
      {options.map((option) => {
        const isActive = currency === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setCurrency(option)}
            className={`tap-target rounded-full font-black transition-all ${
              compact ? "px-3 py-1.5 text-[0.68rem]" : "px-4 py-2 text-xs"
            } ${
              isActive
                ? "bg-[linear-gradient(135deg,#075dff,#6d35ff)] text-white shadow-[0_10px_24px_rgba(21,92,255,0.22)]"
                : "text-[#5f6780] hover:bg-[#eef3ff] hover:text-[#155cff]"
            }`}
            role="tab"
            aria-selected={isActive}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { formatCurrency, setExchangeRate, type Currency } from "@/lib/currency";
import { CurrencyContext, type CurrencyContextValue } from "@/lib/currency-context";
import { trpc } from "@/providers/trpc";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    if (typeof window === "undefined") return "PKR";
    const savedCurrency = window.localStorage.getItem("sasify_currency");
    if (savedCurrency === "USD" || savedCurrency === "PKR") {
      return savedCurrency;
    }
    return "PKR";
  });

  // Fetch exchange rate from server
  const { data: siteSettings } = trpc.public.siteSettings.useQuery();
  const configuredRate = Number(siteSettings?.usd_to_pkr ?? 285);
  const exchangeRate = Number.isFinite(configuredRate) && configuredRate > 0 ? configuredRate : 285;

  useEffect(() => {
    setExchangeRate(exchangeRate);
  }, [exchangeRate]);

  useEffect(() => {
    window.localStorage.setItem("sasify_currency", currency);
  }, [currency]);

  const value = useMemo<CurrencyContextValue>(() => ({
    currency,
    setCurrency: setCurrencyState,
    toggleCurrency: () => setCurrencyState((current) => (current === "USD" ? "PKR" : "USD")),
    format: (usdValue) => formatCurrency(usdValue, currency),
    exchangeRate,
  }), [currency, exchangeRate]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

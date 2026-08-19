import { createContext } from "react";
import type { Currency } from "@/lib/currency";

export type CurrencyContextValue = {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  toggleCurrency: () => void;
  format: (usdValue: string | number | null | undefined) => string;
  exchangeRate: number;
};

export const CurrencyContext = createContext<CurrencyContextValue | null>(null);

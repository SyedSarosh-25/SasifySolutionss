import { useContext } from "react";
import { CurrencyContext } from "@/lib/currency-context";

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used inside CurrencyProvider");
  }
  return context;
}

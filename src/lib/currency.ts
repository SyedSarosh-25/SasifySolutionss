export type Currency = "USD" | "PKR";

// This gets loaded from site_settings at boot and updated by admin in settings
let exchangeRate = 285;

export function getExchangeRate(): number {
  return exchangeRate;
}

export function setExchangeRate(rate: number) {
  if (Number.isFinite(rate) && rate > 0) {
    exchangeRate = rate;
  }
}

export function usdToPkr(usd: number): number {
  return Math.round(usd * exchangeRate);
}

export function pkrToUsd(pkr: number): number {
  return Math.round((pkr / exchangeRate) * 100) / 100;
}

export const USD_TO_PKR = 285; // kept for backward compat — use getExchangeRate() instead

function parseUsdAmount(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function usdToCurrency(value: string | number | null | undefined, currency: Currency) {
  const usd = parseUsdAmount(value);
  return currency === "PKR" ? usd * getExchangeRate() : usd;
}

export function currencyToUsd(value: string | number, currency: Currency) {
  const amount = parseUsdAmount(value);
  return currency === "PKR" ? amount / getExchangeRate() : amount;
}

export function formatCurrency(value: string | number | null | undefined, currency: Currency) {
  const converted = usdToCurrency(value, currency);

  if (currency === "PKR") {
    return `Rs ${Math.round(converted).toLocaleString("en-PK")}`;
  }

  return `$${converted.toLocaleString("en-US", {
    minimumFractionDigits: converted % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

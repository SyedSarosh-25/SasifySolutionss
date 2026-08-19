import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  appId: required("APP_ID"),
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  webhookSecret: process.env.WEBHOOK_SECRET ?? "",
  binanceApiKey: process.env.BINANCE_API_KEY ?? "",
  binanceApiSecret: process.env.BINANCE_API_SECRET ?? "",
  binancePayBaseUrl: process.env.BINANCE_PAY_BASE_URL ?? "https://bpay.binanceapi.com",
  publicAppUrl: process.env.PUBLIC_APP_URL ?? "",
  trustProxy: process.env.TRUST_PROXY === "true",
  kimiAuthUrl: process.env.KIMI_AUTH_URL ?? "",
  kimiOpenUrl: process.env.KIMI_OPEN_URL ?? "",
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
  technysoftApiKey: process.env.TECHNYSOFT_API_KEY ?? "",
  canbosoApiKey: process.env.CANBOSO_API_KEY ?? "",
  akundingApiKey: process.env.AKUNDING_API_KEY ?? "",
};

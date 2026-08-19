import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import { env } from "../lib/env";
import { SiteSetting } from "../mongo/models";
import { requireEncryptedCredential, revealCredential } from "../lib/credential-security";

const ALLOWED_CURRENCIES = ["USDT"] as const;
type BinancePayCurrency = typeof ALLOWED_CURRENCIES[number];

export type BinancePayCredentials = { apiKey: string; apiSecret: string };
export class BinancePayTransportError extends Error {}
type BinancePayResponse<T> = { status?: string; code?: string; data?: T; errorMessage?: string };
type BinanceCertificate = { certSerial: string; certPublic: string };
export type BinanceAuthoritativeOrder = {
  merchantTradeNo: string;
  prepayId: string;
  transactionId: string;
  status: string;
  currency: string;
  amountCents: number;
};

const API_TIMEOUT_MS = 10_000;
const WEBHOOK_MAX_SKEW_MS = 5 * 60 * 1000;
const WEBHOOK_MAX_BYTES = 256 * 1024;
let certificateCache: { cacheKey: string; certs: BinanceCertificate[]; expiresAt: number } | undefined;

export function resetBinancePayCertificateCache() {
  certificateCache = undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid Binance Pay response");
  return value as Record<string, unknown>;
}

function requiredText(value: unknown, field: string, max = 4096) {
  const text = typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
  if (!text || text.length > max) throw new Error(`Invalid Binance Pay ${field}`);
  return text;
}

function optionalText(value: unknown, max = 4096) {
  if (value == null || value === "") return undefined;
  const text = String(value).trim();
  if (!text || text.length > max) throw new Error("Invalid Binance Pay response value");
  return text;
}

function safeHttpsUrl(value: unknown) {
  const text = optionalText(value, 4096);
  if (!text) return undefined;
  try {
    const url = new URL(text);
    if (url.protocol !== "https:") throw new Error();
    return url.toString();
  } catch {
    throw new Error("Invalid Binance Pay checkout URL");
  }
}

function responseError(payload: Record<string, unknown>) {
  const message = typeof payload.errorMessage === "string" ? payload.errorMessage.trim() : "";
  const code = typeof payload.code === "string" ? payload.code.trim() : "";
  return (message || code || "Binance Pay request was rejected").slice(0, 240);
}

export function assertBinancePayCredential(value: string, label: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new TRPCError({ code: "BAD_REQUEST", message: `${label} is required` });
  const hasControlCharacter = [...normalized].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
  if (normalized.length > 512 || hasControlCharacter || /\s/.test(normalized)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${label} is invalid` });
  }
  return normalized;
}

export function signBinancePayPayload(timestamp: string, requestNonce: string, body: string, secret: string) {
  const payload = `${timestamp}\n${requestNonce}\n${body}\n`;
  return crypto.createHmac("sha512", secret).update(payload).digest("hex").toUpperCase();
}

function requestNonce() {
  return crypto.randomBytes(16).toString("hex");
}

function credentialCacheKey(credentials: BinancePayCredentials) {
  return crypto.createHash("sha256").update(`${credentials.apiKey}\0${credentials.apiSecret}`).digest("hex");
}

export async function loadBinancePayCredentials(): Promise<BinancePayCredentials> {
  const rows = await SiteSetting.find({ key: { $in: ["binance_pay_api_identity_key", "binance_pay_api_secret_key"] } }).select("key value").lean<any[]>();
  const values = new Map(rows.map((row) => [row.key, row.value]));
  const encryptedKey = values.get("binance_pay_api_identity_key");
  const encryptedSecret = values.get("binance_pay_api_secret_key");
  if (!encryptedKey || !encryptedSecret) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Binance Pay merchant credentials are not configured" });
  }
  try {
    return {
      apiKey: revealCredential(requireEncryptedCredential(encryptedKey)),
      apiSecret: revealCredential(requireEncryptedCredential(encryptedSecret)),
    };
  } catch {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Binance Pay merchant credentials require secure replacement" });
  }
}

export async function binancePayPost<T>(
  path: string,
  body: Record<string, unknown>,
  credentials: BinancePayCredentials,
  fetchImpl: typeof fetch = fetch,
): Promise<BinancePayResponse<T>> {
  const bodyText = JSON.stringify(body);
  const timestamp = String(Date.now());
  const nonce = requestNonce();
  let response: Response;
  try {
    response = await fetchImpl(`${env.binancePayBaseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "BinancePay-Timestamp": timestamp,
        "BinancePay-Nonce": nonce,
        "BinancePay-Certificate-SN": credentials.apiKey,
        "BinancePay-Signature": signBinancePayPayload(timestamp, nonce, bodyText, credentials.apiSecret),
      },
      body: bodyText,
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch {
    throw new BinancePayTransportError("Binance Pay is unreachable");
  }

  const payload = await response.json().catch(() => null) as unknown;
  if (!payload || typeof payload !== "object") throw new TRPCError({ code: "BAD_GATEWAY", message: "Binance Pay returned an invalid response" });
  const record = payload as Record<string, unknown>;
  if (!response.ok || record.status !== "SUCCESS" || record.code !== "000000") {
    throw new TRPCError({ code: "BAD_GATEWAY", message: responseError(record) });
  }
  return payload as BinancePayResponse<T>;
}

export function parseBinanceCreateOrderResponse(payload: unknown) {
  const root = asRecord(payload);
  if (root.status !== "SUCCESS" || root.code !== "000000") throw new Error(responseError(root));
  const data = asRecord(root.data);
  const prepayId = requiredText(data.prepayId, "prepay ID", 128);
  const expireTime = Number(data.expireTime);
  if (!Number.isSafeInteger(expireTime) || expireTime <= 0) throw new Error("Invalid Binance Pay expiry");
  const currency = requiredText(data.currency, "currency", 12).toUpperCase();
  const amount = Number(data.totalFee);
  const amountCents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(amountCents)) throw new Error("Invalid Binance Pay order amount");
  const checkoutUrl = safeHttpsUrl(data.checkoutUrl);
  const qrcodeLink = safeHttpsUrl(data.qrcodeLink);
  const universalUrl = safeHttpsUrl(data.universalUrl);
  const qrContent = optionalText(data.qrContent, 4096);
  const deeplink = optionalText(data.deeplink, 4096);
  if (!checkoutUrl && !qrcodeLink && !qrContent && !deeplink && !universalUrl) throw new Error("Invalid Binance Pay checkout response");
  return { prepayId, expireTime, currency, amountCents, checkoutUrl, qrcodeLink, qrContent, deeplink, universalUrl };
}

export function parseBinanceQueryOrderResponse(payload: unknown): BinanceAuthoritativeOrder {
  const root = asRecord(payload);
  if (root.status !== "SUCCESS" || root.code !== "000000") throw new Error(responseError(root));
  const data = asRecord(root.data);
  const merchantTradeNo = requiredText(data.merchantTradeNo, "merchant trade number", 64);
  const prepayId = requiredText(data.prepayId, "prepay ID", 128);
  const status = requiredText(data.status, "order status", 32).toUpperCase();
  const currency = requiredText(data.currency, "currency", 12).toUpperCase();
  const amount = Number(data.orderAmount);
  const amountCents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(amountCents)) throw new Error("Invalid Binance Pay order amount");
  const transactionId = optionalText(data.transactionId, 128) || "";
  return { merchantTradeNo, prepayId, transactionId, status, currency, amountCents };
}

export function assertFreshBinanceTimestamp(timestamp: string, now = Date.now()) {
  if (!/^\d{13}$/.test(timestamp)) throw new Error("Invalid Binance Pay timestamp");
  const parsed = Number(timestamp);
  if (!Number.isSafeInteger(parsed) || Math.abs(now - parsed) > WEBHOOK_MAX_SKEW_MS) throw new Error("Invalid Binance Pay timestamp window");
}

export function verifyWebhookWithPublicKey(input: { timestamp: string; nonce: string; signature: string; rawBody: string; publicKey: string }) {
  try {
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(`${input.timestamp}\n${input.nonce}\n${input.rawBody}\n`);
    verifier.end();
    return verifier.verify(input.publicKey, Buffer.from(input.signature, "base64"));
  } catch {
    return false;
  }
}

export function parseBinancePayWebhook(rawBody: string) {
  if (!rawBody || Buffer.byteLength(rawBody, "utf8") > WEBHOOK_MAX_BYTES) throw new Error("Invalid Binance Pay webhook body");
  try {
    const payload = asRecord(JSON.parse(rawBody));
    const bizType = requiredText(payload.bizType, "webhook type", 32);
    const bizStatus = requiredText(payload.bizStatus, "webhook status", 64);
    const bizId = optionalText(payload.bizId, 128);
    if (typeof payload.data !== "string") throw new Error();
    const data = asRecord(JSON.parse(payload.data));
    return { payload: { bizType, bizStatus, bizId }, data };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid Binance Pay")) throw error;
    throw new Error("Invalid Binance Pay webhook body");
  }
}

export function validateBinanceSettlementBinding(
  local: { merchantTradeNo: string; prepayId?: string; amountCents: number; currency: string },
  authoritative: BinanceAuthoritativeOrder,
) {
  if (authoritative.status !== "PAID") throw new Error("Binance Pay order is not paid");
  if (!authoritative.transactionId) throw new Error("Binance Pay transaction ID is missing");
  if (authoritative.merchantTradeNo !== local.merchantTradeNo) throw new Error("Binance Pay merchant order mismatch");
  if (local.prepayId && authoritative.prepayId !== local.prepayId) throw new Error("Binance Pay prepay ID mismatch");
  if (authoritative.amountCents !== local.amountCents) throw new Error("Binance Pay amount mismatch");
  if (authoritative.currency !== local.currency) throw new Error("Binance Pay currency mismatch");
  return authoritative;
}

export function isAllowedBinanceCurrency(currency: string): currency is BinancePayCurrency {
  return (ALLOWED_CURRENCIES as readonly string[]).includes(currency);
}

async function getBinanceCertificates(credentials: BinancePayCredentials, force = false) {
  const now = Date.now();
  const cacheKey = credentialCacheKey(credentials);
  if (!force && certificateCache?.cacheKey === cacheKey && certificateCache.expiresAt > now) return certificateCache.certs;
  const response = await binancePayPost<BinanceCertificate[]>("/binancepay/openapi/certificates", {}, credentials);
  const data = response.data;
  if (!Array.isArray(data) || !data.length) throw new TRPCError({ code: "BAD_GATEWAY", message: "Binance Pay returned no signing certificates" });
  const certs = data.map((item) => ({
    certSerial: requiredText(item?.certSerial, "certificate serial", 256),
    certPublic: requiredText(item?.certPublic, "certificate", 16_384),
  }));
  certificateCache = { cacheKey, certs, expiresAt: now + 60 * 60 * 1000 };
  return certs;
}

export async function verifyBinancePayCredentials(credentials: BinancePayCredentials) {
  const started = Date.now();
  await getBinanceCertificates(credentials, true);
  return { ok: true as const, latency: Date.now() - started };
}

export async function verifyBinancePayWebhookSignature(input: {
  timestamp?: string;
  nonce?: string;
  signature?: string;
  certificateSerial?: string;
  rawBody: string;
}) {
  if (!input.timestamp || !input.nonce || !input.signature || !input.certificateSerial) return false;
  assertFreshBinanceTimestamp(input.timestamp);
  const credentials = await loadBinancePayCredentials();
  let certs = await getBinanceCertificates(credentials);
  let cert = certs.find((item) => item.certSerial === input.certificateSerial);
  if (!cert) {
    certs = await getBinanceCertificates(credentials, true);
    cert = certs.find((item) => item.certSerial === input.certificateSerial);
  }
  if (!cert) return false;
  return verifyWebhookWithPublicKey({
    timestamp: input.timestamp,
    nonce: input.nonce,
    signature: input.signature,
    rawBody: input.rawBody,
    publicKey: cert.certPublic,
  });
}

export async function requestBinanceCreateOrder(body: Record<string, unknown>, credentials?: BinancePayCredentials) {
  const resolved = credentials ?? await loadBinancePayCredentials();
  return parseBinanceCreateOrderResponse(await binancePayPost("/binancepay/openapi/v3/order", body, resolved));
}

export async function queryBinancePayOrder(merchantTradeNo: string, credentials?: BinancePayCredentials) {
  const resolved = credentials ?? await loadBinancePayCredentials();
  return parseBinanceQueryOrderResponse(await binancePayPost("/binancepay/openapi/v2/order/query", { merchantTradeNo }, resolved));
}

export function resetBinanceCertificateCacheForTests() {
  certificateCache = undefined;
}

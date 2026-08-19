import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, adminQuery, authedQuery } from "../middleware";
import { connectDb } from "../queries/connection";
import { AuditLog, BinancePayOrder, BinancePayWebhookEvent, PaymentReferenceClaim, SiteSetting, cleanMany, nextId } from "../mongo/models";
import { protectCredential, requireEncryptedCredential } from "../lib/credential-security";
import { env } from "../lib/env";
import { runInTransaction } from "../services/wallet-ledger";
import {
  assertBinancePayCredential,
  loadBinancePayCredentials,
  resetBinancePayCertificateCache,
  verifyBinancePayCredentials,
} from "../services/binance-pay";
import {
  createBinancePayOrder,
  getOwnedBinancePayOrder,
  listOwnedBinancePayOrders,
  reconcileBinancePayOrders,
} from "../services/binance-pay-orders";

const IDENTITY_KEY = "binance_pay_api_identity_key";
const SECRET_KEY = "binance_pay_api_secret_key";
const ENABLED_KEY = "binance_pay_live_enabled";
const VERIFIED_AT_KEY = "binance_pay_credentials_verified_at";

async function assertFinancialIndexesReady() {
  const requirements: Array<[any, string[]]> = [
    [BinancePayOrder, ["clientRequestKey", "merchantTradeNo", "prepayId", "transactionId"]],
    [BinancePayWebhookEvent, ["eventDigest"]],
    [PaymentReferenceClaim, ["key"]],
  ];
  for (const [model, fields] of requirements) {
    const indexes = await model.collection.indexes();
    for (const field of fields) {
      const ready = indexes.some((index: any) => index.unique === true
        && Object.keys(index.key ?? {}).length === 1
        && index.key[field] === 1);
      if (!ready) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Required Binance Pay financial indexes are not ready" });
    }
  }
}

async function settingMap() {
  const rows = await SiteSetting.find({ key: { $in: [IDENTITY_KEY, SECRET_KEY, ENABLED_KEY, VERIFIED_AT_KEY] } }).select("key value").lean<any[]>();
  return new Map(rows.map((row) => [row.key, row.value]));
}

async function writeSettingsAtomically(values: Record<string, string>) {
  const keys = Object.keys(values);
  const existing = await SiteSetting.find({ key: { $in: keys } }).select("key id").lean<any[]>();
  const ids = new Map(existing.map((row) => [row.key, row.id]));
  for (const key of keys) if (!ids.has(key)) ids.set(key, await nextId("site_settings"));
  await runInTransaction(async (session) => {
    for (const key of keys) {
      await SiteSetting.updateOne(
        { key },
        { $set: { value: values[key] }, $setOnInsert: { id: ids.get(key), key } },
        { session, upsert: true },
      );
    }
  });
}

function webhookUrl() {
  if (!env.publicAppUrl) return "Not configured";
  try { return `${new URL(env.publicAppUrl).origin}/api/binance-pay/webhook`; } catch { return "Not configured"; }
}

function safeProbeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Binance Pay verification failed";
  const unreachable = /unreachable|timeout|network|fetch/i.test(message);
  return { status: unreachable ? "unreachable" as const : "rejected" as const, error: unreachable ? "Binance Pay is unreachable. Existing credentials were preserved." : "Binance rejected the merchant credentials. Existing credentials were preserved." };
}

export const binancePayRouter = createRouter({
  capability: authedQuery.query(async () => {
    await connectDb();
    const values = await settingMap();
    return { liveEnabled: values.get(ENABLED_KEY) === "true" && Boolean(values.get(IDENTITY_KEY) && values.get(SECRET_KEY)) };
  }),

  merchantStatus: adminQuery.query(async () => {
    await connectDb();
    const values = await settingMap();
    const configured = Boolean(values.get(IDENTITY_KEY) && values.get(SECRET_KEY));
    return {
      configured,
      identityKeyConfigured: Boolean(values.get(IDENTITY_KEY)),
      secretKeyConfigured: Boolean(values.get(SECRET_KEY)),
      liveEnabled: values.get(ENABLED_KEY) === "true",
      verifiedAt: values.get(VERIFIED_AT_KEY) || null,
      maskedIdentityKey: configured ? "••••••••" : null,
      maskedSecretKey: configured ? "••••••••" : null,
      webhookUrl: webhookUrl(),
    };
  }),

  credentialsSave: adminQuery
    .input(z.object({ apiKey: z.string().max(512), apiSecret: z.string().max(512) }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      let credentials: { apiKey: string; apiSecret: string };
      let encryptedKey: string;
      let encryptedSecret: string;
      try {
        credentials = {
          apiKey: assertBinancePayCredential(input.apiKey, "API Identity Key"),
          apiSecret: assertBinancePayCredential(input.apiSecret, "API Secret Key"),
        };
        encryptedKey = requireEncryptedCredential(protectCredential(credentials.apiKey));
        encryptedSecret = requireEncryptedCredential(protectCredential(credentials.apiSecret));
      } catch (error) {
        throw error instanceof TRPCError ? error : new TRPCError({ code: "PRECONDITION_FAILED", message: "Credential encryption is not configured" });
      }

      try {
        const probe = await verifyBinancePayCredentials(credentials);
        const verifiedAt = new Date().toISOString();
        await writeSettingsAtomically({ [IDENTITY_KEY]: encryptedKey, [SECRET_KEY]: encryptedSecret, [VERIFIED_AT_KEY]: verifiedAt });
        resetBinancePayCertificateCache();
        await AuditLog.create({
          id: await nextId("audit_logs"),
          actorId: ctx.user.id,
          action: "binance_pay_credentials_saved",
          entityType: "site_setting",
          metadata: { configured: true, latency: probe.latency },
        });
        return { saved: true, status: "healthy" as const, latency: probe.latency, verifiedAt, error: null, maskedIdentityKey: "••••••••", maskedSecretKey: "••••••••" };
      } catch (error) {
        const safe = safeProbeError(error);
        return { saved: false, ...safe, latency: 0, verifiedAt: null, maskedIdentityKey: null, maskedSecretKey: null };
      }
    }),

  credentialsVerify: adminQuery.mutation(async () => {
    await connectDb();
    try {
      const credentials = await loadBinancePayCredentials();
      const probe = await verifyBinancePayCredentials(credentials);
      const verifiedAt = new Date().toISOString();
      await writeSettingsAtomically({ [VERIFIED_AT_KEY]: verifiedAt });
      return { ok: true, status: "healthy" as const, latency: probe.latency, verifiedAt, error: null };
    } catch (error) {
      const safe = safeProbeError(error);
      return { ok: false, ...safe, latency: 0, verifiedAt: null };
    }
  }),

  liveToggle: adminQuery
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      if (input.enabled) {
        await assertFinancialIndexesReady();
        const credentials = await loadBinancePayCredentials();
        await verifyBinancePayCredentials(credentials);
      }
      await writeSettingsAtomically({ [ENABLED_KEY]: String(input.enabled), ...(input.enabled ? { [VERIFIED_AT_KEY]: new Date().toISOString() } : {}) });
      await AuditLog.create({
        id: await nextId("audit_logs"), actorId: ctx.user.id, action: "binance_pay_live_toggled", entityType: "site_setting", metadata: { enabled: input.enabled },
      });
      return { liveEnabled: input.enabled };
    }),

  orderCreate: authedQuery
    .input(z.object({ amount: z.number().positive().max(5000), currency: z.literal("USDT"), clientRequestKey: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      return createBinancePayOrder({ userId: ctx.user.id, ...input });
    }),

  orderGet: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await connectDb();
      return getOwnedBinancePayOrder(ctx.user.id, input.id);
    }),

  orderList: authedQuery.query(async ({ ctx }) => {
    await connectDb();
    return listOwnedBinancePayOrders(ctx.user.id);
  }),

  adminOrders: adminQuery.query(async () => {
    await connectDb();
    return cleanMany(await BinancePayOrder.find().sort({ createdAt: -1 }).limit(100).select("-clientRequestKey -createError").lean());
  }),

  reconcileNow: adminQuery.mutation(async () => {
    await connectDb();
    return reconcileBinancePayOrders(20);
  }),
});

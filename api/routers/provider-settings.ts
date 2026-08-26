import { z } from "zod";
import { createRouter, adminQuery } from "../middleware";
import { connectDb } from "../queries/connection";
import { AuditLog, SiteSetting, nextId } from "../mongo/models";
import {
  protectCredential,
  requireEncryptedCredential,
  revealCredential,
} from "../lib/credential-security";
import {
  normalizeProviderApiKeyInput,
  PROVIDER_PROBE_TIMEOUT_MS,
  providerFetchFailureMessage,
  runProviderNetworkProbe,
  type ProviderNetworkName,
} from "../lib/provider-network-error";

/* ── Provider wallet probe ───────────────────────────────── */

type ProviderWalletConfig = {
  url: string;
  auth: { type: "header"; name: string; prefix?: string } | { type: "query"; name: string };
};

const PROVIDER_WALLET_URLS: Record<ProviderNetworkName, ProviderWalletConfig> = {
  technysoft: {
    url: "https://api.technysoft.com/v1/me",
    auth: { type: "header", name: "X-API-Key" },
  },
  canboso: {
    url: "https://canboso.com/api/v2/telegram-buyer/balance",
    auth: { type: "query", name: "key" },
  },
  akunding: {
    url: "https://akunding.shop/api/v1/me",
    auth: { type: "header", name: "Authorization", prefix: "Bearer " },
  },
  zoomstore: {
    url: "https://api.zoomstore255.com/api/v1/balance",
    auth: { type: "header", name: "X-API-Key" },
  },
  ssondigital: {
    url: "https://ssondigitalworks.online/api/reseller?action=balance",
    auth: { type: "header", name: "X-API-Key" },
  },
};

export async function fetchProviderWallet(provider: ProviderNetworkName, apiKey: string) {
  const start = Date.now();
  const config = PROVIDER_WALLET_URLS[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  const headers: Record<string, string> = { Accept: "application/json" };
  let url = config.url;
  if (config.auth.type === "header") {
    headers[config.auth.name] = `${config.auth.prefix || ""}${apiKey}`;
  } else {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set(config.auth.name, apiKey);
    url = parsedUrl.toString();
  }

  let res: Response;
  try {
    res = await runProviderNetworkProbe(() => fetch(url, {
      headers,
      signal: AbortSignal.timeout(PROVIDER_PROBE_TIMEOUT_MS),
    }));
  } catch (error) {
    return {
      ok: false,
      error: providerFetchFailureMessage(provider, error),
      latency: Date.now() - start,
    };
  }
  const latency = Date.now() - start;
  const body = await res.json().catch(() => null) as Record<string, any> | null;

  if (!res.ok) {
    let msg = "";
    if (provider === "technysoft") {
      msg = body?.error?.message_en || body?.error?.message_ar || `HTTP ${res.status}`;
    } else if (provider === "akunding") {
      msg = body?.detail || body?.message || `HTTP ${res.status}`;
    } else {
      msg = body?.message || body?.detail || body?.error || `HTTP ${res.status}`;
    }
    return { ok: false, error: msg, latency };
  }

  // Parse balance per-provider
  let balance: number | null = null;
  let currency = "USD";

  if (provider === "technysoft") {
    balance = typeof body?.balance === "number" ? body.balance : Number.parseFloat(body?.balance);
    currency = body?.currency || "USD";
  } else if (provider === "canboso") {
    balance = typeof body?.balanceUsd === "number" ? body.balanceUsd
      : typeof body?.balance === "number" ? body.balance
      : Number.parseFloat(body?.balanceUsd || body?.balance);
    if (body?.balanceVnd && (!balance || balance <= 0)) {
      balance = Number.parseFloat(body.balanceVnd);
      currency = "VND";
    }
  } else if (provider === "akunding") {
    balance = typeof body?.balance === "number" ? body.balance : Number.parseFloat(body?.balance);
    currency = body?.currency || "RMB";
  } else if (provider === "zoomstore") {
    balance = typeof body?.balance === "number" ? body.balance : Number.parseFloat(body?.balance);
    currency = body?.currency || "USD";
  } else if (provider === "ssondigital") {
    balance = typeof body?.reseller?.balance === "number"
      ? body.reseller.balance
      : Number.parseFloat(body?.reseller?.balance);
    currency = "USDT";
  }

  return {
    ok: true,
    balance: Number.isFinite(balance) ? Math.round((balance as number) * 100) / 100 : null,
    currency,
    raw: body,
    latency,
  };
}

/* ── Router ──────────────────────────────────────────────── */

export const providerSettingsRouter = createRouter({
  /* Save an API key + verify live */
  providerKeySave: adminQuery
    .input(
      z.object({
        provider: z.enum(["technysoft", "canboso", "akunding", "zoomstore", "ssondigital"]),
        apiKey: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      let apiKey: string;
      try {
        apiKey = normalizeProviderApiKeyInput(input.apiKey);
      } catch (error) {
        return {
          saved: false,
          wallet: null,
          error: `${error instanceof Error ? error.message : "Invalid API key input"} The new key was not saved.`,
          latency: 0,
        };
      }
      const encrypted = requireEncryptedCredential(protectCredential(apiKey));

      // Verify the normalized key first
      const wallet = await fetchProviderWallet(input.provider, apiKey);
      if (!wallet.ok) {
        return {
          saved: false,
          wallet: null,
          error: `${wallet.error || "Verification failed"} The new key was not saved.`,
          latency: wallet.latency,
        };
      }

      // Save to site_settings
      const settingKey = `${input.provider}_api_key`;

      const existing = await SiteSetting.findOne({ key: settingKey }).lean();
      if (existing) {
        await SiteSetting.updateOne({ key: settingKey }, { $set: { value: encrypted } });
      } else {
        await SiteSetting.create({ id: await nextId("site_settings"), key: settingKey, value: encrypted });
      }
      await AuditLog.create({
        id: await nextId("audit_logs"),
        actorId: ctx.user.id,
        action: "provider_api_key_saved",
        entityType: "site_setting",
        metadata: {
          provider: input.provider,
          settingKey,
          latency: wallet.latency,
          walletCurrency: wallet.currency,
        },
      });

      return {
        saved: true,
        wallet: {
          balance: wallet.balance,
          currency: wallet.currency,
        },
        error: null,
        latency: wallet.latency,
      };
    }),

  /* Read-only check — probe wallet without saving */
  providerKeyVerify: adminQuery
    .input(
      z.object({
        provider: z.enum(["technysoft", "canboso", "akunding", "zoomstore", "ssondigital"]),
        apiKey: z.string().min(1),
      }),
    )
    .query(async ({ input }) => {
      let apiKey: string;
      try {
        apiKey = normalizeProviderApiKeyInput(input.apiKey);
      } catch (error) {
        return {
          ok: false,
          balance: null,
          currency: null,
          latency: 0,
          error: error instanceof Error ? error.message : "Invalid API key input",
        };
      }
      const wallet = await fetchProviderWallet(input.provider, apiKey);
      return {
        ok: wallet.ok,
        balance: wallet.balance,
        currency: wallet.currency,
        latency: wallet.latency,
        error: wallet.ok ? null : wallet.error,
      };
    }),

  /* Fetch wallet balance using saved key */
  providerWallet: adminQuery
    .input(z.object({ provider: z.enum(["technysoft", "canboso", "akunding", "zoomstore", "ssondigital"]) }))
    .query(async ({ input }) => {
      await connectDb();
      const settingKey = `${input.provider}_api_key`;
      const setting = await SiteSetting.findOne({ key: settingKey }).lean() as any;
      if (!setting?.value) {
        return { ok: false, balance: null, currency: null, latency: 0, error: "No saved API key" };
      }
      const apiKey = revealCredential(setting.value) || setting.value;
      const wallet = await fetchProviderWallet(input.provider, apiKey);
      return {
        ok: wallet.ok,
        balance: wallet.balance,
        currency: wallet.currency,
        latency: wallet.latency,
        error: wallet.ok ? null : wallet.error,
      };
    }),
});

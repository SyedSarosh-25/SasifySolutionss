import type { Context, Next } from "hono";
import { env } from "./env";

type WindowState = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, WindowState>();

function clientIp(c: Context) {
  if (env.trustProxy) {
    const forwardedFor = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
    return forwardedFor || c.req.header("x-real-ip") || "unknown";
  }
  const bindings = c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined;
  return bindings?.incoming?.socket?.remoteAddress || "unknown";
}

function isLocalhost(host: string) {
  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
}

function sameOrigin(origin: string, host: string) {
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  current.count += 1;
  return current.count <= limit;
}

function ratePlan(path: string) {
  if (path === "/api/easypaisa/webhook") return { limit: 60, windowMs: 60 * 1000 };
  if (path === "/api/wallet/verify-easypaisa") return { limit: 20, windowMs: 10 * 60 * 1000 };
  if (path === "/api/nayapay/email-webhook") return { limit: 60, windowMs: 60 * 1000 };
  if (path === "/api/binance-pay/webhook") return { limit: 120, windowMs: 60 * 1000 };
  if (path === "/api/binance-pay/create-order") return { limit: 20, windowMs: 10 * 60 * 1000 };
  if (path.includes("auth.login")) return { limit: 30, windowMs: 60 * 1000 };
  if (path.includes("auth.register")) return { limit: 10, windowMs: 60 * 60 * 1000 };
  if (path.includes("referral.validateCode")) return { limit: 30, windowMs: 60 * 1000 };
  if (path.includes("referral.dashboard") || path.includes("referral.sync")) return { limit: 30, windowMs: 60 * 1000 };
  if (path.includes("wallet.depositCreate")) return { limit: 20, windowMs: 10 * 60 * 1000 };
  if (path.includes("admin.depositApprove") || path.includes("admin.depositReject")) {
    return { limit: 60, windowMs: 60 * 1000 };
  }
  return { limit: 300, windowMs: 60 * 1000 };
}

export async function securityMiddleware(c: Context, next: Next) {
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  c.header("Cross-Origin-Opener-Policy", "same-origin");

  const method = c.req.method.toUpperCase();
  const webhookAllowsMissingOrigin = c.req.path === "/api/easypaisa/webhook" || c.req.path === "/api/nayapay/email-webhook" || c.req.path === "/api/binance-pay/webhook";
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const host = c.req.header("host") || "";
    const origin = c.req.header("origin");
    if (!webhookAllowsMissingOrigin && !isLocalhost(host) && (!origin || !sameOrigin(origin, host))) {
      return c.json({ error: "Invalid request origin" }, 403);
    }
  }

  if (c.req.path.startsWith("/api/trpc/") || c.req.path === "/api/easypaisa/webhook" || c.req.path === "/api/wallet/verify-easypaisa" || c.req.path === "/api/nayapay/email-webhook" || c.req.path === "/api/binance-pay/webhook" || c.req.path === "/api/binance-pay/create-order") {
    const host = c.req.header("host") || "";
    if (isLocalhost(host)) {
      return next();
    }

    const plan = ratePlan(c.req.path);
    const key = `${clientIp(c)}:${c.req.path}`;
    if (!checkRateLimit(key, plan.limit, plan.windowMs)) {
      return c.json({ error: "Too many requests" }, 429);
    }
  }

  return next();
}

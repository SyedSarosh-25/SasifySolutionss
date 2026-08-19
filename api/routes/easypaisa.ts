import { Hono } from "hono";
import { z } from "zod";
import { env } from "../lib/env";
import { connectDb } from "../queries/connection";
import { saveEasyPaisaWebhook } from "../services/easypaisa";

const webhookInput = z.object({
  message: z.string().trim().min(1).max(4000),
  source: z.string().trim().max(120).optional(),
  secret: z.string().min(1),
});

export const easypaisaRoutes = new Hono();

easypaisaRoutes.post("/api/easypaisa/webhook", async (c) => {
  if (!env.webhookSecret) {
    console.error("[easypaisa] WEBHOOK_SECRET is not configured");
    return c.json({ ok: false, error: "Webhook is not configured" }, 503);
  }

  const parsed = webhookInput.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    console.warn("[easypaisa] invalid webhook payload", parsed.error.flatten().fieldErrors);
    return c.json({ ok: false, error: "Invalid webhook payload" }, 400);
  }
  if (parsed.data.secret !== env.webhookSecret) {
    console.warn("[easypaisa] rejected webhook with invalid secret");
    return c.json({ ok: false, error: "Unauthorized" }, 401);
  }

  await connectDb();
  const result = await saveEasyPaisaWebhook({
    message: parsed.data.message,
    source: parsed.data.source,
  });

  return c.json({ ok: true, ...result });
});

easypaisaRoutes.post("/api/wallet/verify-easypaisa", async (c) => {
  return c.json({
    ok: false,
    error: "EasyPaisa auto verification is disabled. Submit a manual deposit request with TRX ID and payment screenshot.",
  }, 410);
});

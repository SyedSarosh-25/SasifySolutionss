import { Hono } from "hono";
import { z } from "zod";
import { env } from "../lib/env";
import { connectDb } from "../queries/connection";
import { saveNayaPayEmail } from "../services/nayapay";

const emailInput = z.object({
  subject: z.string().trim().max(500).optional(),
  text: z.string().trim().max(1_000_000).optional(),
  html: z.string().trim().max(1_000_000).optional(),
  message: z.string().trim().max(1_000_000).optional(),
  source: z.string().trim().max(120).optional(),
  secret: z.string().min(1),
});

export const nayapayRoutes = new Hono();

function htmlToText(html?: string) {
  if (!html) return undefined;
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

nayapayRoutes.post("/api/nayapay/email-webhook", async (c) => {
  if (!env.webhookSecret) {
    console.error("[nayapay] WEBHOOK_SECRET is not configured");
    return c.json({ ok: false, error: "Webhook is not configured" }, 503);
  }

  const parsed = emailInput.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    console.warn("[nayapay] invalid email webhook payload", parsed.error.flatten().fieldErrors);
    return c.json({ ok: false, error: "Invalid email webhook payload" }, 400);
  }
  if (parsed.data.secret !== env.webhookSecret) {
    console.warn("[nayapay] rejected email webhook with invalid secret");
    return c.json({ ok: false, error: "Unauthorized" }, 401);
  }

  const message = [parsed.data.subject, parsed.data.text, parsed.data.message, htmlToText(parsed.data.html)]
    .filter(Boolean)
    .join("\n");
  if (!message.trim()) {
    return c.json({ ok: false, error: "Email text is required" }, 400);
  }

  await connectDb();
  const result = await saveNayaPayEmail({
    message,
    source: parsed.data.source,
  });

  return c.json({ ok: true, ...result });
});

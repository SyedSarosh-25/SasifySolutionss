import { Hono } from "hono";
import { verifyBinancePayWebhookSignature } from "../services/binance-pay";
import { processBinancePayWebhook } from "../services/binance-pay-orders";

export const binancePayRoutes = new Hono();

// Merchant order creation is authenticated through tRPC. Keep this legacy
// unauthenticated route closed so callers cannot create orders for arbitrary users.
binancePayRoutes.post("/api/binance-pay/create-order", (c) => c.json({ ok: false, error: "Use the authenticated wallet checkout." }, 410));

binancePayRoutes.post("/api/binance-pay/webhook", async (c) => {
  const rawBody = await c.req.text().catch(() => "");
  if (!rawBody || Buffer.byteLength(rawBody, "utf8") > 256 * 1024) {
    return c.json({ returnCode: "FAIL", returnMessage: "Invalid request" }, 400);
  }

  const timestamp = c.req.header("binancepay-timestamp");
  const nonce = c.req.header("binancepay-nonce");
  const signature = c.req.header("binancepay-signature");
  const certificateSerial = c.req.header("binancepay-certificate-sn");
  try {
    const verified = await verifyBinancePayWebhookSignature({ timestamp, nonce, signature, certificateSerial, rawBody });
    if (!verified || !signature || !certificateSerial) {
      return c.json({ returnCode: "FAIL", returnMessage: "Invalid signature" }, 401);
    }
    await processBinancePayWebhook({ rawBody, signature, certificateSerial });
    return c.json({ returnCode: "SUCCESS", returnMessage: null });
  } catch {
    return c.json({ returnCode: "FAIL", returnMessage: "Processing failed" }, 400);
  }
});

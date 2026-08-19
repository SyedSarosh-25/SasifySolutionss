import { z } from "zod";
import { getProviderApiKey } from "../lib/provider-keys";

const baseUrl = "https://akunding.shop/api";

const bulkTierSchema = z.object({
  min_qty: z.number(),
  unit_price: z.number(),
}).passthrough();

const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional().nullable(),
  features: z.string().optional().nullable(),
  unit_label: z.string().optional().nullable(),
  base_price: z.number(),
  stock: z.number().optional().nullable(),
  bulk_tiers: z.array(bulkTierSchema).optional().nullable().transform((value) => value ?? []),
}).passthrough();

const itemSchema = z.object({}).passthrough();

const orderResponseSchema = z.object({}).passthrough();

export type AkundingProduct = z.infer<typeof productSchema>;
export type AkundingOrderResponse = z.infer<typeof orderResponseSchema>;

async function headers(extra?: Record<string, string>) {
  const apiKey = await getProviderApiKey("akunding");
  if (!apiKey) {
    throw new Error("Akunding API key is not configured");
  }
  return {
    "Authorization": `Bearer ${apiKey}`,
    "Accept": "application/json",
    ...extra,
  };
}

async function parseJsonResponse(response: Response) {
  const body = await response.json().catch(() => null) as Record<string, any> | null;
  if (!response.ok) {
    const message = body?.detail || body?.message || body?.error?.message || body?.error || `Akunding request failed with ${response.status}`;
    const wrapped = new Error(Array.isArray(message) ? "Akunding validation failed." : String(message)) as Error & { code?: string; status?: number; details?: unknown };
    wrapped.code = body?.code || body?.error?.code;
    wrapped.status = response.status;
    wrapped.details = body;
    throw wrapped;
  }
  return body;
}

export function normalizeAkundingProduct(product: AkundingProduct) {
  return {
    id: product.id,
    slug: `akunding-${product.id}`,
    name: product.name,
    categoryName: product.unit_label || "Akunding",
    categoryId: product.unit_label || "akunding",
    description: product.description || product.features || "",
    stock: product.stock ?? 0,
    unlimited: false,
    instant: true,
    activationUrl: "",
    priceUsd: product.base_price,
    bulkTiers: product.bulk_tiers.map((tier) => ({
      minQty: tier.min_qty,
      unitPrice: tier.unit_price,
    })),
  };
}

export function calculateAkundingPrice(product: AkundingProduct, quantity: number) {
  const tiers = [...product.bulk_tiers].sort((a, b) => b.min_qty - a.min_qty);
  const tier = tiers.find((item) => quantity >= item.min_qty);
  const unitPrice = tier?.unit_price ?? product.base_price;
  return Math.round(unitPrice * quantity * 100) / 100;
}

function readExplicitAkundingUsdCost(data: Record<string, any>) {
  const candidates = [
    data.total_price_usd,
    data.totalPriceUsd,
    data.price_usd,
    data.priceUsd,
  ];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return undefined;
}

export function summarizeAkundingOrder(response: AkundingOrderResponse) {
  const data = (response.data || response.order || response) as Record<string, any>;
  const rawItems = data.items || data.codes || data.credentials || data.units || data.delivered_items || [];
  const items = Array.isArray(rawItems)
    ? rawItems.map((item) => typeof item === "string" ? { type: "text", content: item } : itemSchema.parse(item))
    : typeof rawItems === "string"
      ? [{ type: "text", content: rawItems }]
      : [];
  const rawStatus = String(data.status || response.status || (items.length > 0 ? "delivered" : "processing")).toLowerCase();
  const status = rawStatus.includes("deliver") || rawStatus.includes("complete") || rawStatus.includes("success")
    ? "delivered"
    : rawStatus.includes("refund")
      ? "refunded"
      : rawStatus.includes("cancel")
        ? "cancelled"
        : rawStatus.includes("fail") || rawStatus.includes("reject") || rawStatus.includes("error") || rawStatus.includes("declin")
          ? "failed"
        : "processing";
  return {
    externalOrderId: Number(data.id || data.order_id || data.external_order_id || 0) || undefined,
    status,
    items,
    priceUsd: readExplicitAkundingUsdCost(data),
    raw: response,
  };
}

export async function listAkundingProducts() {
  const response = await fetch(`${baseUrl}/v1/products`, { headers: await headers() });
  return z.array(productSchema).parse(await parseJsonResponse(response));
}

export async function getAkundingProduct(productId: number) {
  const response = await fetch(`${baseUrl}/v1/products/${productId}`, { headers: await headers() });
  return productSchema.parse(await parseJsonResponse(response));
}

export async function createAkundingOrder(input: {
  productId: number;
  quantity: number;
  idempotencyKey: string;
}) {
  const response = await fetch(`${baseUrl}/v1/orders`, {
    method: "POST",
    headers: await headers({
      "Content-Type": "application/json",
      "X-Idempotency-Key": input.idempotencyKey,
    }),
    body: JSON.stringify({
      product_id: input.productId,
      quantity: input.quantity,
    }),
  });
  return orderResponseSchema.parse(await parseJsonResponse(response));
}

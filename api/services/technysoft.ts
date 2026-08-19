import { z } from "zod";
import { getProviderApiKey } from "../lib/provider-keys";

const baseUrl = "https://api.technysoft.com";

const categorySchema = z.object({
  id: z.number(),
  name_ar: z.string().optional().nullable(),
  name_en: z.string().optional().nullable(),
}).passthrough();

const bulkTierSchema = z.object({
  min_qty: z.number(),
  unit_price: z.number(),
}).passthrough();

const productSchema = z.object({
  id: z.number(),
  category: categorySchema.optional().nullable(),
  name_ar: z.string().optional().nullable(),
  name_en: z.string().optional().nullable(),
  description_ar: z.string().optional().nullable(),
  description_en: z.string().optional().nullable(),
  stock: z.number().optional().nullable(),
  unlimited: z.boolean().optional().nullable(),
  instant: z.boolean().optional().nullable(),
  activation_url: z.string().url().optional().nullable(),
  price_usd: z.number(),
  bulk_tiers: z.array(bulkTierSchema).nullable().optional().transform((value) => value ?? []),
}).passthrough();

const itemSchema = z.object({
  type: z.string(),
  content: z.string().optional(),
  note_en: z.string().optional(),
  note_ar: z.string().optional(),
}).passthrough();

export function normalizeTechnysoftOrderStatus(status: unknown): "processing" | "delivered" | "refunded" | "cancelled" | "failed" {
  const normalized = String(status || "").trim().toLowerCase();
  if (["delivered", "completed", "success", "successful"].includes(normalized)) return "delivered";
  if (["refunded", "refund"].includes(normalized)) return "refunded";
  if (["cancelled", "canceled"].includes(normalized)) return "cancelled";
  if (["failed", "rejected", "declined", "error"].includes(normalized)) return "failed";
  return "processing";
}

const orderSchema = z.object({
  id: z.number(),
  via: z.string().optional(),
  product_id: z.number(),
  product_name_ar: z.string().optional().nullable(),
  product_name_en: z.string().optional().nullable(),
  quantity: z.number(),
  price_usd: z.number(),
  status: z.unknown().transform(normalizeTechnysoftOrderStatus),
  created_at: z.string(),
  delivered_at: z.string().optional().nullable(),
  items: z.array(itemSchema).optional().default([]),
  activation_url: z.string().url().optional().nullable(),
}).passthrough();

const productListResponseSchema = z.union([
  z.array(productSchema),
  z.object({ data: z.array(productSchema) }).passthrough(),
  z.object({ products: z.array(productSchema) }).passthrough(),
]);

const buyResponseSchema = z.object({
  order: orderSchema,
  idempotent_replay: z.boolean().optional().default(false),
}).passthrough();

const orderListResponseSchema = z.object({
  total: z.number(),
  orders: z.array(orderSchema),
}).passthrough();

export type TechnysoftProduct = z.infer<typeof productSchema>;
export type TechnysoftOrderResponse = z.infer<typeof orderSchema>;

async function headers(extra?: Record<string, string>) {
  const apiKey = await getProviderApiKey("technysoft");
  if (!apiKey) {
    throw new Error("Technysoft API key is not configured");
  }
  return {
    "X-API-Key": apiKey,
    "Accept": "application/json",
    ...extra,
  };
}

async function parseJsonResponse(response: Response) {
  const body = await response.json().catch(() => null) as {
    error?: {
      code?: string;
      message_en?: string;
      message_ar?: string;
    };
  } | null;
  if (!response.ok) {
    const error = body?.error;
    const message = error?.message_en || error?.message_ar || error?.code || `Technysoft request failed with ${response.status}`;
    const wrapped = new Error(message) as Error & { code?: string; status?: number; details?: unknown };
    wrapped.code = error?.code;
    wrapped.status = response.status;
    wrapped.details = body;
    throw wrapped;
  }
  return body;
}

function unwrapProducts(parsed: z.infer<typeof productListResponseSchema>) {
  return (Array.isArray(parsed)
    ? parsed
    : "data" in parsed
      ? parsed.data
      : parsed.products) as TechnysoftProduct[];
}

export function normalizeTechnysoftProduct(product: TechnysoftProduct) {
  return {
    id: product.id,
    slug: `technysoft-${product.id}`,
    name: product.name_en || product.name_ar || `Product #${product.id}`,
    nameAr: product.name_ar ?? "",
    categoryName: product.category?.name_en || product.category?.name_ar || "Technysoft",
    categoryNameAr: product.category?.name_ar ?? "",
    categoryId: product.category?.id ?? null,
    description: product.description_en || product.description_ar || "",
    descriptionAr: product.description_ar ?? "",
    stock: product.stock ?? 0,
    unlimited: product.unlimited ?? false,
    instant: product.instant ?? false,
    activationUrl: product.activation_url ?? "",
    priceUsd: product.price_usd,
    bulkTiers: product.bulk_tiers.map((tier) => ({
      minQty: tier.min_qty,
      unitPrice: tier.unit_price,
    })),
  };
}

export function calculateTechnysoftPrice(product: TechnysoftProduct, quantity: number) {
  const tiers = [...product.bulk_tiers].sort((a, b) => b.min_qty - a.min_qty);
  const tier = tiers.find((item) => quantity >= item.min_qty);
  const unitPrice = tier?.unit_price ?? product.price_usd;
  return Math.round(unitPrice * quantity * 100) / 100;
}

export async function listTechnysoftProducts() {
  const response = await fetch(`${baseUrl}/v1/products`, { headers: await headers() });
  const parsed = productListResponseSchema.parse(await parseJsonResponse(response));
  return unwrapProducts(parsed);
}

export async function getTechnysoftProduct(productId: number) {
  const response = await fetch(`${baseUrl}/v1/products/${productId}`, { headers: await headers() });
  return productSchema.parse(await parseJsonResponse(response));
}

export async function buyTechnysoftProduct(input: {
  productId: number;
  quantity: number;
  idempotencyKey: string;
}) {
  const response = await fetch(`${baseUrl}/v1/buy`, {
    method: "POST",
    headers: await headers({
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    }),
    body: JSON.stringify({
      product_id: input.productId,
      quantity: input.quantity,
    }),
  });
  return buyResponseSchema.parse(await parseJsonResponse(response));
}

export async function listTechnysoftOrders(input?: { limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (input?.limit) params.set("limit", String(input.limit));
  if (input?.offset) params.set("offset", String(input.offset));
  const query = params.toString();
  const response = await fetch(`${baseUrl}/v1/orders${query ? `?${query}` : ""}`, { headers: await headers() });
  return orderListResponseSchema.parse(await parseJsonResponse(response));
}

export async function getTechnysoftOrder(orderId: number) {
  const response = await fetch(`${baseUrl}/v1/orders/${orderId}`, { headers: await headers() });
  return orderSchema.parse(await parseJsonResponse(response));
}

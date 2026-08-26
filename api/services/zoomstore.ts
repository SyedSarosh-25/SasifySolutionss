import { z } from "zod";
import { getProviderApiKey } from "../lib/provider-keys";

const baseUrl = "https://api.zoomstore255.com/api/v1";

const productSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string(),
  description: z.string().optional().nullable(),
  price: z.number(),
  stock: z.number().optional().nullable(),
  in_stock: z.boolean().optional().nullable(),
}).passthrough();

const productListSchema = z.object({
  products: z.array(productSchema),
}).passthrough();

const purchaseSchema = z.object({}).passthrough();

export type ZoomStoreProduct = z.infer<typeof productSchema>;
export type ZoomStorePurchaseResponse = z.infer<typeof purchaseSchema>;

async function apiKey() {
  const value = await getProviderApiKey("zoomstore");
  if (!value) throw new Error("ZoomStore API key is not configured");
  return value;
}

async function requestHeaders(extra?: Record<string, string>) {
  return { Accept: "application/json", "X-API-Key": await apiKey(), ...extra };
}

async function parseResponse(response: Response) {
  const body = await response.json().catch(() => null) as Record<string, any> | null;
  if (!response.ok) {
    const error = new Error(String(body?.message || body?.detail || body?.error || `ZoomStore request failed with ${response.status}`)) as Error & { code?: string; status?: number };
    error.code = body?.code;
    error.status = response.status;
    throw error;
  }
  return body;
}

export function normalizeZoomStoreProduct(product: ZoomStoreProduct) {
  const stock = Math.max(0, Number(product.stock || 0));
  return {
    id: product.id,
    slug: `zoomstore-${product.id}`,
    name: product.name,
    categoryName: "ZoomStore",
    categoryId: "zoomstore",
    description: product.description || "",
    stock,
    unlimited: false,
    instant: product.in_stock !== false,
    activationUrl: "",
    priceUsd: product.price,
    bulkTiers: [] as Array<{ minQty: number; unitPrice: number }>,
  };
}

export function calculateZoomStorePrice(product: ZoomStoreProduct, quantity: number) {
  return Math.round(product.price * quantity * 100) / 100;
}

export async function listZoomStoreProducts(): Promise<ZoomStoreProduct[]> {
  const response = await fetch(`${baseUrl}/products`, { headers: await requestHeaders() });
  return productListSchema.parse(await parseResponse(response)).products;
}

export async function getZoomStoreProduct(productId: string) {
  const products = await listZoomStoreProducts();
  const product = products.find((item) => item.id === productId);
  if (!product) throw new Error("ZoomStore product not found.");
  return product;
}

function sanitizeCode(item: unknown) {
  if (typeof item === "string") return { type: "text", content: item };
  if (item && typeof item === "object") return { type: "text", content: JSON.stringify(item) };
  return { type: "text", content: String(item) };
}

export function summarizeZoomStorePurchase(response: ZoomStorePurchaseResponse) {
  const codes = Array.isArray(response.codes) ? response.codes.map(sanitizeCode) : [];
  return {
    externalOrderId: String(response.order_id || response.orderId || ""),
    status: response.success === true && codes.length > 0 ? "delivered" as const : "processing" as const,
    items: codes,
    priceUsd: undefined,
    raw: response,
  };
}

export async function purchaseZoomStoreProduct(input: { productId: string; quantity: number; idempotencyKey: string }) {
  const response = await fetch(`${baseUrl}/purchase`, {
    method: "POST",
    headers: await requestHeaders({ "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey }),
    body: JSON.stringify({ product_id: input.productId, quantity: input.quantity }),
  });
  return purchaseSchema.parse(await parseResponse(response));
}

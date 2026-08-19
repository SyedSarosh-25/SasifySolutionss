import { z } from "zod";
import { getProviderApiKey } from "../lib/provider-keys";

const baseUrl = "https://canboso.com";

const statsSchema = z.object({
  total: z.number().optional().nullable(),
  sold: z.number().optional().nullable(),
  available: z.number().optional().nullable(),
}).passthrough().optional().nullable();

const productSchema = z.object({
  _id: z.string(),
  product_name: z.string().optional().nullable(),
  product_name_raw: z.string().optional().nullable(),
  emoji: z.string().optional().nullable(),
  usdPricing: z.number().optional().nullable(),
  walletPricing: z.number().optional().nullable(),
  walletCurrency: z.string().optional().nullable(),
  walletPricingText: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  description_raw: z.string().optional().nullable(),
  slotProductType: z.string().optional().nullable(),
  warrantyType: z.string().optional().nullable(),
  warrantyDays: z.number().optional().nullable(),
  stats: statsSchema,
}).passthrough();

const productListResponseSchema = z.union([
  z.array(productSchema),
  z.object({ data: z.array(productSchema) }).passthrough(),
  z.object({ products: z.array(productSchema) }).passthrough(),
]);

const purchaseResponseSchema = z.object({}).passthrough();

export type CanbosoProduct = z.infer<typeof productSchema>;
export type CanbosoPurchaseResponse = z.infer<typeof purchaseResponseSchema>;

async function headers(extra?: Record<string, string>) {
  const apiKey = await getProviderApiKey("canboso");
  if (!apiKey) {
    throw new Error("Canboso API key is not configured");
  }
  return {
    "X-API-Key": apiKey,
    "Accept": "application/json",
    ...extra,
  };
}

async function parseJsonResponse(response: Response) {
  const body = await response.json().catch(() => null) as Record<string, any> | null;
  if (!response.ok) {
    const message = body?.message || body?.error?.message || body?.error || `Canboso request failed with ${response.status}`;
    const wrapped = new Error(String(message)) as Error & { code?: string; status?: number; details?: unknown };
    wrapped.code = body?.code || body?.error?.code;
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
      : parsed.products) as CanbosoProduct[];
}

export function normalizeCanbosoProduct(product: CanbosoProduct) {
  const price = product.walletPricing ?? product.usdPricing ?? 0;
  const available = product.stats?.available ?? 0;
  const total = product.stats?.total ?? available;
  return {
    id: product._id,
    slug: `canboso-${product._id}`,
    name: product.product_name || product.product_name_raw || `Canboso product ${product._id}`,
    categoryName: product.slotProductType || "Canboso",
    categoryId: product.slotProductType || "canboso",
    description: product.description || product.description_raw || "",
    stock: available,
    totalStock: total,
    unlimited: total === 0 && available === 0 ? false : available > 9999,
    instant: true,
    activationUrl: "",
    priceUsd: price,
    walletCurrency: product.walletCurrency || "USD",
    walletPricingText: product.walletPricingText || `$${price.toFixed(2)}`,
    bulkTiers: [] as Array<{ minQty: number; unitPrice: number }>,
    emoji: product.emoji ?? "",
    warranty: product.warrantyDays ? `${product.warrantyDays} day warranty` : product.warrantyType || "",
  };
}

export function calculateCanbosoPrice(product: CanbosoProduct, quantity: number) {
  const unitPrice = product.walletPricing ?? product.usdPricing ?? 0;
  return Math.round(unitPrice * quantity * 100) / 100;
}

function readExplicitCanbosoUsdCost(data: Record<string, any>) {
  const candidate = data.totalPriceUsd ?? data.total_price_usd ?? data.priceUsd ?? data.price_usd;
  const parsed = Number(candidate);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function sanitizeCanbosoItem(item: any) {
  if (typeof item === "string") return { type: "text", content: item };
  if (item && typeof item === "object") {
    const content = item.user || item.code || item.value || item.text || item.content || item.note || JSON.stringify(item);
    return { type: "text", content };
  }
  return { type: "text", content: String(item) };
}

export function summarizeCanbosoPurchase(response: CanbosoPurchaseResponse) {
  const data = (response.data || response.purchase || response.order || response) as Record<string, any>;
  const rawItems = data.deliveredAccounts || data.items || data.codes || data.accounts || data.credentials || data.results || response.items || [];
  const items = Array.isArray(rawItems)
    ? rawItems.map(sanitizeCanbosoItem)
    : typeof rawItems === "string"
      ? [{ type: "text", content: rawItems }]
      : [];
  const status = String(data.status || response.status || (items.length > 0 ? "delivered" : "processing")).toLowerCase();
  const normalizedStatus = status.includes("deliver") || status.includes("success") || status === "completed"
    ? "delivered"
    : status.includes("refund")
      ? "refunded"
      : status.includes("cancel")
        ? "cancelled"
        : status.includes("fail") || status.includes("reject") || status.includes("error") || status.includes("declin")
          ? "failed"
        : "processing";
  return {
    externalOrderId: String(data.order_id || data.purchase_id || data.id || data._id || data.orderCode || ""),
    status: normalizedStatus,
    items,
    priceUsd: readExplicitCanbosoUsdCost(data),
    raw: response,
  };
}

export async function listCanbosoProducts() {
  const response = await fetch(`${baseUrl}/api/telegram-buyer/products`, { headers: await headers() });
  const parsed = productListResponseSchema.parse(await parseJsonResponse(response));
  return unwrapProducts(parsed);
}

export async function getCanbosoProduct(productId: string) {
  const products = await listCanbosoProducts();
  const product = products.find((item) => item._id === productId);
  if (!product) {
    throw new Error("Canboso product not found.");
  }
  return product;
}

export async function purchaseCanbosoProduct(input: {
  productId: string;
  quantity: number;
  idempotencyKey: string;
}) {
  const response = await fetch(`${baseUrl}/api/telegram-buyer/purchase`, {
    method: "POST",
    headers: await headers({ "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey }),
    body: JSON.stringify({
      product_id: input.productId,
      quantity: input.quantity,
    }),
  });
  return purchaseResponseSchema.parse(await parseJsonResponse(response));
}

import { z } from "zod";
import { getProviderApiKey } from "../lib/provider-keys";

const endpoint = "https://ssondigitalworks.online/api/reseller";

const productSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  numeric_id: z.number().optional().nullable(),
  slug: z.string().optional().nullable(),
  name: z.string(),
  description: z.string().optional().nullable(),
  price: z.number(),
  stock: z.number().optional().nullable(),
  category: z.string().optional().nullable(),
  product_type: z.string().optional().nullable(),
}).passthrough();

const productListSchema = z.object({
  ok: z.boolean(),
  products: z.array(productSchema),
}).passthrough();

export type SsonProduct = z.infer<typeof productSchema>;

async function headers() {
  const key = await getProviderApiKey("ssondigital");
  if (!key) throw new Error("SSOn Digital API key is not configured");
  return { Accept: "application/json", "X-API-Key": key };
}

async function parseResponse(response: Response) {
  const body = await response.json().catch(() => null) as Record<string, any> | null;
  if (!response.ok) {
    const error = new Error(String(body?.message || body?.detail || body?.error || `SSOn Digital request failed with ${response.status}`)) as Error & { code?: string; status?: number };
    error.code = body?.code;
    error.status = response.status;
    throw error;
  }
  return body;
}

export function normalizeSsonProduct(product: SsonProduct) {
  return {
    id: product.id,
    slug: product.slug || `sson-${product.id}`,
    name: product.name,
    categoryName: product.category || "Digital Products",
    categoryId: product.category || "sson-digital",
    description: product.description || "",
    stock: Math.max(0, Number(product.stock || 0)),
    unlimited: false,
    instant: false,
    activationUrl: "",
    priceUsd: product.price,
    bulkTiers: [] as Array<{ minQty: number; unitPrice: number }>,
  };
}

export async function listSsonProducts(): Promise<SsonProduct[]> {
  const response = await fetch(`${endpoint}?action=products`, { headers: await headers() });
  return productListSchema.parse(await parseResponse(response)).products;
}

export async function getSsonProduct(productId: string) {
  const products = await listSsonProducts();
  const product = products.find((item) => item.id === productId || String(item.numeric_id || "") === productId);
  if (!product) throw new Error("SSOn Digital product not found.");
  return product;
}

export function calculateSsonPrice(product: SsonProduct, quantity: number) {
  return Math.round(product.price * quantity * 100) / 100;
}

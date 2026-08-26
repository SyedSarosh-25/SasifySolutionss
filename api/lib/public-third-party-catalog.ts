const SUPPLIER_NAME_PATTERN = /\b(?:technysoft|canboso|akunding|zoomstore|zoom store|ssondigital|sson digital(?: works)?)\b/gi;

export function sanitizeCustomerText(value: unknown) {
  return String(value ?? "")
    .replace(SUPPLIER_NAME_PATTERN, "Sasify")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function toCustomerThirdPartyProduct(product: any, originalSource: any = product) {
  const originalPriceUsd = Number(originalSource?.originalPriceUsd || 0);
  const originalDisplayAmount = Number(originalSource?.originalPriceDisplayAmount || 0);
  const hasOriginalDisplayAmount = Number.isFinite(originalDisplayAmount) && originalDisplayAmount > 0;
  const categoryName = sanitizeCustomerText(product.categoryName || "Digital Tools");

  return {
    id: Number(product.id),
    slug: `third-party-${product.id}`,
    name: sanitizeCustomerText(product.title),
    categoryName,
    categoryId: categoryName,
    description: sanitizeCustomerText(product.description || product.sourceDescription || ""),
    stock: Math.max(0, Number(product.sourceStock || 0)),
    unlimited: Boolean(product.unlimited),
    instant: product.instant !== false,
    maxQuantity: product.provider === "akunding" ? 1000 : 100,
    activationUrl: "",
    priceUsd: Number(product.priceUsd || 0),
    priceCurrency: product.priceCurrency || "USD",
    priceDisplayAmount: Number(product.priceDisplayAmount || 0),
    originalPriceUsd,
    originalPriceCurrency: hasOriginalDisplayAmount
      ? originalSource.originalPriceCurrency || product.priceCurrency || "USD"
      : "USD",
    originalPriceDisplayAmount: hasOriginalDisplayAmount ? originalDisplayAmount : originalPriceUsd,
    bulkTiers: [] as unknown[],
  };
}

export function toCustomerDirectProduct(input: {
  product: any;
  plan: any;
  categoryName: string;
  availableStock: number;
}) {
  const { product, plan, categoryName, availableStock } = input;
  const manualActivation = product.fulfillmentType === "whatsapp_activation";
  const priceUsd = Number(plan.salePrice ?? plan.price ?? 0);
  return {
    id: Number(product.id),
    slug: product.slug,
    name: sanitizeCustomerText(product.name),
    categoryName: sanitizeCustomerText(categoryName || "Digital Tools"),
    categoryId: String(product.categoryId ?? "direct"),
    description: sanitizeCustomerText(product.shortDescription || product.description || ""),
    stock: Math.max(0, Number(availableStock || 0)),
    unlimited: manualActivation,
    instant: !manualActivation,
    maxQuantity: 1,
    activationUrl: "",
    priceUsd,
    priceCurrency: "USD",
    priceDisplayAmount: priceUsd,
    originalPriceUsd: priceUsd,
    originalPriceCurrency: "USD",
    originalPriceDisplayAmount: priceUsd,
    bulkTiers: [] as unknown[],
    fulfillmentType: product.fulfillmentType || "credentials",
    planId: plan.id,
    isDirect: true as const,
  };
}

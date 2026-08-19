import { buyTechnysoftProduct } from "./technysoft";
import { purchaseCanbosoProduct, summarizeCanbosoPurchase } from "./canboso";
import { createAkundingOrder, summarizeAkundingOrder } from "./akunding";

export type MarketplaceProvider = "technysoft" | "canboso" | "akunding";

export async function purchaseExternalMarketplaceProduct(
  provider: MarketplaceProvider,
  externalProductId: string,
  quantity: number,
  idempotencyKey: string,
) {
  if (provider === "technysoft") {
    const purchase = await buyTechnysoftProduct({ productId: Number(externalProductId), quantity, idempotencyKey });
    const order = purchase.order;
    return {
      externalOrderId: String(order.id),
      status: order.status === "delivered" || order.status === "refunded" || order.status === "cancelled" ? order.status : "processing",
      items: order.items,
      priceUsd: order.price_usd,
      raw: order,
    };
  }
  if (provider === "canboso") {
    return summarizeCanbosoPurchase(await purchaseCanbosoProduct({ productId: externalProductId, quantity, idempotencyKey }));
  }
  return summarizeAkundingOrder(await createAkundingOrder({ productId: Number(externalProductId), quantity, idempotencyKey }));
}

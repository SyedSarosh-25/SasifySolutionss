import { readProviderDeliveryItems } from "./provider-delivery";

export function releasedCustomerMarketplaceItems(order: any) {
  return order?.status === "delivered" && order?.credentialsReleasedAt
    ? readProviderDeliveryItems(order)
    : [];
}

export function toCustomerMarketplaceOrder(order: any, options: { includeDelivery?: boolean } = {}) {
  return {
    id: order?.id,
    productName: order?.productName,
    quantity: order?.quantity,
    priceUsd: order?.priceUsd,
    originalPriceUsd: order?.originalPriceUsd,
    savingsUsd: order?.savingsUsd,
    status: order?.status,
    fulfillmentStatus: order?.fulfillmentStatus,
    items: options.includeDelivery ? releasedCustomerMarketplaceItems(order) : [],
    deliveredAt: order?.deliveredAt,
    refundedAt: order?.refundedAt,
    createdAt: order?.createdAt,
    updatedAt: order?.updatedAt,
  };
}

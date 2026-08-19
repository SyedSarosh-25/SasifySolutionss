export function manualCompletionState(order: { status?: unknown; deliveryStatus?: unknown; fulfillmentType?: unknown }) {
  if (order.status === "delivered" && order.deliveryStatus === "delivered") return "replayed" as const;
  if (order.fulfillmentType === "whatsapp_activation" && order.status === "pending_fulfillment") return "eligible" as const;
  return "ineligible" as const;
}

export function sanitizeAdminMarketplaceOrderSummary(order: any) {
  const summary = { ...(order ?? {}) };
  for (const field of [
    "items",
    "itemsEncrypted",
    "rawOrder",
    "providerRaw",
    "codes",
    "delivery",
    "credentialPayload",
    "password",
    "token",
    "secret",
    "apiKey",
  ]) {
    delete summary[field];
  }
  return { ...summary, items: [] };
}

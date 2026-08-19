export function normalizeAdminOrders(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && Array.isArray((value as { items?: unknown }).items)) {
    return (value as { items: any[] }).items;
  }
  return [];
}

import { describe, expect, it } from "vitest";
import { normalizeAdminOrders } from "../../src/lib/admin-orders";

describe("normalizeAdminOrders", () => {
  const rows = [{ id: 1 }, { id: 2 }];

  it("accepts the legacy array response", () => {
    expect(normalizeAdminOrders(rows)).toEqual(rows);
  });

  it("accepts the paginated order response", () => {
    expect(normalizeAdminOrders({ items: rows, total: 2, limit: 80, offset: 0 })).toEqual(rows);
  });

  it("fails closed for missing or malformed data", () => {
    expect(normalizeAdminOrders(undefined)).toEqual([]);
    expect(normalizeAdminOrders({ items: null })).toEqual([]);
  });
});

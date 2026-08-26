import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../queries/connection", () => ({ connectDb: vi.fn() }));

import { fetchProviderWallet } from "./provider-settings";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("provider wallet probes", () => {
  it("uses the Canboso v2 query-key balance endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ balance: 4.25, currency: "USD" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const wallet = await fetchProviderWallet("canboso", "canboso-test-key");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://canboso.com/api/v2/telegram-buyer/balance?key=canboso-test-key",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
    expect(wallet).toMatchObject({ ok: true, balance: 4.25, currency: "USD" });
  });

  it("reads the nested SSOn reseller balance", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, reseller: { balance: 1.95 } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const wallet = await fetchProviderWallet("ssondigital", "sson-test-key");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://ssondigitalworks.online/api/reseller?action=balance",
      expect.objectContaining({ headers: { Accept: "application/json", "X-API-Key": "sson-test-key" } }),
    );
    expect(wallet).toMatchObject({ ok: true, balance: 1.95, currency: "USDT" });
  });
});

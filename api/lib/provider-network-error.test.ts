import { describe, expect, it } from "vitest";
import {
  PROVIDER_PROBE_ATTEMPTS,
  PROVIDER_PROBE_TIMEOUT_MS,
  PROVIDER_RETRY_DELAY_MS,
  providerFetchFailureMessage,
  providerNetworkFailureMessage,
  normalizeProviderApiKeyInput,
  runProviderNetworkProbe,
} from "./provider-network-error";

describe("provider network error handling", () => {
  it.each([
    ["akunding", Object.assign(new Error("fetch failed"), { cause: { code: "UND_ERR_CONNECT_TIMEOUT" } })],
    ["akunding", new DOMException("request timed out", "TimeoutError")],
    ["technysoft", Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" })],
  ] as const)("returns an actionable, secret-safe message for %s", (provider, error) => {
    const message = providerNetworkFailureMessage(provider, error);
    expect(message).toContain("API is unreachable from this server");
    expect(message).not.toContain("key was not saved");
    expect(message).not.toContain(error.message);
    expect(message).not.toMatch(/Bearer|Authorization|api[_-]?key=/i);
  });

  it("keeps two network attempts inside a bounded timeout window", () => {
    expect(PROVIDER_PROBE_TIMEOUT_MS).toBe(8_000);
    expect(PROVIDER_PROBE_ATTEMPTS).toBe(2);
    expect(PROVIDER_RETRY_DELAY_MS).toBe(300);
  });

  it("retries one transient thrown network failure and returns the second result", async () => {
    let attempts = 0;
    const waits: number[] = [];
    const result = await runProviderNetworkProbe(
      async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("transient fetch failure");
        return "connected";
      },
      async (milliseconds) => { waits.push(milliseconds); },
    );
    expect(result).toBe("connected");
    expect(attempts).toBe(2);
    expect(waits).toEqual([300]);
  });

  it("does not retry when the first network operation succeeds", async () => {
    let attempts = 0;
    const result = await runProviderNetworkProbe(async () => {
      attempts += 1;
      return "connected";
    });
    expect(result).toBe("connected");
    expect(attempts).toBe(1);
  });

  it("stops after two thrown network failures", async () => {
    let attempts = 0;
    await expect(runProviderNetworkProbe(
      async () => {
        attempts += 1;
        throw new Error(`failure ${attempts}`);
      },
      async () => undefined,
    )).rejects.toThrow("failure 2");
    expect(attempts).toBe(2);
  });

  it("removes copy-paste zero-width marks and edge whitespace from provider keys", () => {
    expect(normalizeProviderApiKeyInput("  \u200Bmkeapi_example-123\uFEFF  ")).toBe("mkeapi_example-123");
  });

  it("rejects internal whitespace instead of sending an invalid provider header", () => {
    expect(() => normalizeProviderApiKeyInput("mkeapi_example\nsecond-line")).toThrow("spaces or line breaks");
  });

  it("does not misreport a local invalid-header failure as a provider outage", () => {
    const error = new TypeError("Headers.set: invalid header value containing a secret");
    const message = providerFetchFailureMessage("technysoft", error);
    expect(message).toContain("raw API key without spaces or hidden characters");
    expect(message).not.toContain("unreachable");
    expect(message).not.toContain("secret");
  });

  it("continues to classify connection timeouts as provider reachability failures", () => {
    const error = Object.assign(new Error("fetch failed"), { cause: { code: "UND_ERR_CONNECT_TIMEOUT" } });
    expect(providerFetchFailureMessage("technysoft", error)).toContain("API is unreachable from this server");
  });
});

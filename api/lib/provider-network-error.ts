export type ProviderNetworkName = "technysoft" | "canboso" | "akunding";

const PROVIDER_LABELS: Record<ProviderNetworkName, string> = {
  technysoft: "Technysoft",
  canboso: "Canboso",
  akunding: "Akunding",
};

export const PROVIDER_PROBE_TIMEOUT_MS = 8_000;
export const PROVIDER_PROBE_ATTEMPTS = 2;
export const PROVIDER_RETRY_DELAY_MS = 300;

export async function runProviderNetworkProbe<T>(
  operation: () => Promise<T>,
  wait: (milliseconds: number) => Promise<void> = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= PROVIDER_PROBE_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < PROVIDER_PROBE_ATTEMPTS) {
        await wait(PROVIDER_RETRY_DELAY_MS);
      }
    }
  }
  throw lastError;
}

export function normalizeProviderApiKeyInput(value: string) {
  const normalized = value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/gu, "")
    .trim();

  if (!normalized) {
    throw new Error("API key is empty");
  }
  const hasWhitespaceOrControl = Array.from(normalized).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return /\s/u.test(character)
      || codePoint <= 31
      || (codePoint >= 127 && codePoint <= 159);
  });
  if (hasWhitespaceOrControl) {
    throw new Error("API key contains spaces or line breaks. Paste the raw key only.");
  }
  if (/[^\x21-\x7E]/u.test(normalized)) {
    throw new Error("API key contains unsupported hidden characters. Paste the raw key only.");
  }
  return normalized;
}

function isLocalHeaderFailure(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("header")
    || message.includes("bytestring")
    || message.includes("invalid character")
    || message.includes("invalid argument");
}

export function providerFetchFailureMessage(provider: ProviderNetworkName, error: unknown) {
  if (isLocalHeaderFailure(error)) {
    return `${PROVIDER_LABELS[provider]} verification request could not be sent. Paste the raw API key without spaces or hidden characters.`;
  }
  return providerNetworkFailureMessage(provider, error);
}

/**
 * Return a bounded, secret-safe message for failures where fetch never received
 * an HTTP response. Provider HTTP errors are handled separately so 401/403 and
 * documented response details remain visible to the operator.
 */
export function providerNetworkFailureMessage(provider: ProviderNetworkName, error: unknown) {
  void error;
  return `${PROVIDER_LABELS[provider]} API is unreachable from this server. Check provider availability or server allowlisting, then retry.`;
}

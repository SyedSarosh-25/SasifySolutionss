const PURCHASE_KEY_TTL_MS = 24 * 60 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function storageKey(scope: string, userId: number, parts: Array<string | number>) {
  return `sasify:${scope}:${userId}:${parts.join(":")}`;
}

export function getPurchaseOperationKey(scope: string, userId: number, parts: Array<string | number>) {
  const key = storageKey(scope, userId, parts);
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null") as { id?: string; createdAt?: number } | null;
    const createdAt = Number(parsed?.createdAt);
    const now = Date.now();
    if (parsed?.id && UUID_PATTERN.test(parsed.id) && Number.isFinite(createdAt) && createdAt <= now && createdAt > now - PURCHASE_KEY_TTL_MS) return parsed.id;
  } catch {
    // Replace malformed browser state with a fresh operation key.
  }
  const id = crypto.randomUUID();
  localStorage.setItem(key, JSON.stringify({ id, createdAt: Date.now() }));
  return id;
}

export function clearPurchaseOperationKey(scope: string, userId: number, parts: Array<string | number>, id: string) {
  const key = storageKey(scope, userId, parts);
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null") as { id?: string } | null;
    if (parsed?.id === id) localStorage.removeItem(key);
  } catch {
    localStorage.removeItem(key);
  }
}

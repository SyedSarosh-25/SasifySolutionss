import { protectCredential, requireEncryptedCredential, revealCredential } from "./credential-security";

type ProviderItem = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

export function sanitizeProviderDeliveryItems(items: unknown): Array<{ type: "text"; content: string }> {
  if (!Array.isArray(items)) return [];
  return items.flatMap((raw) => {
    if (typeof raw === "string" || typeof raw === "number") {
      const content = text(raw);
      return content ? [{ type: "text" as const, content }] : [];
    }
    if (!raw || typeof raw !== "object") return [];
    const item = raw as ProviderItem;
    const direct = text(item.content ?? item.code ?? item.value ?? item.text ?? item.credential);
    if (direct) return [{ type: "text" as const, content: direct }];
    const fields: Array<[string, unknown]> = [
      ["Email", item.email ?? item.accountEmail],
      ["Username", item.username ?? item.login],
      ["Password", item.password],
      ["License Key", item.licenseKey ?? item.license_key],
      ["Account", item.account],
      ["Note", item.note_en ?? item.note_ar],
    ];
    const content = fields.map(([label, value]) => [label, text(value)] as const).filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`).join("\n");
    return content ? [{ type: "text" as const, content }] : [];
  });
}

export function providerDeliveryFields(items: unknown) {
  const sanitized = sanitizeProviderDeliveryItems(items);
  if (sanitized.length === 0) return { items: [], itemsEncrypted: undefined };
  const itemsEncrypted = requireEncryptedCredential(protectCredential(JSON.stringify(sanitized)));
  return { items: [], itemsEncrypted };
}

export function readProviderDeliveryItems(order: { items?: unknown; itemsEncrypted?: string | null }) {
  if (order.itemsEncrypted) {
    try {
      return sanitizeProviderDeliveryItems(JSON.parse(revealCredential(order.itemsEncrypted)));
    } catch {
      return [];
    }
  }
  return sanitizeProviderDeliveryItems(order.items);
}

export type WhatsAppSettings = {
  whatsapp_link?: string | null;
  whatsapp_number?: string | null;
};

const ALLOWED_HOSTS = new Set(["wa.me", "api.whatsapp.com", "web.whatsapp.com"]);

export function buildWhatsAppUrl(settings: WhatsAppSettings | null | undefined, message: string) {
  const configuredLink = settings?.whatsapp_link?.trim();
  let url: URL | null = null;

  if (configuredLink) {
    try {
      const parsed = new URL(configuredLink);
      if (parsed.protocol === "https:" && ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) url = parsed;
    } catch {
      url = null;
    }
  }

  if (!url) {
    let digits = String(settings?.whatsapp_number || "").replace(/\D/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (digits.length < 8 || digits.length > 15) return null;
    url = new URL(`https://wa.me/${digits}`);
  }

  url.searchParams.set("text", message.trim());
  return url.toString();
}

import { describe, expect, it } from "vitest";
import { buildWhatsAppUrl } from "./whatsapp";

describe("buildWhatsAppUrl", () => {
  it("builds a safe link from an international number", () => {
    expect(buildWhatsAppUrl({ whatsapp_number: "+92 300 1234567" }, "Order SAS-1")).toBe("https://wa.me/923001234567?text=Order+SAS-1");
  });

  it("preserves an allowlisted configured WhatsApp link and appends order context", () => {
    expect(buildWhatsAppUrl({ whatsapp_link: "https://wa.me/923001234567?source=dashboard" }, "Order #7"))
      .toBe("https://wa.me/923001234567?source=dashboard&text=Order+%237");
  });

  it("rejects arbitrary links and invalid numbers", () => {
    expect(buildWhatsAppUrl({ whatsapp_link: "https://evil.example/collect", whatsapp_number: "123" }, "Order")).toBeNull();
  });
});

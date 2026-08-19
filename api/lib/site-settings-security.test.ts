import { describe, expect, it } from "vitest";
import {
  isEditableAdminSettingKey,
  publicSettingsRecord,
  publicSiteSettingsRecord,
  sanitizeAdminSettings,
} from "./site-settings-security";

const rows = [
  { id: 1, key: "site_name", value: "SASIFY Solutions" },
  { id: 2, key: "support_email", value: "support@example.com" },
  { id: 3, key: "usd_to_pkr", value: "285" },
  { id: 4, key: "technysoft_api_key", value: "enc:v1:sensitive" },
  { id: 5, key: "future_secret", value: "must-not-leak" },
  { id: 6, key: "site_template", value: "atlas-3d" },
  { id: 7, key: "user_dashboard_template", value: "follow-site" },
  { id: 8, key: "admin_dashboard_template", value: "obsidian-executive" },
  { id: 9, key: "whatsapp_number", value: "+923001234567" },
  { id: 10, key: "whatsapp_link", value: "https://wa.me/923001234567" },
  { id: 11, key: "binance_pay_api_identity_key", value: "enc:v1:identity-ciphertext" },
  { id: 12, key: "binance_pay_api_secret_key", value: "enc:v1:secret-ciphertext" },
];

describe("site settings response security", () => {
  it("returns only allowlisted values from public settings", () => {
    expect(publicSettingsRecord(rows)).toEqual({
      site_name: "SASIFY Solutions",
      support_email: "support@example.com",
      usd_to_pkr: "285",
    });
  });

  it("limits the currency bootstrap endpoint to site identity and exchange rate", () => {
    expect(publicSiteSettingsRecord(rows)).toEqual({
      site_name: "SASIFY Solutions",
      site_template: "atlas-3d",
      user_dashboard_template: "follow-site",
      usd_to_pkr: "285",
      whatsapp_number: "+923001234567",
      whatsapp_link: "https://wa.me/923001234567",
    });
  });

  it("rejects sensitive and unknown keys from the generic admin settings writer", () => {
    expect(isEditableAdminSettingKey("support_email")).toBe(true);
    expect(isEditableAdminSettingKey("whatsapp_number")).toBe(true);
    expect(isEditableAdminSettingKey("whatsapp_link")).toBe(true);
    expect(isEditableAdminSettingKey("technysoft_api_key")).toBe(false);
    expect(isEditableAdminSettingKey("future_secret")).toBe(false);
    expect(isEditableAdminSettingKey("binance_pay_api_identity_key")).toBe(false);
    expect(isEditableAdminSettingKey("binance_pay_api_secret_key")).toBe(false);
    expect(isEditableAdminSettingKey("unregistered_setting")).toBe(false);
  });

  it("removes credential values from admin settings while preserving configured state", () => {
    const result = sanitizeAdminSettings(rows);
    expect(result).toContainEqual({
      id: 4,
      key: "technysoft_api_key",
      configured: true,
      maskedValue: "••••••••",
    });
    expect(result.find((row) => row.key === "technysoft_api_key")).not.toHaveProperty("value");
    expect(JSON.stringify(result)).not.toContain("enc:v1:sensitive");
    expect(JSON.stringify(publicSettingsRecord(rows))).not.toContain("binance_pay_api");
    expect(JSON.stringify(publicSiteSettingsRecord(rows))).not.toContain("binance_pay_api");
    expect(JSON.stringify(result)).not.toContain("identity-ciphertext");
    expect(JSON.stringify(result)).not.toContain("secret-ciphertext");
    expect(result).toContainEqual({ id: 1, key: "site_name", value: "SASIFY Solutions" });
  });
});

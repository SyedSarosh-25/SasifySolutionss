type SettingRow = {
  key: string;
  value?: string | null;
  [key: string]: unknown;
};

const PUBLIC_SETTINGS_KEYS = new Set([
  "site_name",
  "support_email",
  "nayapay_payment_details",
  "easypaisa_payment_details",
  "jazzcash_payment_details",
  "usdt_wallet",
  "usdt_bep20_wallet",
  "binance_pay_id",
  "binance_pay_name",
  "binance_pay_nickname",
  "binance_pay_qr_url",
  "usd_to_pkr",
]);

const PUBLIC_SITE_SETTINGS_KEYS = new Set([
  "site_name",
  "usd_to_pkr",
  "site_template",
  "user_dashboard_template",
  "whatsapp_link",
  "whatsapp_number",
]);

const EDITABLE_ADMIN_SETTING_KEYS = new Set([
  ...PUBLIC_SETTINGS_KEYS,
  "whatsapp_number",
  "whatsapp_link",
  "platform_api_real_mode",
]);

export function isSensitiveSettingKey(key: string) {
  return /(?:api(?:[_-]?[a-z0-9]+)*[_-]?key|secret|token|password|credential)/i.test(key);
}

export function isEditableAdminSettingKey(key: string) {
  return EDITABLE_ADMIN_SETTING_KEYS.has(key) && !isSensitiveSettingKey(key);
}

function allowlistedRecord(rows: SettingRow[], allowedKeys: Set<string>) {
  const result: Record<string, string> = {};
  for (const row of rows) {
    if (!allowedKeys.has(row.key) || typeof row.value !== "string") continue;
    result[row.key] = row.value;
  }
  return result;
}

export function publicSettingsRecord(rows: SettingRow[]) {
  return allowlistedRecord(rows, PUBLIC_SETTINGS_KEYS);
}

export function publicSiteSettingsRecord(rows: SettingRow[]) {
  return allowlistedRecord(rows, PUBLIC_SITE_SETTINGS_KEYS);
}

export type AdminSettingRow = SettingRow & {
  configured?: boolean;
  maskedValue?: string;
};

export function sanitizeAdminSettings(rows: SettingRow[]): AdminSettingRow[] {
  return rows.map((row) => {
    if (!isSensitiveSettingKey(row.key)) return row;
    const safe: AdminSettingRow = { ...row };
    const configured = typeof row.value === "string" && row.value.length > 0;
    delete safe.value;
    return {
      ...safe,
      configured,
      maskedValue: configured ? "••••••••" : "",
    };
  });
}

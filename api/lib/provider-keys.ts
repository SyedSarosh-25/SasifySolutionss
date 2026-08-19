import { connectDb } from "../queries/connection";
import { SiteSetting, clean } from "../mongo/models";
import { revealCredential } from "./credential-security";

type ProviderKey = "technysoft" | "canboso" | "akunding";

const envKeyMap: Record<ProviderKey, string> = {
  technysoft: "TECHNYSOFT_API_KEY",
  canboso: "CANBOSO_API_KEY",
  akunding: "AKUNDING_API_KEY",
};

/**
 * Get the live API key for a provider.
 * Priority: site_settings DB (set by admin Save & Verify) → .env fallback.
 */
export async function getProviderApiKey(provider: ProviderKey): Promise<string> {
  try {
    await connectDb();
    const settingKey = `${provider}_api_key`;
    const setting = clean(await SiteSetting.findOne({ key: settingKey }).lean()) as any;
    if (setting?.value) {
      const revealed = revealCredential(setting.value);
      if (revealed) return revealed;
      // Not encrypted — plaintext from before encryption was added
      if (setting.value.length > 4) return setting.value;
    }
  } catch {
    // DB connection might fail — fall through to env
  }

  // Fallback: legacy env var
  return process.env[envKeyMap[provider]] ?? "";
}

import { SiteSetting } from "../mongo/models";
import { connectDb } from "../queries/connection";

export const PLATFORM_API_REAL_MODE_KEY = "platform_api_real_mode";

export async function isPlatformApiRealMode(): Promise<boolean> {
  await connectDb();
  const setting = await SiteSetting.findOne({ key: PLATFORM_API_REAL_MODE_KEY }).select("value").lean<{ value?: string }>();
  return setting?.value === "true";
}

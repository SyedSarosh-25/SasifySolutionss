import { z } from "zod";

export const REFERRAL_SETTING_KEYS = {
  enabled: "referral_enabled",
  userPercent: "referral_user_percent",
  resellerPercent: "referral_reseller_percent",
  holdDays: "referral_hold_days",
  minConversion: "referral_min_conversion",
  enabledSince: "referral_enabled_since",
} as const;

export const referralSettingsInputSchema = z.object({
  enabled: z.boolean(),
  userPercent: z.number().min(0).max(30),
  resellerPercent: z.number().min(0).max(40),
  holdDays: z.number().int().min(0).max(90),
  minConversion: z.number().min(0).max(10_000),
}).superRefine((value, ctx) => {
  if (value.resellerPercent < value.userPercent) {
    ctx.addIssue({ code: "custom", path: ["resellerPercent"], message: "Reseller percentage cannot be lower than the standard user percentage" });
  }
});

export type ReferralSettings = z.infer<typeof referralSettingsInputSchema>;

export const DEFAULT_REFERRAL_SETTINGS: ReferralSettings = {
  enabled: true,
  userPercent: 5,
  resellerPercent: 10,
  holdDays: 7,
  minConversion: 1,
};

function numberSetting(value: string | undefined, fallback: number) {
  if (value == null || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function referralSettingsFromRecord(record: Record<string, string | undefined>): ReferralSettings {
  const candidate = {
    enabled: record[REFERRAL_SETTING_KEYS.enabled] == null
      ? DEFAULT_REFERRAL_SETTINGS.enabled
      : record[REFERRAL_SETTING_KEYS.enabled] === "true",
    userPercent: numberSetting(record[REFERRAL_SETTING_KEYS.userPercent], DEFAULT_REFERRAL_SETTINGS.userPercent),
    resellerPercent: numberSetting(record[REFERRAL_SETTING_KEYS.resellerPercent], DEFAULT_REFERRAL_SETTINGS.resellerPercent),
    holdDays: numberSetting(record[REFERRAL_SETTING_KEYS.holdDays], DEFAULT_REFERRAL_SETTINGS.holdDays),
    minConversion: numberSetting(record[REFERRAL_SETTING_KEYS.minConversion], DEFAULT_REFERRAL_SETTINGS.minConversion),
  };
  const parsed = referralSettingsInputSchema.safeParse(candidate);
  return parsed.success
    ? parsed.data
    : { ...DEFAULT_REFERRAL_SETTINGS, enabled: false, userPercent: 0, resellerPercent: 0 };
}

export function moneyToCents(value: string | number) {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Invalid non-negative money amount");
  return Math.round((amount + Number.EPSILON) * 100);
}

export function centsToMoney(cents: number) {
  if (!Number.isSafeInteger(cents)) throw new Error("Money cents must be a safe integer");
  return (cents / 100).toFixed(2);
}

export function calculateCommission(baseAmount: string | number, percentage: number) {
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) throw new Error("Invalid commission percentage");
  const baseCents = moneyToCents(baseAmount);
  const basisPoints = Math.round(percentage * 100);
  const amountCents = Math.floor((baseCents * basisPoints) / 10_000);
  return {
    baseAmount: centsToMoney(baseCents),
    percentage: (basisPoints / 100).toFixed(2),
    amount: centsToMoney(amountCents),
    amountCents,
  };
}

export function commissionAvailableAt(createdAt: Date, holdDays: number) {
  return new Date(createdAt.getTime() + holdDays * 86_400_000);
}

import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { TRPCError } from "@trpc/server";
import {
  AuditLog,
  Order,
  ReferralAttribution,
  ReferralCommission,
  ReferralLedgerEvent,
  ReferralProfile,
  ResellerApplication,
  SiteSetting,
  ThirdPartyOrder,
  User,
  WalletTransaction,
  clean,
  cleanMany,
  nextId,
} from "../mongo/models";
import {
  DEFAULT_REFERRAL_SETTINGS,
  REFERRAL_SETTING_KEYS,
  calculateCommission,
  centsToMoney,
  commissionAvailableAt,
  moneyToCents,
  referralSettingsFromRecord,
  type ReferralSettings,
} from "../lib/referral-policy";

type SourceType = "order" | "third_party_order";
type SourceState = { status?: string; userId?: number; amount?: string; createdAt?: Date };

function duplicateError(error: unknown) {
  return error instanceof Error && /duplicate key|E11000/i.test(error.message);
}

function balanceToCents(value: string | number) {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) throw new Error("Invalid wallet balance");
  return Math.round((amount + Math.sign(amount || 1) * Number.EPSILON) * 100);
}

async function ledgerEvent(input: {
  commissionId: number;
  userId: number;
  eventType: "created" | "released" | "converted" | "reversed";
  amount: string;
  dedupeKey: string;
  metadata?: Record<string, unknown>;
  session?: mongoose.ClientSession;
}) {
  await ReferralLedgerEvent.updateOne(
    { dedupeKey: input.dedupeKey },
    {
      $setOnInsert: {
        id: await nextId("referral_ledger_events"),
        commissionId: input.commissionId,
        userId: input.userId,
        eventType: input.eventType,
        amount: input.amount,
        dedupeKey: input.dedupeKey,
        metadata: input.metadata,
      },
    },
    { upsert: true, session: input.session },
  );
}

export async function getReferralSettings(): Promise<ReferralSettings> {
  const keys = Object.values(REFERRAL_SETTING_KEYS);
  const rows = await SiteSetting.find({ key: { $in: keys } }).select("key value").lean<Array<{ key: string; value: string }>>();
  const record = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return referralSettingsFromRecord(record);
}

export async function saveReferralSettings(settings: ReferralSettings, actorId: number) {
  const current = await getReferralSettings();
  const existingSince = await SiteSetting.findOne({ key: REFERRAL_SETTING_KEYS.enabledSince }).select("value").lean<{ value?: string }>();
  const enabledSince = settings.enabled && (!current.enabled || !existingSince?.value)
    ? new Date().toISOString()
    : existingSince?.value || new Date().toISOString();
  const values: Record<string, string> = {
    [REFERRAL_SETTING_KEYS.enabled]: String(settings.enabled),
    [REFERRAL_SETTING_KEYS.userPercent]: String(settings.userPercent),
    [REFERRAL_SETTING_KEYS.resellerPercent]: String(settings.resellerPercent),
    [REFERRAL_SETTING_KEYS.holdDays]: String(settings.holdDays),
    [REFERRAL_SETTING_KEYS.minConversion]: String(settings.minConversion),
    [REFERRAL_SETTING_KEYS.enabledSince]: enabledSince,
  };
  const rows = await Promise.all(Object.entries(values).map(async ([key, value]) => ({ key, value, id: await nextId("site_settings") })));
  const auditId = await nextId("audit_logs");
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const row of rows) {
        await SiteSetting.updateOne(
          { key: row.key },
          { $set: { value: row.value }, $setOnInsert: { id: row.id, key: row.key } },
          { upsert: true, session },
        );
      }
      await AuditLog.create([{
        id: auditId,
        actorId,
        action: "referral_settings_updated",
        entityType: "referral_settings",
        metadata: values,
      }], { session });
    });
  } finally {
    await session.endSession();
  }
  return settings;
}

export async function ensureReferralProfile(userId: number) {
  const existing = clean(await ReferralProfile.findOne({ userId }).lean()) as any;
  if (existing) return existing;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `SAS-${userId.toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
    try {
      return clean(await ReferralProfile.create({ id: await nextId("referral_profiles"), userId, code }));
    } catch (error) {
      if (!duplicateError(error)) throw error;
      const raced = clean(await ReferralProfile.findOne({ userId }).lean()) as any;
      if (raced) return raced;
    }
  }
  throw new Error("Could not allocate a unique referral code");
}

export async function resolveReferralCode(code: string) {
  return clean(await ReferralProfile.findOne({ code: code.trim().toUpperCase() }).lean()) as any;
}

export async function bindReferralAtRegistration(input: {
  referredUserId: number;
  referredEmail: string;
  code: string;
  session?: mongoose.ClientSession;
}) {
  const profile = await resolveReferralCode(input.code);
  if (!profile) throw new TRPCError({ code: "BAD_REQUEST", message: "Referral code is invalid or expired" });
  const referrer = clean(await User.findOne({ id: profile.userId }).select("id email").lean()) as any;
  if (!referrer || String(referrer.email || "").toLowerCase() === input.referredEmail.toLowerCase()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Self-referral is not allowed" });
  }
  try {
    const attribution = {
      id: await nextId("referral_attributions"),
      referredUserId: input.referredUserId,
      referrerUserId: profile.userId,
      profileId: profile.id,
      codeSnapshot: profile.code,
      attributedAt: new Date(),
    };
    if (input.session) await ReferralAttribution.create([attribution], { session: input.session });
    else await ReferralAttribution.create(attribution);
  } catch (error) {
    if (input.session || !duplicateError(error)) throw error;
  }
  const audit = {
    id: await nextId("audit_logs"),
    actorId: input.referredUserId,
    action: "referral_attributed",
    entityType: "referral_attribution",
    entityId: input.referredUserId,
    metadata: { referrerUserId: profile.userId, code: profile.code },
  };
  if (input.session) await AuditLog.create([audit], { session: input.session });
  else await AuditLog.create(audit);
  return profile;
}

async function sourceState(sourceType: SourceType, sourceId: number, session?: mongoose.ClientSession): Promise<SourceState | null> {
  if (sourceType === "order") {
    const row = clean(await Order.findOne({ id: sourceId }).select("status userId finalPrice createdAt").session(session ?? null).lean()) as any;
    return row ? { status: row.status, userId: row.userId, amount: row.finalPrice, createdAt: row.createdAt } : null;
  }
  const row = clean(await ThirdPartyOrder.findOne({ id: sourceId }).select("status userId sellingPriceUsd priceUsd credentialsReleasedAt createdAt").session(session ?? null).lean()) as any;
  if (row && row.status === "delivered" && !row.credentialsReleasedAt) {
    return null;
  }

  return row ? { status: row.status, userId: row.userId, amount: row.sellingPriceUsd || row.priceUsd, createdAt: row.createdAt } : null;
}

export async function createReferralCommissionForSource(input: {
  sourceType: SourceType;
  sourceId: number;
  referredUserId: number;
  baseAmount: string;
}) {
  const existing = clean(await ReferralCommission.findOne({ sourceType: input.sourceType, sourceId: input.sourceId }).lean()) as any;
  if (existing) {
    await ledgerEvent({
      commissionId: existing.id,
      userId: existing.referrerUserId,
      eventType: "created",
      amount: existing.amount,
      dedupeKey: `commission:${existing.id}:created`,
      metadata: { sourceType: existing.sourceType, sourceId: existing.sourceId, tier: existing.tier, percentage: existing.percentage },
    });
    return existing;
  }
  const source = await sourceState(input.sourceType, input.sourceId);
  if (!source || source.status !== "delivered" || !source.userId || source.amount == null) return null;
  if (source.userId !== input.referredUserId || moneyToCents(source.amount) !== moneyToCents(input.baseAmount)) {
    throw new Error("Referral settlement input does not match the authoritative source order");
  }
  const referredUserId = source.userId;
  const baseAmount = source.amount;
  const attribution = clean(await ReferralAttribution.findOne({ referredUserId }).lean()) as any;
  if (!attribution || attribution.referrerUserId === referredUserId) return null;
  const settings = await getReferralSettings();
  if (!settings.enabled) return null;
  const enabledSince = await SiteSetting.findOne({ key: REFERRAL_SETTING_KEYS.enabledSince }).select("value").lean<{ value?: string }>();
  if (enabledSince?.value) {
    const qualifiedAt = source.createdAt ? new Date(source.createdAt).getTime() : Date.now();
    if (Number.isFinite(qualifiedAt) && qualifiedAt < new Date(enabledSince.value).getTime()) return null;
  }
  const profile = await ensureReferralProfile(attribution.referrerUserId);
  const tier = profile.tier === "reseller" && profile.resellerStatus === "approved" ? "reseller" : "user";
  const percentage = tier === "reseller" ? settings.resellerPercent : settings.userPercent;
  const calculation = calculateCommission(baseAmount, percentage);
  if (calculation.amountCents <= 0) return null;
  const now = new Date();
  const status = settings.holdDays === 0 ? "available" : "pending";
  const commissionId = await nextId("referral_commissions");
  const commissionDocument = {
    id: commissionId,
    referrerUserId: attribution.referrerUserId,
    referredUserId,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    tier,
    baseAmount: calculation.baseAmount,
    percentage: calculation.percentage,
    amount: calculation.amount,
    status,
    availableAt: commissionAvailableAt(now, settings.holdDays),
  };
  const session = await mongoose.startSession();
  try {
    let createdCommission: any = null;
    await session.withTransaction(async () => {
      const created = await ReferralCommission.create([commissionDocument], { session });
      createdCommission = clean(created[0]);
      await ledgerEvent({
        commissionId,
        userId: attribution.referrerUserId,
        eventType: "created",
        amount: calculation.amount,
        dedupeKey: `commission:${commissionId}:created`,
        metadata: { sourceType: input.sourceType, sourceId: input.sourceId, tier, percentage: calculation.percentage },
        session,
      });
    });
    return createdCommission;
  } catch (error) {
    if (!duplicateError(error)) throw error;
    const raced = clean(await ReferralCommission.findOne({ sourceType: input.sourceType, sourceId: input.sourceId }).lean()) as any;
    if (!raced) throw error;
    await ledgerEvent({
      commissionId: raced.id,
      userId: raced.referrerUserId,
      eventType: "created",
      amount: raced.amount,
      dedupeKey: `commission:${raced.id}:created`,
      metadata: { sourceType: raced.sourceType, sourceId: raced.sourceId, tier: raced.tier, percentage: raced.percentage },
    });
    return raced;
  } finally {
    await session.endSession();
  }
}

export async function settleReferralCommissionSafely(input: {
  sourceType: SourceType;
  sourceId: number;
  referredUserId: number;
  baseAmount: string;
}) {
  try {
    await createReferralCommissionForSource(input);
    return true;
  } catch (error) {
    const name = error instanceof Error ? error.name : "UnknownError";
    process.stderr.write(`[referral] commission deferred for ${input.sourceType} #${input.sourceId}: ${name}\n`);
    return false;
  }
}

export async function reverseReferralCommission(commissionId: number, reason: string, actorId?: number) {
  const session = await mongoose.startSession();
  try {
    let result: any = null;
    await session.withTransaction(async () => {
      const commission = clean(await ReferralCommission.findOne({ id: commissionId }).session(session).lean()) as any;
      if (!commission) throw new TRPCError({ code: "NOT_FOUND", message: "Commission not found" });
      if (commission.status === "reversed") { result = commission; return; }
      if (commission.status === "converted") {
        const user = clean(await User.findOne({ id: commission.referrerUserId }).session(session).lean()) as any;
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Referral owner not found" });
        const before = balanceToCents(user.walletBalance || "0");
        const amount = moneyToCents(commission.amount);
        const after = before - amount;
        await User.updateOne({ id: user.id }, { $set: { walletBalance: centsToMoney(after) } }, { session });
        await WalletTransaction.create([{
          id: await nextId("wallet_transactions"), userId: user.id, type: "debit", amount: commission.amount,
          balanceBefore: centsToMoney(before), balanceAfter: centsToMoney(after), referenceType: "referral",
          referenceId: commission.id, note: `Referral reversal: ${reason}`,
        }], { session });
      }
      const updated = await ReferralCommission.findOneAndUpdate(
        { id: commission.id, status: commission.status },
        { $set: { status: "reversed", reversedAt: new Date(), reversalReason: reason } },
        { returnDocument: "after", session },
      ).lean();
      if (!updated) throw new TRPCError({ code: "CONFLICT", message: "Commission changed while it was being reversed" });
      await ledgerEvent({ commissionId: commission.id, userId: commission.referrerUserId, eventType: "reversed", amount: commission.amount, dedupeKey: `commission:${commission.id}:reversed`, metadata: { reason, actorId }, session });
      result = clean(updated);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export async function syncReferralCommissions(userId?: number) {
  const attributionExpr: Record<string, unknown> = userId
    ? { $and: [{ $eq: ["$referredUserId", "$$referredUserId"] }, { $eq: ["$referrerUserId", userId] }] }
    : { $eq: ["$referredUserId", "$$referredUserId"] };
  const missingPipeline = (sourceType: SourceType, amountField: string) => [
    { $match: { status: "delivered", userId: { $type: "number" }, credentialsReleasedAt: { $exists: true } } },
    { $lookup: { from: "referral_attributions", let: { referredUserId: "$userId" }, pipeline: [{ $match: { $expr: attributionExpr } }], as: "attribution" } },
    { $match: { "attribution.0": { $exists: true } } },
    { $lookup: { from: "referral_commissions", let: { sourceId: "$id" }, pipeline: [{ $match: { sourceType, $expr: { $eq: ["$sourceId", "$$sourceId"] } } }], as: "commission" } },
    { $match: { "commission.0": { $exists: false } } },
    { $project: { _id: 0, id: 1, userId: 1, amount: amountField } },
    { $sort: { id: 1 as const } },
    { $limit: 200 },
  ];
  const [deliveredOrders, deliveredThirdPartyOrders] = await Promise.all([
    Order.aggregate(missingPipeline("order", "$finalPrice")),
    ThirdPartyOrder.aggregate([
      ...missingPipeline("third_party_order", "$sellingPriceUsd").slice(0, 5),
      { $project: { _id: 0, id: 1, userId: 1, amount: { $ifNull: ["$sellingPriceUsd", "$priceUsd"] } } },
      { $sort: { id: 1 as const } },
      { $limit: 200 },
    ]),
  ]);
  for (const order of deliveredOrders as any[]) {
    await createReferralCommissionForSource({ sourceType: "order", sourceId: order.id, referredUserId: order.userId, baseAmount: order.amount });
  }
  for (const order of deliveredThirdPartyOrders as any[]) {
    await createReferralCommissionForSource({ sourceType: "third_party_order", sourceId: order.id, referredUserId: order.userId, baseAmount: order.amount });
  }
  const filter: Record<string, unknown> = userId ? { referrerUserId: userId } : {};
  const rows = cleanMany(await ReferralCommission.find({ ...filter, status: { $in: ["pending", "available", "converted"] } }).sort({ reconciledAt: 1, id: 1 }).limit(200).lean()) as any[];
  const now = new Date();
  for (const commission of rows) {
    const source = await sourceState(commission.sourceType, commission.sourceId);
    const sourceMismatch = source && (
      source.userId !== commission.referredUserId
      || source.amount == null
      || moneyToCents(source.amount) !== moneyToCents(commission.baseAmount)
    );
    if (!source || sourceMismatch || ["refunded", "cancelled", "failed"].includes(String(source.status))) {
      const reason = !source ? "Source order missing" : sourceMismatch ? "Source order ownership or settled amount changed" : `Source order ${source.status}`;
      await reverseReferralCommission(commission.id, reason);
      continue;
    }
    if (commission.status === "pending" && source.status === "delivered" && new Date(commission.availableAt) <= now) {
      const updated = await ReferralCommission.updateOne({ id: commission.id, status: "pending" }, { $set: { status: "available", reconciledAt: now } });
      if (updated.modifiedCount === 1) {
        await ledgerEvent({ commissionId: commission.id, userId: commission.referrerUserId, eventType: "released", amount: commission.amount, dedupeKey: `commission:${commission.id}:released` });
      }
    } else {
      await ReferralCommission.updateOne({ id: commission.id, status: commission.status }, { $set: { reconciledAt: now } });
    }
  }
}

export async function convertAvailableReferralCommissions(userId: number): Promise<{ amount: string; balance: string; count: number }> {
  await syncReferralCommissions(userId);
  const settings = await getReferralSettings();
  const session = await mongoose.startSession();
  try {
    let result: { amount: string; balance: string; count: number } | null = null;
    await session.withTransaction(async () => {
      const commissions = cleanMany(await ReferralCommission.find({ referrerUserId: userId, status: "available" }).session(session).sort({ id: 1 }).lean()) as any[];
      if (!commissions.length) throw new TRPCError({ code: "BAD_REQUEST", message: "No available commissions to convert" });
      for (const commission of commissions) {
        const source = await sourceState(commission.sourceType, commission.sourceId, session);
        if (!source || source.status !== "delivered" || source.userId !== commission.referredUserId || source.amount == null || moneyToCents(source.amount) !== moneyToCents(commission.baseAmount)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Commission #${commission.id} source is no longer eligible` });
        }
      }
      const amountCents = commissions.reduce((sum, row) => sum + moneyToCents(row.amount), 0);
      if (amountCents < moneyToCents(settings.minConversion)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Minimum conversion is $${settings.minConversion.toFixed(2)}` });
      }
      const user = clean(await User.findOne({ id: userId }).session(session).lean()) as any;
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      const before = balanceToCents(user.walletBalance || "0");
      const after = before + amountCents;
      const ids = commissions.map((row) => row.id);
      const updated = await ReferralCommission.updateMany(
        { id: { $in: ids }, referrerUserId: userId, status: "available" },
        { $set: { status: "converted", convertedAt: new Date() } },
        { session },
      );
      if (updated.modifiedCount !== commissions.length) throw new TRPCError({ code: "CONFLICT", message: "Available commissions changed during conversion" });
      await User.updateOne({ id: userId }, { $set: { walletBalance: centsToMoney(after) } }, { session });
      await WalletTransaction.create([{
        id: await nextId("wallet_transactions"), userId, type: "credit", amount: centsToMoney(amountCents),
        balanceBefore: centsToMoney(before), balanceAfter: centsToMoney(after), referenceType: "referral",
        referenceId: commissions[0].id, note: `Referral conversion (${commissions.length} commission${commissions.length === 1 ? "" : "s"})`,
      }], { session });
      for (const commission of commissions) {
        await ledgerEvent({ commissionId: commission.id, userId, eventType: "converted", amount: commission.amount, dedupeKey: `commission:${commission.id}:converted`, session });
      }
      result = { amount: centsToMoney(amountCents), balance: centsToMoney(after), count: commissions.length };
    });
    if (!result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Commission conversion did not complete" });
    return result as { amount: string; balance: string; count: number };
  } finally {
    await session.endSession();
  }
}

export async function convertReferralCommission(input: { commissionId: number; userId: number }): Promise<{ amount: string; balance: string }> {
  await syncReferralCommissions(input.userId);
  const settings = await getReferralSettings();
  const session = await mongoose.startSession();
  try {
    let result: { amount: string; balance: string } | null = null;
    await session.withTransaction(async () => {
      const commission = clean(await ReferralCommission.findOne({ id: input.commissionId, referrerUserId: input.userId }).session(session).lean()) as any;
      if (!commission) throw new TRPCError({ code: "NOT_FOUND", message: "Commission not found" });
      if (commission.status === "converted") {
        const current = clean(await User.findOne({ id: input.userId }).session(session).lean()) as any;
        result = { amount: commission.amount, balance: current?.walletBalance || "0.00" };
        return;
      }
      if (commission.status !== "available") throw new TRPCError({ code: "BAD_REQUEST", message: "Commission is not available yet" });
      if (moneyToCents(commission.amount) < moneyToCents(settings.minConversion)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Minimum conversion is $${settings.minConversion.toFixed(2)}` });
      }
      const source = await sourceState(commission.sourceType, commission.sourceId, session);
      if (!source || source.status !== "delivered" || source.userId !== commission.referredUserId || source.amount == null || moneyToCents(source.amount) !== moneyToCents(commission.baseAmount)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Source order is no longer eligible" });
      }
      const user = clean(await User.findOne({ id: input.userId }).session(session).lean()) as any;
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      const before = balanceToCents(user.walletBalance || "0");
      const after = before + moneyToCents(commission.amount);
      const updated = await ReferralCommission.updateOne({ id: commission.id, status: "available" }, { $set: { status: "converted", convertedAt: new Date() } }, { session });
      if (updated.modifiedCount !== 1) throw new TRPCError({ code: "CONFLICT", message: "Commission was already processed" });
      await User.updateOne({ id: user.id }, { $set: { walletBalance: centsToMoney(after) } }, { session });
      await WalletTransaction.create([{
        id: await nextId("wallet_transactions"), userId: user.id, type: "credit", amount: commission.amount,
        balanceBefore: centsToMoney(before), balanceAfter: centsToMoney(after), referenceType: "referral",
        referenceId: commission.id, note: `Referral commission #${commission.id}`,
      }], { session });
      await ledgerEvent({ commissionId: commission.id, userId: user.id, eventType: "converted", amount: commission.amount, dedupeKey: `commission:${commission.id}:converted`, session });
      result = { amount: commission.amount, balance: centsToMoney(after) };
    });
    if (!result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Commission conversion did not complete" });
    return result as { amount: string; balance: string };
  } finally {
    await session.endSession();
  }
}

export async function referralDashboard(userId: number) {
  const profile = await ensureReferralProfile(userId);
  await syncReferralCommissions(userId);
  const [settings, attributionCount, commissions, application] = await Promise.all([
    getReferralSettings(),
    ReferralAttribution.countDocuments({ referrerUserId: userId }),
    ReferralCommission.find({ referrerUserId: userId }).sort({ createdAt: -1 }).limit(100).lean(),
    ResellerApplication.findOne({ userId }).lean(),
  ]);
  const cleanCommissions = cleanMany(commissions as any[]) as any[];
  const totals = { pending: 0, available: 0, converted: 0, reversed: 0 } as Record<string, number>;
  for (const row of cleanCommissions) totals[row.status] = (totals[row.status] || 0) + moneyToCents(row.amount);
  const applicationDto = application ? {
    status: (application as any).status,
    adminNote: (application as any).adminNote || "",
    reviewedAt: (application as any).reviewedAt || null,
  } : null;
  const commissionDtos = cleanCommissions.map((row) => ({
    id: row.id,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    tier: row.tier,
    baseAmount: row.baseAmount,
    percentage: row.percentage,
    amount: row.amount,
    status: row.status,
    availableAt: row.availableAt,
    convertedAt: row.convertedAt || null,
    reversedAt: row.reversedAt || null,
    createdAt: row.createdAt,
  }));
  return {
    profile: { code: profile.code, tier: profile.tier, resellerStatus: profile.resellerStatus },
    settings,
    application: applicationDto,
    stats: {
      referredUsers: attributionCount,
      commissionedOrders: cleanCommissions.filter((row) => row.status !== "reversed").length,
      pending: centsToMoney(totals.pending || 0),
      available: centsToMoney(totals.available || 0),
      converted: centsToMoney(totals.converted || 0),
      reversed: centsToMoney(totals.reversed || 0),
    },
    commissions: commissionDtos,
  };
}

export { DEFAULT_REFERRAL_SETTINGS };

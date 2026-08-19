/// <reference types="node" />
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../api/queries/connection";
import { Deposit, Order, PaymentReferenceClaim } from "../api/mongo/models";
import { normalizePaymentReference } from "../api/services/payment-reference";

type Claim = { key: string; reference: string; sourceType: "deposit" | "direct_order"; sourceId: number; userId?: number };
mongoose.set("autoIndex", false);

async function main() {
  await connectDb();
  const [deposits, orders] = await Promise.all([
    Deposit.find({ txid: { $type: "string", $ne: "" } }).select("id userId method txid").lean() as any,
    Order.find({ paymentTxid: { $type: "string", $ne: "" } }).select("id userId paymentMethod paymentTxid").lean() as any,
  ]);
  const claims: Claim[] = [
    ...deposits.map((row: any) => ({ key: normalizePaymentReference(row.txid, row.method), reference: row.txid.trim(), sourceType: "deposit" as const, sourceId: row.id, userId: row.userId })),
    ...orders.map((row: any) => ({ key: normalizePaymentReference(row.paymentTxid, row.paymentMethod), reference: row.paymentTxid.trim(), sourceType: "direct_order" as const, sourceId: row.id, userId: row.userId })),
  ];

  const ownership = new Map<string, string[]>();
  for (const claim of claims) ownership.set(claim.key, [...(ownership.get(claim.key) || []), `${claim.sourceType}:${claim.sourceId}`]);
  const duplicateGroups = [...ownership.values()].filter((rows) => rows.length > 1);
  if (duplicateGroups.length) throw new Error(`Payment-reference migration blocked: ${duplicateGroups.length} duplicate ownership group(s)`);

  const existing = await PaymentReferenceClaim.find().lean() as any[];
  const sourceKey = (row: { sourceType: string; sourceId: number }) => `${row.sourceType}:${row.sourceId}`;
  const desiredBySource = new Map(claims.map((claim) => [sourceKey(claim), claim]));
  const conflicts = existing.filter((row) => {
    const desired = claims.find((claim) => claim.key === row.key);
    return desired && sourceKey(desired) !== sourceKey(row);
  });
  if (conflicts.length) throw new Error(`Payment-reference migration blocked: ${conflicts.length} existing ownership conflict(s)`);
  const staleClaims = existing.filter((row) => desiredBySource.has(sourceKey(row)) && desiredBySource.get(sourceKey(row))?.key !== row.key);

  const apply = process.argv.includes("--apply");
  if (apply) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        for (const claim of claims) {
          await PaymentReferenceClaim.deleteMany(
            { sourceType: claim.sourceType, sourceId: claim.sourceId, key: { $ne: claim.key } },
            { session },
          );
          await PaymentReferenceClaim.updateOne(
            { key: claim.key },
            { $set: claim },
            { upsert: true, session },
          );
        }
      });
    } finally {
      await session.endSession();
    }
  }

  console.log(JSON.stringify({
    ok: true,
    mode: apply ? "apply" : "dry-run",
    audited: claims.length,
    duplicateGroups: duplicateGroups.length,
    ownershipConflicts: conflicts.length,
    staleClaims: staleClaims.length,
    stored: await PaymentReferenceClaim.countDocuments(),
  }));
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(JSON.stringify({ ok: false, message: error instanceof Error ? error.message : "Migration failed" }));
  process.exit(1);
});

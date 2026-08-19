import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../api/queries/connection";
import { AuditLog, PaymentReferenceClaim, ThirdPartyProduct } from "../api/mongo/models";
import { normalizePaymentReference } from "../api/services/payment-reference";

async function main() {
  await connectDb();
  const apply = process.env.APPLY === "1";
  const claims = await PaymentReferenceClaim.find().select("_id key reference").lean<any[]>();
  const targets = claims.map((claim) => ({ ...claim, targetKey: normalizePaymentReference(claim.reference) }));
  const groups = new Map<string, any[]>();
  for (const row of targets) groups.set(row.targetKey, [...(groups.get(row.targetKey) ?? []), row]);
  const collisions = [...groups.values()].filter((rows) => rows.length > 1);
  if (collisions.length) throw new Error(`Cannot migrate payment references: ${collisions.length} canonical collisions require review`);

  const referenceUpdates = targets.filter((row) => row.key !== row.targetKey);
  const indexes = await ThirdPartyProduct.collection.indexes();
  const staleProviderIndexes = indexes.filter((index: any) =>
    index.unique === true
    && index.key?.providerPurchaseEnabled === 1
    && index.partialFilterExpression?.providerPurchaseEnabled === true,
  );
  const auditRows = await AuditLog.find({ operationKey: { $exists: true, $ne: null } }).select("operationKey").lean<any[]>();
  const duplicateAuditKeys = auditRows.length - new Set(auditRows.map((row) => row.operationKey)).size;
  if (duplicateAuditKeys > 0) throw new Error(`Cannot create audit operation-key index: ${duplicateAuditKeys} duplicate keys require review`);
  const auditIndexes = await AuditLog.collection.indexes();
  const hasAuditOperationIndex = auditIndexes.some((index: any) => index.key?.operationKey === 1 && index.unique === true);

  if (apply) {
    for (const row of referenceUpdates) {
      await PaymentReferenceClaim.updateOne({ _id: row._id, key: row.key }, { $set: { key: row.targetKey } });
    }
    for (const index of staleProviderIndexes) {
      if (index.name) await ThirdPartyProduct.collection.dropIndex(index.name);
    }
    if (!hasAuditOperationIndex) {
      await AuditLog.collection.createIndex({ operationKey: 1 }, { unique: true, sparse: true, name: "operationKey_1" });
    }
  }

  console.log(JSON.stringify({
    mode: apply ? "applied" : "dry-run",
    paymentReferenceClaims: claims.length,
    paymentReferenceUpdates: referenceUpdates.length,
    canonicalCollisions: collisions.length,
    staleProviderIndexes: staleProviderIndexes.length,
    auditOperationIndexPresent: hasAuditOperationIndex,
    duplicateAuditKeys,
  }));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});

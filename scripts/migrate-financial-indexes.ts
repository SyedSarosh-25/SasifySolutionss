import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../api/queries/connection";
import {
  DeliveryRecord,
  Deposit,
  InventoryItem,
  Order,
  PaymentReferenceClaim,
  ThirdPartyOrder,
  ThirdPartyProduct,
  WalletTransaction,
} from "../api/mongo/models";

type Target = {
  model: any;
  field: string;
  name: string;
  match: Record<string, unknown>;
  partialFilterExpression?: Record<string, unknown>;
  sparse?: boolean;
};

const apply = process.argv.includes("--apply");
mongoose.set("autoIndex", false);
const stringValue = (field: string) => ({ [field]: { $type: "string", $ne: "" } });
const presentValue = (field: string) => ({ [field]: { $exists: true, $ne: null } });

const targets: Target[] = [
  { model: WalletTransaction, field: "operationKey", name: "uniq_wallet_operation_key", match: stringValue("operationKey"), sparse: true },
  { model: PaymentReferenceClaim, field: "key", name: "uniq_payment_reference_key", match: stringValue("key") },
  { model: Order, field: "idempotencyKey", name: "uniq_order_idempotency_key", match: stringValue("idempotencyKey"), sparse: true },
  { model: Order, field: "paymentTxid", name: "uniq_order_payment_txid", match: stringValue("paymentTxid"), sparse: true },
  { model: Deposit, field: "txid", name: "uniq_deposit_txid", match: stringValue("txid"), sparse: true },
  { model: ThirdPartyOrder, field: "idempotencyKey", name: "uniq_marketplace_idempotency_key", match: stringValue("idempotencyKey") },
  { model: DeliveryRecord, field: "orderId", name: "uniq_delivery_order_id", match: presentValue("orderId") },
  { model: DeliveryRecord, field: "inventoryItemId", name: "uniq_delivery_inventory_item_id", match: presentValue("inventoryItemId"), sparse: true },
  { model: InventoryItem, field: "licenseKeyFingerprint", name: "uniq_inventory_license_fingerprint", match: stringValue("licenseKeyFingerprint"), sparse: true },
  { model: InventoryItem, field: "activationLinkFingerprint", name: "uniq_inventory_activation_fingerprint", match: stringValue("activationLinkFingerprint"), sparse: true },
  {
    model: ThirdPartyProduct,
    field: "providerPurchaseEnabled",
    name: "uniq_single_live_provider_product",
    match: { providerPurchaseEnabled: true },
    partialFilterExpression: { providerPurchaseEnabled: true },
  },
];

function sameKey(left: Record<string, unknown>, field: string) {
  return Object.keys(left).length === 1 && left[field] === 1;
}

async function inspectTarget(target: Target) {
  const duplicates = await target.model.aggregate([
    { $match: target.match },
    { $group: { _id: `$${target.field}`, count: { $sum: 1 }, ids: { $push: "$id" } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 20 },
  ]);
  if (duplicates.length) {
    throw new Error(`${target.name}: duplicate values exist (${duplicates.map((row: any) => `${String(row._id)}:${row.count}`).join(", ")})`);
  }

  const indexes = await target.model.collection.indexes();
  const existing = indexes.find((index: any) => sameKey(index.key, target.field));
  const compatible = Boolean(
    existing?.unique === true
    && Boolean(existing?.sparse) === Boolean(target.sparse)
    && JSON.stringify(existing?.partialFilterExpression ?? null) === JSON.stringify(target.partialFilterExpression ?? null),
  );

  if (apply && !compatible) {
    if (existing) await target.model.collection.dropIndex(existing.name);
    await target.model.collection.createIndex(
      { [target.field]: 1 },
      {
        name: target.name,
        unique: true,
        ...(target.sparse ? { sparse: true } : {}),
        ...(target.partialFilterExpression ? { partialFilterExpression: target.partialFilterExpression } : {}),
      },
    );
  }

  return {
    collection: target.model.collection.collectionName,
    field: target.field,
    duplicateGroups: duplicates.length,
    existingIndex: existing?.name ?? null,
    compatible,
    action: apply ? (compatible ? "kept" : "created") : (compatible ? "none" : "create"),
  };
}

async function main() {
  await connectDb();
  const results = [];
  for (const target of targets) results.push(await inspectTarget(target));
  console.log(JSON.stringify({ ok: true, mode: apply ? "apply" : "dry-run", results }));
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

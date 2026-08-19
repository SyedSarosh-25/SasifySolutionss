import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../api/queries/connection";
import { DeliveryRecord, InventoryItem, ThirdPartyOrder } from "../api/mongo/models";
import { credentialFingerprint, credentialWrite, revealCredential } from "../api/lib/credential-security";
import { providerDeliveryFields } from "../api/lib/provider-delivery";

const apply = process.argv.includes("--apply");
mongoose.set("autoIndex", false);
const nonEmpty = { $type: "string", $regex: /\S/ };

async function scrubDeliveries() {
  const rows = await DeliveryRecord.find({
    $or: [
      { password: nonEmpty }, { twoFaSecret: nonEmpty },
      { licenseKey: nonEmpty }, { activationLink: nonEmpty },
      { deliveredData: { $regex: /(^|\n)\s*(password|2fa(?: secret)?|license key|activation link)\s*:/i } },
    ],
  }).lean();

  const operations = rows.map((row: any) => {
    const parsed: Record<string, string> = {};
    const safeLines: string[] = [];
    for (const line of String(row.deliveredData || "").split(/\r?\n/)) {
      const match = line.match(/^\s*(email|password|2fa(?: secret)?|license key|activation link|instructions)\s*:\s*(.*)$/i);
      if (!match) {
        if (line.trim()) safeLines.push(line);
        continue;
      }
      const key = match[1].toLowerCase();
      const value = match[2].trim();
      if (key === "password") parsed.password = value;
      else if (key.startsWith("2fa")) parsed.twoFaSecret = value;
      else if (key === "license key") parsed.licenseKey = value;
      else if (key === "activation link") parsed.activationLink = value;
      else safeLines.push(line);
    }

    const password = credentialWrite(row.password || parsed.password);
    const twoFa = credentialWrite(row.twoFaSecret || parsed.twoFaSecret);
    const license = credentialWrite(row.licenseKey || parsed.licenseKey);
    const activation = credentialWrite(row.activationLink || parsed.activationLink);
    return {
      updateOne: {
        filter: { _id: row._id },
        update: {
          $set: {
            ...(password.encrypted ? { passwordEncrypted: password.encrypted } : {}),
            ...(twoFa.encrypted ? { twoFaSecretEncrypted: twoFa.encrypted } : {}),
            ...(license.encrypted ? { licenseKeyEncrypted: license.encrypted } : {}),
            ...(activation.encrypted ? { activationLinkEncrypted: activation.encrypted } : {}),
            deliveredData: safeLines.join("\n") || "Account details are available in your dashboard.",
          },
          $unset: { password: 1, twoFaSecret: 1, licenseKey: 1, activationLink: 1 },
        },
      },
    };
  });
  if (apply && operations.length) await DeliveryRecord.bulkWrite(operations);
  return operations.length;
}

async function scrubInventory() {
  const rows = await InventoryItem.find({
    $or: [
      { password: nonEmpty }, { twoFaSecret: nonEmpty },
      { licenseKey: nonEmpty }, { activationLink: nonEmpty },
    ],
  }).lean();

  const operations = rows.map((row: any) => {
    const password = credentialWrite(row.password);
    const twoFa = credentialWrite(row.twoFaSecret);
    const licenseValue = row.licenseKey || revealCredential(row.licenseKeyEncrypted);
    const activationValue = row.activationLink || revealCredential(row.activationLinkEncrypted);
    const license = credentialWrite(row.licenseKey);
    const activation = credentialWrite(row.activationLink);
    return {
      updateOne: {
        filter: { _id: row._id },
        update: {
          $set: {
            ...(password.encrypted ? { passwordEncrypted: password.encrypted } : {}),
            ...(twoFa.encrypted ? { twoFaSecretEncrypted: twoFa.encrypted } : {}),
            ...(license.encrypted ? { licenseKeyEncrypted: license.encrypted } : {}),
            ...(activation.encrypted ? { activationLinkEncrypted: activation.encrypted } : {}),
            ...(credentialFingerprint(licenseValue) ? { licenseKeyFingerprint: credentialFingerprint(licenseValue) } : {}),
            ...(credentialFingerprint(activationValue) ? { activationLinkFingerprint: credentialFingerprint(activationValue) } : {}),
          },
          $unset: { password: 1, twoFaSecret: 1, licenseKey: 1, activationLink: 1 },
        },
      },
    };
  });
  if (apply && operations.length) await InventoryItem.bulkWrite(operations, { ordered: true });
  return operations.length;
}

async function scrubMarketplaceOrders() {
  const rows = await ThirdPartyOrder.find({
    $or: [{ "items.0": { $exists: true } }, { rawOrder: { $exists: true } }],
  }).select("_id items rawOrder").lean();
  const operations = rows.map((row: any) => {
    const items = Array.isArray(row.items) ? row.items : [];
    return {
      updateOne: {
        filter: { _id: row._id },
        update: {
          ...(items.length > 0 ? { $set: providerDeliveryFields(items) } : {}),
          $unset: { rawOrder: 1, items: 1 },
        },
      },
    };
  });
  if (apply && operations.length) await ThirdPartyOrder.bulkWrite(operations, { ordered: true });
  return operations.length;
}

async function scrubLegacyProviderOrders() {
  const legacyOrderCollections = ["technysoft_orders", "canboso_orders", "akunding_orders"];
  let total = 0;
  for (const collection of legacyOrderCollections) {
    const Model = mongoose.connection.collection(collection);
    const rows = await Model.find(
      {
        $or: [
          { "items.0": { $exists: true } },
          { rawOrder: { $exists: true } },
        ],
      },
      { projection: { _id: 1 } },
    ).toArray();
    const operations = rows.map((row: any) => ({
      updateOne: {
        filter: { _id: row._id },
        update: { $unset: { items: 1, rawOrder: 1 } },
      },
    }));
    if (apply && operations.length) await Model.bulkWrite(operations, { ordered: true });
    total += operations.length;
  }
  return total;
}

async function main() {
  credentialWrite("__credential_encryption_preflight__");
  await connectDb();
  const [deliveryCandidates, inventoryCandidates, marketplaceCandidates] = await Promise.all([
    scrubDeliveries(),
    scrubInventory(),
    scrubMarketplaceOrders(),
  ]);
  const legacyCandidates = await scrubLegacyProviderOrders();
  console.log(JSON.stringify({ ok: true, mode: apply ? "apply" : "dry-run", deliveryCandidates, inventoryCandidates, marketplaceCandidates, legacyCandidates }));
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

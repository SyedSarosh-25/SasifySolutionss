import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../api/queries/connection";
import { ThirdPartyOrder, ThirdPartyProduct, clean } from "../api/mongo/models";
import { calculateCanbosoPrice, getCanbosoProduct, normalizeCanbosoProduct } from "../api/services/canboso";
import { recordAuditOnce } from "../api/services/audit-log";
import { centsToMoney, moneyToCents, runInTransaction } from "../api/services/wallet-ledger";

const orderId = Number(process.env.ORDER_ID || 45);
const apply = process.env.APPLY === "1";

async function main() {
  await connectDb();
  const order = clean(await ThirdPartyOrder.findOne({ id: orderId }).lean()) as any;
  if (!order) throw new Error(`Order ${orderId} not found`);
  if (order.provider !== "canboso" || order.thirdPartyProductId !== 49 || order.userId !== 3 || order.status !== "delivered") {
    throw new Error("Order identity/status does not match the controlled QA purchase");
  }
  const product = clean(await ThirdPartyProduct.findOne({ id: order.thirdPartyProductId }).lean()) as any;
  if (!product) throw new Error("Marketplace product not found");
  const upstream = await getCanbosoProduct(String(product.externalProductId));
  const normalized = normalizeCanbosoProduct(upstream);
  const quantity = Number(order.quantity || 1);
  const liveCostCents = moneyToCents(calculateCanbosoPrice(upstream, quantity));
  const saleCents = moneyToCents(order.priceUsd);
  const expectedCost = centsToMoney(liveCostCents);
  const expectedProfit = centsToMoney(saleCents - liveCostCents);
  const before = {
    orderId,
    priceUsd: String(order.priceUsd),
    providerCostUsd: String(order.providerCostUsd),
    profitMarginUsd: String(order.profitMarginUsd),
    liveCostUsd: expectedCost,
    expectedProfitUsd: expectedProfit,
    liveStock: Number(normalized.stock),
  };
  if (!apply) {
    console.log(JSON.stringify({ ok: true, mode: "dry-run", before }));
    return;
  }
  const result = await runInTransaction(async (session) => {
    const current = clean(await ThirdPartyOrder.findOne({ id: orderId }).session(session).lean()) as any;
    if (!current) throw new Error("Order disappeared during repair");
    if (String(current.providerCostUsd) === expectedCost && String(current.profitMarginUsd) === expectedProfit) {
      return { replayed: true };
    }
    if (String(current.providerCostUsd) !== "500.00" || String(current.profitMarginUsd) !== "-499.96") {
      throw new Error("Current accounting no longer matches the known erroneous snapshot; refusing repair");
    }
    await ThirdPartyOrder.updateOne(
      { id: orderId, providerCostUsd: "500.00", profitMarginUsd: "-499.96" },
      { $set: { providerCostUsd: expectedCost, profitMarginUsd: expectedProfit } },
      { session },
    );
    if (Number.isFinite(Number(normalized.stock)) && Number(normalized.stock) >= 0) {
      await ThirdPartyProduct.updateOne(
        { id: product.id },
        { $min: { sourceStock: Number(normalized.stock) } },
        { session },
      );
    }
    await recordAuditOnce({
      operationKey: `third-party-order:${orderId}:provider-cost-repair`,
      actorId: 3,
      action: "third_party_provider_cost_repaired",
      entityType: "third_party_order",
      entityId: orderId,
      metadata: {
        reason: "Canboso native amount field was not USD-denominated",
        oldProviderCostUsd: "500.00",
        newProviderCostUsd: expectedCost,
        oldProfitMarginUsd: "-499.96",
        newProfitMarginUsd: expectedProfit,
      },
      session,
    });
    return { replayed: false };
  });
  const after = clean(await ThirdPartyOrder.findOne({ id: orderId }).select("id priceUsd providerCostUsd profitMarginUsd status credentialsReleasedAt externalOrderId").lean());
  const artifact = { ok: true, mode: "applied", before, result, after };
  await import("node:fs/promises").then((fs) => fs.writeFile(".hermes/audit/final-real-purchase-accounting-repair.json", JSON.stringify(artifact, null, 2)));
  console.log(JSON.stringify(artifact));
}

main()
  .finally(() => mongoose.disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });

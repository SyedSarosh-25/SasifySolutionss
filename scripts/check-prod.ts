import { connectDb } from './api/queries/connection';
import { ThirdPartyProduct } from './api/mongo/models';
async function main(){ await connectDb(); const p = await ThirdPartyProduct.findOne({ id: 49 }).lean(); console.log(JSON.stringify({ providerPurchaseEnabled: p.providerPurchaseEnabled, status: p.status })); }
main().catch(console.error);

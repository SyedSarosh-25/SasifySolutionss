import mongoose, { Schema } from "mongoose";

type SequenceName =
  | "categories"
  | "users"
  | "wallet_transactions"
  | "easypaisa_transactions"
  | "nayapay_transactions"
  | "binance_pay_transactions"
  | "binance_pay_orders"
  | "binance_pay_webhook_events"
  | "deposits"
  | "products"
  | "product_plans"
  | "inventory_items"
  | "orders"
  | "delivery_records"
  | "provider_applications"
  | "support_tickets"
  | "support_replies"
  | "notifications"
  | "site_settings"
  | "audit_logs"
  | "tool_requests"
  | "scammer_reports"
  | "technysoft_orders"
  | "canboso_orders"
  | "akunding_orders"
  | "third_party_products"
  | "third_party_orders"
  | "site_builder_versions"
  | "referral_profiles"
  | "referral_attributions"
  | "reseller_applications"
  | "referral_commissions"
  | "referral_ledger_events";

const counterSchema = new Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false },
);

export const Counter =
  mongoose.models.Counter || mongoose.model("Counter", counterSchema, "counters");

export async function nextId(name: SequenceName) {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean<{ seq: number }>();
  if (!counter) throw new Error(`Failed to allocate sequence for ${name}`);
  return counter.seq;
}

const base = {
  id: { type: Number, required: true, unique: true, index: true },
};

const timestamps = {
  timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  versionKey: false as const,
};

export const User = mongoose.models.User || mongoose.model("User", new Schema({
  ...base,
  unionId: String,
  name: String,
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  passwordHash: String,
  image: String,
  role: { type: String, enum: ["user", "admin", "provider"], default: "user" },
  providerStatus: { type: String, enum: ["none", "pending", "approved", "rejected"], default: "none" },
  walletBalance: { type: String, default: "0.00" },
  lastSignInAt: { type: Date, default: Date.now },
}, timestamps), "users");

export const Category = mongoose.models.Category || mongoose.model("Category", new Schema({
  ...base,
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  seoTitle: String,
  seoDescription: String,
}, timestamps), "categories");

export const Product = mongoose.models.Product || mongoose.model("Product", new Schema({
  ...base,
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  categoryId: { type: Number, required: true, index: true },
  shortDescription: { type: String, required: true },
  description: { type: String, required: true },
  features: { type: [String], default: [] },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  fulfillmentType: { type: String, enum: ["credentials", "whatsapp_activation"], default: "credentials" },
  setupInstructions: { type: String, default: "" },
  seoTitle: String,
  seoDescription: String,
  canonicalUrl: String,
}, timestamps), "products");

export const ProductPlan = mongoose.models.ProductPlan || mongoose.model("ProductPlan", new Schema({
  ...base,
  productId: { type: Number, required: true, index: true },
  name: { type: String, required: true },
  price: { type: String, required: true },
  salePrice: String,
  deliveryTime: { type: String, required: true },
  warranty: String,
  activationMethod: String,
  isActive: { type: Boolean, default: true },
}, timestamps), "product_plans");

export const InventoryItem = mongoose.models.InventoryItem || mongoose.model("InventoryItem", new Schema({
  ...base,
  productId: { type: Number, required: true, index: true },
  planId: Number,
  providerId: Number,
  accountEmail: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  password: String,
  passwordEncrypted: String,
  twoFaSecret: String,
  twoFaSecretEncrypted: String,
  backupMethod: String,
  licenseKey: String,
  licenseKeyEncrypted: String,
  licenseKeyFingerprint: { type: String, unique: true, sparse: true },
  activationLink: String,
  activationLinkEncrypted: String,
  activationLinkFingerprint: { type: String, unique: true, sparse: true },
  instructions: String,
  notes: String,
  status: { type: String, enum: ["available", "reserved", "sold", "disabled"], default: "available" },
  reservedByOrderId: Number,
  soldToUserId: Number,
  soldAt: Date,
  assignedToUserId: Number,
  orderId: Number,
  deliveredAt: Date,
}, timestamps), "inventory_items");

export const Order = mongoose.models.Order || mongoose.model("Order", new Schema({
  ...base,
  orderNumber: { type: String, required: true, unique: true },
  idempotencyKey: { type: String, unique: true, sparse: true, index: true },
  userId: { type: Number, index: true },
  checkoutType: { type: String, enum: ["wallet", "direct"], default: "wallet" },
  guestName: String,
  guestEmail: String,
  guestWhatsapp: String,
  paymentMethod: String,
  paymentTxid: { type: String, unique: true, sparse: true, index: true },
  paymentScreenshotUrl: String,
  customerNote: String,
  productId: { type: Number, required: true },
  planId: { type: Number, required: true },
  fulfillmentType: { type: String, enum: ["credentials", "whatsapp_activation"], default: "credentials" },
  inventoryItemId: Number,
  originalPrice: { type: String, required: true },
  discountPercent: { type: String, default: "0.00" },
  discountAmount: { type: String, required: true },
  finalPrice: { type: String, required: true },
  status: { type: String, enum: ["pending", "payment_review", "paid", "processing", "pending_fulfillment", "delivered", "cancelled", "refunded", "failed"], default: "pending" },
  deliveryStatus: { type: String, enum: ["not_delivered", "pending_fulfillment", "delivered", "viewed", "support_requested"], default: "not_delivered" },
  fulfillmentNote: String,
  deliveredAt: Date,
}, timestamps), "orders");

export const DeliveryRecord = mongoose.models.DeliveryRecord || mongoose.model("DeliveryRecord", new Schema({
  ...base,
  orderId: { type: Number, required: true, unique: true, index: true },
  userId: { type: Number, required: true, index: true },
  productId: Number,
  inventoryItemId: { type: Number, unique: true, sparse: true, index: true },
  productName: String,
  accountEmail: String,
  password: String,
  passwordEncrypted: String,
  twoFaSecret: String,
  twoFaSecretEncrypted: String,
  backupMethod: String,
  licenseKey: String,
  licenseKeyEncrypted: String,
  activationLink: String,
  activationLinkEncrypted: String,
  setupInstructions: { type: [String], default: [] },
  deliveredData: { type: String, required: true },
  deliveredAt: Date,
  viewedAt: Date,
}, timestamps), "delivery_records");

export const WalletTransaction = mongoose.models.WalletTransaction || mongoose.model("WalletTransaction", new Schema({
  ...base,
  operationKey: { type: String, unique: true, sparse: true, index: true },
  userId: { type: Number, required: true, index: true },
  type: { type: String, enum: ["credit", "debit"], required: true },
  amount: { type: String, required: true },
  balanceBefore: { type: String, required: true },
  balanceAfter: { type: String, required: true },
  referenceType: { type: String, enum: ["deposit", "order", "third_party_order", "binance_pay_order", "manual_credit", "manual_debit", "refund", "referral"], required: true },
  referenceId: Number,
  note: String,
}, timestamps), "wallet_transactions");

export const Deposit = mongoose.models.Deposit || mongoose.model("Deposit", new Schema({
  ...base,
  userId: { type: Number, required: true, index: true },
  method: { type: String, enum: ["usdt_trc20", "usdt_bep20", "easypaisa", "nayapay", "jazzcash", "binance_pay"], required: true },
  amount: { type: String, required: true },
  submittedAmount: String,
  submittedCurrency: { type: String, enum: ["USD", "PKR"] },
  conversionRate: String,
  status: { type: String, enum: ["pending", "approved", "rejected", "needs_review"], default: "pending" },
  txid: { type: String, unique: true, sparse: true, index: true },
  screenshotUrl: String,
  adminNote: String,
  rejectionReason: String,
  verifiedAt: Date,
}, timestamps), "deposits");

export const BinancePayOrder = mongoose.models.BinancePayOrder || mongoose.model("BinancePayOrder", new Schema({
  ...base,
  userId: { type: Number, required: true, index: true },
  clientRequestKey: { type: String, required: true, unique: true, index: true },
  merchantTradeNo: { type: String, required: true, unique: true, index: true },
  prepayId: { type: String, unique: true, sparse: true, index: true },
  transactionId: { type: String, unique: true, sparse: true, index: true },
  amountCents: { type: Number, required: true },
  purpose: { type: String, enum: ["wallet_deposit"], default: "wallet_deposit", required: true },
  currency: { type: String, enum: ["USDT"], required: true },
  status: { type: String, enum: ["creating", "pending", "paid", "settled", "expired", "canceled", "needs_review", "create_failed"], default: "creating", index: true },
  checkoutUrl: String,
  qrcodeLink: String,
  qrContent: String,
  deeplink: String,
  universalUrl: String,
  expireTime: Date,
  providerStatus: String,
  lastQueriedAt: Date,
  nextReconcileAt: { type: Date, index: true },
  reconcileAttempts: { type: Number, default: 0 },
  createError: String,
  settledAt: Date,
}, timestamps), "binance_pay_orders");

export const BinancePayWebhookEvent = mongoose.models.BinancePayWebhookEvent || mongoose.model("BinancePayWebhookEvent", new Schema({
  ...base,
  eventDigest: { type: String, required: true, unique: true, index: true },
  certificateSerial: { type: String, required: true },
  bizId: String,
  bizType: String,
  bizStatus: String,
  merchantTradeNo: String,
  status: { type: String, enum: ["received", "processed", "ignored", "failed"], default: "received", index: true },
  processedAt: Date,
  errorCode: String,
}, timestamps), "binance_pay_webhook_events");

export const PaymentReferenceClaim = mongoose.models.PaymentReferenceClaim || mongoose.model("PaymentReferenceClaim", new Schema({
  key: { type: String, required: true, unique: true, index: true },
  reference: { type: String, required: true },
  sourceType: { type: String, enum: ["deposit", "direct_order", "binance_pay_order"], required: true },
  sourceId: { type: Number, required: true },
  userId: Number,
}, timestamps), "payment_reference_claims");

export const EasyPaisaTransaction = mongoose.models.EasyPaisaTransaction || mongoose.model("EasyPaisaTransaction", new Schema({
  ...base,
  trxId: { type: String, required: true, unique: true, index: true },
  amount: { type: String, required: true },
  senderName: String,
  senderAccount: String,
  paymentDate: Date,
  rawMessage: { type: String, required: true },
  source: String,
  status: { type: String, enum: ["pending", "claimed", "rejected"], default: "pending", index: true },
  claimedByUserId: { type: Number, index: true },
  claimedAt: Date,
  rejectionReason: String,
}, timestamps), "easypaisa_transactions");

export const NayaPayTransaction = mongoose.models.NayaPayTransaction || mongoose.model("NayaPayTransaction", new Schema({
  ...base,
  trxId: { type: String, required: true, unique: true, index: true },
  amount: { type: String, required: true },
  senderName: String,
  senderAccount: String,
  paymentDate: Date,
  rawMessage: { type: String, required: true },
  source: String,
  status: { type: String, enum: ["pending", "credited", "rejected"], default: "pending", index: true },
  creditedDepositId: { type: Number, index: true },
  creditedUserId: { type: Number, index: true },
  creditedAt: Date,
  rejectionReason: String,
}, timestamps), "nayapay_transactions");

export const BinancePayTransaction = mongoose.models.BinancePayTransaction || mongoose.model("BinancePayTransaction", new Schema({
  ...base,
  userId: { type: Number, required: true, index: true },
  merchantTradeNo: { type: String, required: true, unique: true, index: true },
  prepayId: { type: String, unique: true, sparse: true, index: true },
  transactionId: { type: String, unique: true, sparse: true, index: true },
  amount: { type: String, required: true },
  currency: { type: String, enum: ["USDT", "USDC", "BUSD"], required: true },
  status: { type: String, enum: ["pending", "paid", "claimed", "expired", "rejected"], default: "pending", index: true },
  checkoutUrl: String,
  qrcodeLink: String,
  qrContent: String,
  deeplink: String,
  universalUrl: String,
  expireTime: Date,
  paidAt: Date,
  claimedAt: Date,
  rawCreateResponse: Schema.Types.Mixed,
  rawWebhook: Schema.Types.Mixed,
  rejectionReason: String,
}, timestamps), "binance_pay_transactions");

export const TechnysoftOrder = mongoose.models.TechnysoftOrder || mongoose.model("TechnysoftOrder", new Schema({
  ...base,
  userId: { type: Number, required: true, index: true },
  externalOrderId: { type: Number, unique: true, sparse: true, index: true },
  idempotencyKey: { type: String, required: true, unique: true, index: true },
  productId: { type: Number, required: true, index: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  priceUsd: { type: String, required: true },
  status: { type: String, enum: ["pending", "processing", "delivered", "refunded", "cancelled", "failed"], default: "pending", index: true },
  activationUrl: String,
  items: { type: [Schema.Types.Mixed], default: [] },
  rawOrder: Schema.Types.Mixed,
  deliveredAt: Date,
  refundedAt: Date,
  errorCode: String,
  errorMessage: String,
}, timestamps), "technysoft_orders");

export const CanbosoOrder = mongoose.models.CanbosoOrder || mongoose.model("CanbosoOrder", new Schema({
  ...base,
  userId: { type: Number, required: true, index: true },
  externalOrderId: { type: String, unique: true, sparse: true, index: true },
  productId: { type: String, required: true, index: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  priceUsd: { type: String, required: true },
  status: { type: String, enum: ["pending", "processing", "delivered", "refunded", "cancelled", "failed"], default: "pending", index: true },
  items: { type: [Schema.Types.Mixed], default: [] },
  rawOrder: Schema.Types.Mixed,
  deliveredAt: Date,
  refundedAt: Date,
  errorCode: String,
  errorMessage: String,
}, timestamps), "canboso_orders");

export const AkundingOrder = mongoose.models.AkundingOrder || mongoose.model("AkundingOrder", new Schema({
  ...base,
  userId: { type: Number, required: true, index: true },
  externalOrderId: { type: Number, unique: true, sparse: true, index: true },
  idempotencyKey: { type: String, required: true, unique: true, index: true },
  productId: { type: Number, required: true, index: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  priceUsd: { type: String, required: true },
  status: { type: String, enum: ["pending", "processing", "delivered", "refunded", "cancelled", "failed"], default: "pending", index: true },
  items: { type: [Schema.Types.Mixed], default: [] },
  rawOrder: Schema.Types.Mixed,
  deliveredAt: Date,
  refundedAt: Date,
  errorCode: String,
  errorMessage: String,
}, timestamps), "akunding_orders");

const thirdPartyProductSchema = new Schema({
  ...base,
  provider: { type: String, enum: ["technysoft", "canboso", "akunding"], required: true, index: true },
  externalProductId: { type: String, required: true, index: true },
  duplicateKey: { type: String, required: true, index: true },
  sourceTitle: { type: String, required: true },
  sourceDescription: { type: String, default: "" },
  sourcePriceUsd: { type: String, required: true },
  sourceStock: { type: Number, default: 0 },
  originalPriceUsd: { type: String, default: "0.00" },
  originalPriceCurrency: { type: String, enum: ["USD", "PKR"], default: "USD" },
  originalPriceDisplayAmount: { type: String, default: "" },
  categoryName: { type: String, default: "3rd Party" },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  priceUsd: { type: String, required: true },
  priceCurrency: { type: String, enum: ["USD", "PKR"], default: "USD" },
  priceDisplayAmount: { type: String, default: "" },
  status: { type: String, enum: ["active", "inactive"], default: "inactive", index: true },
  instant: { type: Boolean, default: true },
  unlimited: { type: Boolean, default: false },
  providerPurchaseEnabled: { type: Boolean, default: false },
  rawProduct: Schema.Types.Mixed,
}, timestamps);
thirdPartyProductSchema.index({ providerPurchaseEnabled: 1, status: 1 });
export const ThirdPartyProduct = mongoose.models.ThirdPartyProduct || mongoose.model("ThirdPartyProduct", thirdPartyProductSchema, "third_party_products");

export const ThirdPartyOrder = mongoose.models.ThirdPartyOrder || mongoose.model("ThirdPartyOrder", new Schema({
  ...base,
  userId: { type: Number, required: true, index: true },
  thirdPartyProductId: { type: Number, required: true, index: true },
  provider: { type: String, enum: ["technysoft", "canboso", "akunding"], required: true, index: true },
  externalProductId: { type: String, required: true, index: true },
  externalOrderId: { type: String, sparse: true, index: true },
  idempotencyKey: { type: String, required: true, unique: true, index: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  priceUsd: { type: String, required: true },
  originalPriceUsd: { type: String, default: "0.00" },
  savingsUsd: { type: String, default: "0.00" },
  // Reseller margin tracking
  sellingPriceUsd: { type: String, default: "0.00" },
  providerCostUsd: { type: String, default: "0.00" },
  profitMarginUsd: { type: String, default: "0.00" },
  status: { type: String, enum: ["pending", "processing", "pending_fulfillment", "delivered", "refunded", "cancelled", "failed"], default: "pending", index: true },
  fulfillmentStatus: { type: String, enum: ["pending", "fulfilled"], default: "pending", index: true },
  items: { type: [Schema.Types.Mixed], default: [] },
  itemsEncrypted: String,
  rawOrder: Schema.Types.Mixed,
  deliveredAt: Date,
  credentialsReleasedAt: Date,
  refundedAt: Date,
  errorCode: String,
  errorMessage: String,
  reconciliationStatus: { type: String, enum: ["none", "needs_review", "resolved"], default: "none", index: true },
  reconciliationNote: String,
  reconciledAt: Date,
  reconciledBy: Number,
}, timestamps), "third_party_orders");

export const ProviderApplication = mongoose.models.ProviderApplication || mongoose.model("ProviderApplication", new Schema({
  ...base,
  userId: { type: Number, required: true, index: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  whatsappNumber: { type: String, required: true },
  serviceName: { type: String, required: true },
  availableStock: { type: Number, required: true },
  wholesalePrice: { type: String, required: true },
  deliveryMethod: { type: String, required: true },
  proofReviews: String,
  notes: String,
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  adminNote: String,
}, timestamps), "provider_applications");

const referralProfileSchema = new Schema({
  ...base,
  userId: { type: Number, required: true, unique: true, index: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  tier: { type: String, enum: ["user", "reseller"], default: "user", index: true },
  resellerStatus: { type: String, enum: ["none", "pending", "approved", "rejected"], default: "none", index: true },
  approvedAt: Date,
  approvedBy: Number,
}, timestamps);
export const ReferralProfile = mongoose.models.ReferralProfile || mongoose.model("ReferralProfile", referralProfileSchema, "referral_profiles");

const referralAttributionSchema = new Schema({
  ...base,
  referredUserId: { type: Number, required: true, unique: true, index: true },
  referrerUserId: { type: Number, required: true, index: true },
  profileId: { type: Number, required: true, index: true },
  codeSnapshot: { type: String, required: true },
  attributedAt: { type: Date, required: true, default: Date.now },
}, timestamps);
referralAttributionSchema.index({ referrerUserId: 1, attributedAt: -1 });
export const ReferralAttribution = mongoose.models.ReferralAttribution || mongoose.model("ReferralAttribution", referralAttributionSchema, "referral_attributions");

const resellerApplicationSchema = new Schema({
  ...base,
  userId: { type: Number, required: true, unique: true, index: true },
  promotionChannels: { type: String, required: true },
  audienceSize: { type: Number, required: true },
  experience: { type: String, required: true },
  notes: String,
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
  adminNote: String,
  reviewedAt: Date,
  reviewedBy: Number,
}, timestamps);
export const ResellerApplication = mongoose.models.ResellerApplication || mongoose.model("ResellerApplication", resellerApplicationSchema, "reseller_applications");

const referralCommissionSchema = new Schema({
  ...base,
  referrerUserId: { type: Number, required: true, index: true },
  referredUserId: { type: Number, required: true, index: true },
  sourceType: { type: String, enum: ["order", "third_party_order"], required: true },
  sourceId: { type: Number, required: true },
  tier: { type: String, enum: ["user", "reseller"], required: true },
  baseAmount: { type: String, required: true },
  percentage: { type: String, required: true },
  amount: { type: String, required: true },
  status: { type: String, enum: ["pending", "available", "converted", "reversed"], required: true, default: "pending", index: true },
  availableAt: { type: Date, required: true, index: true },
  convertedAt: Date,
  reversedAt: Date,
  reversalReason: String,
  reconciledAt: { type: Date, index: true },
}, timestamps);
referralCommissionSchema.index({ sourceType: 1, sourceId: 1 }, { unique: true });
referralCommissionSchema.index({ referrerUserId: 1, status: 1, createdAt: -1 });
export const ReferralCommission = mongoose.models.ReferralCommission || mongoose.model("ReferralCommission", referralCommissionSchema, "referral_commissions");

const referralLedgerEventSchema = new Schema({
  ...base,
  commissionId: { type: Number, required: true, index: true },
  userId: { type: Number, required: true, index: true },
  eventType: { type: String, enum: ["created", "released", "converted", "reversed"], required: true },
  amount: { type: String, required: true },
  dedupeKey: { type: String, required: true, unique: true, index: true },
  metadata: Schema.Types.Mixed,
}, timestamps);
export const ReferralLedgerEvent = mongoose.models.ReferralLedgerEvent || mongoose.model("ReferralLedgerEvent", referralLedgerEventSchema, "referral_ledger_events");

export const SupportTicket = mongoose.models.SupportTicket || mongoose.model("SupportTicket", new Schema({
  ...base,
  userId: { type: Number, required: true, index: true },
  orderId: Number,
  subject: { type: String, required: true },
  message: { type: String, required: true },
  attachmentName: String,
  attachmentType: String,
  attachmentSize: Number,
  attachmentUrl: String,
  status: { type: String, enum: ["open", "waiting_customer", "in_progress", "resolved", "closed"], default: "open" },
  priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
}, timestamps), "support_tickets");

export const SupportReply = mongoose.models.SupportReply || mongoose.model("SupportReply", new Schema({
  ...base,
  ticketId: { type: Number, required: true, index: true },
  senderId: { type: Number, required: true },
  message: { type: String, required: true },
}, timestamps), "support_replies");

export const Notification = mongoose.models.Notification || mongoose.model("Notification", new Schema({
  ...base,
  userId: { type: Number, required: true, index: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  readAt: Date,
}, timestamps), "notifications");

export const SiteSetting = mongoose.models.SiteSetting || mongoose.model("SiteSetting", new Schema({
  ...base,
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
}, timestamps), "site_settings");

export const SiteBuilderState = mongoose.models.SiteBuilderState || mongoose.model("SiteBuilderState", new Schema({
  ...base,
  key: { type: String, required: true, unique: true, default: "default" },
  draft: { type: Schema.Types.Mixed, required: true },
  published: { type: Schema.Types.Mixed, default: null },
  draftRevision: { type: Number, required: true, default: 0 },
  publishedRevision: { type: Number, required: true, default: 0 },
  updatedBy: Number,
  publishedBy: Number,
  publishedAt: Date,
}, timestamps), "site_builder_state");

export const SiteBuilderVersion = mongoose.models.SiteBuilderVersion || mongoose.model("SiteBuilderVersion", new Schema({
  ...base,
  version: { type: Number, required: true, unique: true, index: true },
  document: { type: Schema.Types.Mixed, required: true },
  publishedBy: Number,
  note: { type: String, default: "" },
  publishedAt: { type: Date, required: true, default: Date.now },
}, timestamps), "site_builder_versions");

export const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", new Schema({
  ...base,
  operationKey: { type: String, unique: true, sparse: true, index: true },
  actorId: Number,
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: Number,
  metadata: Schema.Types.Mixed,
  ipAddress: String,
}, timestamps), "audit_logs");

export const ToolRequest = mongoose.models.ToolRequest || mongoose.model("ToolRequest", new Schema({
  ...base,
  requesterName: { type: String, required: true },
  requesterEmail: { type: String, required: true, lowercase: true, trim: true },
  requestType: { type: String, enum: ["tool", "service"], required: true },
  itemName: { type: String, required: true },
  desiredPlan: { type: String, required: true },
  budget: { type: String, required: true },
  screenshotDataUrl: String,
  notes: String,
  status: { type: String, enum: ["new", "reviewing", "available", "replied", "closed"], default: "new" },
  adminReply: String,
  repliedAt: Date,
}, timestamps), "tool_requests");

export const ScammerReport = mongoose.models.ScammerReport || mongoose.model("ScammerReport", new Schema({
  ...base,
  userId: { type: Number, required: true, index: true },
  scammerName: { type: String, trim: true },
  phoneNumber: { type: String, required: true, trim: true, index: true },
  platform: { type: String, trim: true },
  amountLost: { type: String, trim: true },
  description: { type: String, required: true },
  proofScreenshots: { type: [String], default: [] },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
  adminNote: String,
  approvedAt: Date,
  approvedBy: Number,
}, timestamps), "scammer_reports");

export function clean<T>(doc: T): T {
  if (!doc) return doc;
  const maybeDocument = doc as unknown as { toObject?: () => T };
  const raw = typeof maybeDocument.toObject === "function"
    ? maybeDocument.toObject()
    : doc;
  const rest = { ...(raw as Record<string, unknown>) };
  delete rest._id;
  delete rest.__v;
  return rest as T;
}

export function cleanMany<T>(docs: T[]): T[] {
  return docs.map((doc) => clean(doc));
}

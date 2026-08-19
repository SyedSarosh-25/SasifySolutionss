import { connectDb } from "../api/queries/connection";
import {
  AuditLog,
  BinancePayTransaction,
  Category,
  Counter,
  DeliveryRecord,
  Deposit,
  EasyPaisaTransaction,
  InventoryItem,
  Notification,
  Order,
  Product,
  ProductPlan,
  ProviderApplication,
  SiteSetting,
  SupportReply,
  SupportTicket,
  ToolRequest,
  User,
  WalletTransaction,
} from "../api/mongo/models";

const adminHash = "pbkdf2$210000$fae2cf127caaee10d05aebe6da058b44$3b838067c9a69f63d463e254e0d4c7bb8d63db2f31e0cb129868f152722cd2d8";
const customerHash = "pbkdf2$210000$6bad4cea516a44bce6ab921a5657cfa5$62152320d616ba9a3c68fc2f18d0821e5c9ba596ca92684e9e008e64e8884360";
const providerHash = "pbkdf2$210000$9a0f7a9638cb3c25cb7e04fb30646485$c674734af4f55a580839a6c20c8b6289b14933750a43c1da915bf61bb0e7e8cf";

const collections = [
  AuditLog,
  BinancePayTransaction,
  Category,
  Counter,
  DeliveryRecord,
  Deposit,
  EasyPaisaTransaction,
  InventoryItem,
  Notification,
  Order,
  Product,
  ProductPlan,
  ProviderApplication,
  SiteSetting,
  SupportReply,
  SupportTicket,
  ToolRequest,
  User,
  WalletTransaction,
];

async function seed() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed dummy account data in production.");
  }

  await connectDb();
  await Promise.all(collections.map((model) => model.deleteMany({})));

  await Category.insertMany([
    { id: 1, name: "AI Tools", slug: "ai-tools", description: "AI-powered tools and assistants", seoTitle: "AI Tools - SASIFY Solutions", seoDescription: "Buy AI tools and subscriptions in Pakistan" },
    { id: 2, name: "AI Video", slug: "ai-video", description: "AI video generation and editing tools", seoTitle: "AI Video Tools - SASIFY Solutions", seoDescription: "AI video creation tools available in Pakistan" },
    { id: 3, name: "Design Tools", slug: "design-tools", description: "Professional design and creative software", seoTitle: "Design Tools - SASIFY Solutions", seoDescription: "Premium design tools for creatives in Pakistan" },
    { id: 4, name: "Business Tools", slug: "business-tools", description: "Business and productivity software", seoTitle: "Business Tools - SASIFY Solutions", seoDescription: "Business productivity tools Pakistan" },
  ]);

  await Product.insertMany([
    {
      id: 1,
      name: "Cursor Premium",
      slug: "cursor-premium",
      categoryId: 1,
      shortDescription: "Premium coding assistant access for developers and teams.",
      description: "Cursor Premium gives you advanced AI coding workflows, multi-model support, and fast development assistance through a managed Sasify plan.",
      features: ["Premium AI coding assistant", "Multiple leading models", "Secure account delivery", "Ticket support included"],
      status: "active",
      setupInstructions: [
        "Open the official Cursor login page.",
        "Enter the delivered email and password.",
        "When asked for 2FA, use the provided 2FA secret/code.",
        "After login, open account/security settings.",
        "Change the email to your personal email if Cursor allows it.",
        "Update password and recovery options if supported.",
        "Save changes and confirm everything is working.",
      ].join("\n"),
      seoTitle: "Cursor Premium - SASIFY Solutions",
      seoDescription: "Buy Cursor Premium access with wallet checkout and automated delivery.",
    },
    {
      id: 2,
      name: "SuperGrok Plan",
      slug: "supergrok-plan",
      categoryId: 1,
      shortDescription: "Grok access for AI chat, lookup, images, and creative work.",
      description: "SuperGrok Plan includes fast AI chat workflows, real-time lookup features, and creative tools delivered through your Sasify dashboard.",
      features: ["AI chat and lookup", "Image generation tools", "Fast activation", "Private support tickets"],
      status: "active",
      setupInstructions: [
        "Open the official Grok login page.",
        "Enter the delivered email and password.",
        "Use the provided 2FA secret/code if prompted.",
        "Open account/security settings after login.",
        "Change recovery details if the platform allows it.",
        "Update password and backup options if supported.",
        "Save changes and test the login once.",
      ].join("\n"),
      seoTitle: "SuperGrok Plan - SASIFY Solutions",
      seoDescription: "Buy SuperGrok Plan through SASIFY Solutions.",
    },
    {
      id: 4,
      name: "ChatGPT Plus",
      slug: "chatgpt-plus",
      categoryId: 1,
      shortDescription: "Private ChatGPT Plus account delivered automatically after purchase.",
      description: "ChatGPT Plus access delivered through the customer dashboard with email, password, and 2FA details.",
      features: ["ChatGPT Plus access", "Private account credentials", "2FA details included", "Dashboard delivery"],
      status: "active",
      setupInstructions: [
        "Open the official ChatGPT login page.",
        "Enter the delivered email and password.",
        "When asked for 2FA, use the provided 2FA secret/code.",
        "After login, open account/security settings.",
        "Change the email to your personal email if OpenAI allows it.",
        "Update password and recovery options if supported.",
        "Save changes and confirm ChatGPT Plus is active.",
      ].join("\n"),
      seoTitle: "ChatGPT Plus - SASIFY Solutions",
      seoDescription: "Buy ChatGPT Plus with secure dashboard delivery.",
    },
  ]);

  await ProductPlan.insertMany([
    { id: 1, productId: 1, name: "Monthly", price: "25.00", salePrice: "20.00", deliveryTime: "1-24 hours", warranty: "30 days replacement", activationMethod: "Dashboard delivery", isActive: true },
    { id: 2, productId: 1, name: "Quarterly", price: "65.00", salePrice: "55.00", deliveryTime: "1-24 hours", warranty: "90 days support", activationMethod: "Dashboard delivery", isActive: true },
    { id: 3, productId: 2, name: "3 Months", price: "35.00", salePrice: "30.00", deliveryTime: "1-12 hours", warranty: "3 months support", activationMethod: "Dashboard delivery", isActive: true },
    { id: 5, productId: 4, name: "Monthly", price: "25.00", salePrice: "20.00", deliveryTime: "Instant-12 hours", warranty: "30 days replacement", activationMethod: "Dashboard delivery", isActive: true },
  ]);

  await SiteSetting.insertMany([
    { id: 1, key: "site_name", value: "SASIFY Solutions" },
    { id: 2, key: "support_email", value: "support@sasify.solutions" },
    { id: 3, key: "whatsapp_number", value: "+92-300-1234567" },
    { id: 4, key: "nayapay_payment_details", value: "NayaPay: 03450485711 - Syed Adeen Sarosh" },
    { id: 5, key: "easypaisa_payment_details", value: "EasyPaisa: 03155430404 - Syed Adeen Sarosh" },
    { id: 6, key: "jazzcash_payment_details", value: "" },
    { id: 7, key: "usdt_wallet", value: "TXXXXXXXXXXXXXXXXXXXXXXXXXXXX" },
    { id: 8, key: "usdt_bep20_wallet", value: "" },
    { id: 9, key: "binance_pay_id", value: "515591853" },
    { id: 10, key: "binance_pay_name", value: "SyedSarosh" },
    { id: 11, key: "binance_pay_nickname", value: "" },
    { id: 12, key: "binance_pay_qr_url", value: "https://i.ibb.co/F9cSZBb/IMG-1689.png" },
  ]);

  await User.insertMany([
    { id: 1, name: "Ayesha Khan", email: "ayesha@example.com", passwordHash: customerHash, role: "user", providerStatus: "none", walletBalance: "131.00", lastSignInAt: new Date() },
    { id: 2, name: "Hamza Ali", email: "hamza@example.com", passwordHash: customerHash, role: "user", providerStatus: "none", walletBalance: "42.50", lastSignInAt: new Date() },
    { id: 3, name: "Sasify Admin", email: "admin@sasify.solutions", passwordHash: adminHash, role: "admin", providerStatus: "none", walletBalance: "0.00", lastSignInAt: new Date() },
    { id: 4, name: "Verified Supplier", email: "provider@sasify.solutions", passwordHash: providerHash, role: "provider", providerStatus: "approved", walletBalance: "0.00", lastSignInAt: new Date() },
  ]);

  await InventoryItem.insertMany([
    { id: 1, productId: 1, planId: 1, accountEmail: "cursor-demo-1@sasify.solutions", email: "cursor-demo-1@sasify.solutions", password: "DemoPass!2026", twoFaSecret: "CURSOR-DEMO-2FA", instructions: "Login with supplied credentials and change recovery details after first login.", status: "available" },
    { id: 2, productId: 1, planId: 2, accountEmail: "cursor-quarter@sasify.solutions", email: "cursor-quarter@sasify.solutions", password: "QuarterPass!2026", twoFaSecret: "CURSOR-QUARTER-2FA", instructions: "Quarterly access credential.", status: "available" },
    { id: 3, productId: 2, planId: 3, accountEmail: "grok-demo@sasify.solutions", email: "grok-demo@sasify.solutions", password: "GrokDemo!2026", twoFaSecret: "GROK-DEMO-2FA", activationLink: "https://grok.com", status: "available" },
    { id: 5, productId: 1, planId: 1, accountEmail: "delivered-cursor@sasify.solutions", email: "delivered-cursor@sasify.solutions", password: "DeliveredPass!2026", twoFaSecret: "DELIVERED-CURSOR-2FA", status: "sold", assignedToUserId: 1, soldToUserId: 1, orderId: 1, reservedByOrderId: 1, deliveredAt: new Date(), soldAt: new Date() },
  ]);

  await Order.insertMany([
    { id: 1, orderNumber: "SAS-20260626-1001", userId: 1, productId: 1, planId: 1, inventoryItemId: 5, originalPrice: "20.00", discountPercent: "5.00", discountAmount: "1.00", finalPrice: "19.00", status: "delivered", deliveryStatus: "delivered" },
    { id: 2, orderNumber: "SAS-20260626-1002", userId: 2, productId: 2, planId: 3, originalPrice: "30.00", discountPercent: "5.00", discountAmount: "1.50", finalPrice: "28.50", status: "processing", deliveryStatus: "not_delivered" },
  ]);

  await DeliveryRecord.create({
    id: 1,
    orderId: 1,
    userId: 1,
    productId: 1,
    inventoryItemId: 5,
    productName: "Cursor Premium",
    accountEmail: "delivered-cursor@sasify.solutions",
    password: "DeliveredPass!2026",
    twoFaSecret: "DELIVERED-CURSOR-2FA",
    setupInstructions: [
      "Open the official Cursor login page.",
      "Enter the delivered email and password.",
      "When asked for 2FA, use the provided 2FA secret/code.",
      "After login, open account/security settings.",
      "Change the email to your personal email if Cursor allows it.",
      "Update password and recovery options if supported.",
      "Save changes and confirm everything is working.",
    ],
    deliveredData: "Email: delivered-cursor@sasify.solutions\nPassword: DeliveredPass!2026\n2FA: DELIVERED-CURSOR-2FA",
    deliveredAt: new Date(),
  });

  await Deposit.insertMany([
    { id: 1, userId: 1, method: "usdt_trc20", amount: "150.00", status: "approved", txid: "0xDEMOHASH001", verifiedAt: new Date() },
    { id: 2, userId: 2, method: "easypaisa", amount: "50.00", status: "pending" },
  ]);

  await WalletTransaction.insertMany([
    { id: 1, userId: 1, type: "credit", amount: "150.00", balanceBefore: "0.00", balanceAfter: "150.00", referenceType: "deposit", referenceId: 1, note: "Deposit approved" },
    { id: 2, userId: 1, type: "debit", amount: "19.00", balanceBefore: "150.00", balanceAfter: "131.00", referenceType: "order", referenceId: 1, note: "Order SAS-20260626-1001" },
  ]);

  await SupportTicket.insertMany([
    { id: 1, userId: 1, orderId: 1, subject: "Need help changing recovery email", message: "The account works. Please guide me through securing the recovery email.", status: "waiting_customer", priority: "medium" },
    { id: 2, userId: 2, subject: "SuperGrok delivery status", message: "Can you confirm when my account will be delivered?", status: "open", priority: "high" },
  ]);

  await SupportReply.create({ id: 1, ticketId: 1, senderId: 3, message: "Open account settings, choose Security, then replace the recovery email. Reply here if you see any verification prompt." });

  await ProviderApplication.create({ id: 1, userId: 4, fullName: "Verified Supplier", email: "provider@sasify.solutions", whatsappNumber: "+92-300-0000000", serviceName: "AI subscription inventory", availableStock: 40, wholesalePrice: "$5-$25", deliveryMethod: "Dashboard credential delivery", status: "approved", adminNote: "Approved supplier" });

  await ToolRequest.insertMany([
    {
      id: 1,
      requesterName: "Zain Malik",
      requesterEmail: "zain@example.com",
      requestType: "tool",
      itemName: "LinkedIn Sales Navigator",
      desiredPlan: "Monthly individual plan",
      budget: "$25 - $50",
      notes: "Need one account for lead generation work.",
      status: "new",
    },
    {
      id: 2,
      requesterName: "Sara Ahmed",
      requesterEmail: "sara@example.com",
      requestType: "service",
      itemName: "AI video editing service",
      desiredPlan: "One-time project",
      budget: "$50 - $100",
      notes: "Need short ad video editing for a product launch.",
      status: "reviewing",
      adminReply: "We are checking supplier availability.",
      repliedAt: new Date(),
    },
  ]);

  await Notification.insertMany([
    { id: 1, userId: 1, type: "order_delivered", title: "Order delivered", message: "Your Cursor Premium credentials are ready." },
    { id: 2, userId: 2, type: "order_created", title: "Order processing", message: "Your SuperGrok order is being fulfilled." },
  ]);

  await AuditLog.insertMany([
    { id: 1, actorId: 1, action: "email_placeholder_generated", entityType: "order", entityId: 1, metadata: { status: "delivery_ready" } },
    { id: 2, actorId: 3, action: "seed_completed", entityType: "system", metadata: { database: "mongodb_atlas" } },
  ]);

  await Counter.insertMany([
    { _id: "categories", seq: 4 },
    { _id: "users", seq: 4 },
    { _id: "wallet_transactions", seq: 2 },
    { _id: "easypaisa_transactions", seq: 0 },
    { _id: "nayapay_transactions", seq: 0 },
    { _id: "binance_pay_transactions", seq: 0 },
    { _id: "deposits", seq: 2 },
    { _id: "products", seq: 4 },
    { _id: "product_plans", seq: 5 },
    { _id: "inventory_items", seq: 5 },
    { _id: "orders", seq: 2 },
    { _id: "delivery_records", seq: 1 },
    { _id: "provider_applications", seq: 1 },
    { _id: "support_tickets", seq: 2 },
    { _id: "support_replies", seq: 1 },
    { _id: "notifications", seq: 2 },
    { _id: "site_settings", seq: 12 },
    { _id: "audit_logs", seq: 2 },
    { _id: "tool_requests", seq: 2 },
  ]);

  process.stdout.write("MongoDB Atlas seed complete.\n");
  process.exit(0);
}

seed().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});

export type UserRole = "user" | "admin" | "provider";
export type ProviderStatus = "none" | "pending" | "approved" | "rejected";

export type User = {
  id: number;
  unionId?: string | null;
  name?: string | null;
  email?: string | null;
  passwordHash?: string | null;
  image?: string | null;
  role: UserRole;
  providerStatus: ProviderStatus;
  walletBalance: string;
  createdAt: Date;
  updatedAt: Date;
  lastSignInAt: Date;
};

export type InsertUser = Partial<Omit<User, "id" | "createdAt" | "updatedAt">> & {
  id?: number;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
  shortDescription: string;
  description: string;
  features: string[];
  status: "active" | "inactive";
  setupInstructions?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductPlan = {
  id: number;
  productId: number;
  name: string;
  price: string;
  salePrice?: string | null;
  deliveryTime: string;
  warranty?: string | null;
  activationMethod?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type InventoryStatus = "available" | "reserved" | "sold" | "disabled";

export type InventoryItem = {
  id: number;
  productId: number;
  planId?: number | null;
  providerId?: number | null;
  accountEmail?: string | null;
  email?: string | null;
  password?: string | null;
  passwordEncrypted?: string | null;
  twoFaSecret?: string | null;
  twoFaSecretEncrypted?: string | null;
  backupMethod?: string | null;
  licenseKey?: string | null;
  activationLink?: string | null;
  instructions?: string | null;
  notes?: string | null;
  status: InventoryStatus;
  reservedByOrderId?: number | null;
  soldToUserId?: number | null;
  soldAt?: Date | null;
  assignedToUserId?: number | null;
  orderId?: number | null;
  deliveredAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderStatus =
  | "pending"
  | "payment_review"
  | "paid"
  | "processing"
  | "pending_fulfillment"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "failed";

export type DeliveryStatus =
  | "not_delivered"
  | "pending_fulfillment"
  | "delivered"
  | "viewed"
  | "support_requested";

export type Order = {
  id: number;
  orderNumber: string;
  userId?: number | null;
  checkoutType: "wallet" | "direct";
  productId: number;
  planId: number;
  inventoryItemId?: number | null;
  finalPrice: string;
  status: OrderStatus;
  deliveryStatus: DeliveryStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type DeliveryRecord = {
  id: number;
  orderId: number;
  userId: number;
  productId?: number | null;
  inventoryItemId?: number | null;
  productName?: string | null;
  accountEmail?: string | null;
  password?: string | null;
  passwordEncrypted?: string | null;
  twoFaSecret?: string | null;
  twoFaSecretEncrypted?: string | null;
  backupMethod?: string | null;
  licenseKey?: string | null;
  activationLink?: string | null;
  setupInstructions: string[];
  deliveredData: string;
  deliveredAt?: Date | null;
  viewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ScammerReportStatus = "pending" | "approved" | "rejected";

export type ScammerReport = {
  id: number;
  userId: number;
  scammerName?: string | null;
  phoneNumber: string;
  platform?: string | null;
  amountLost?: string | null;
  description: string;
  proofScreenshots: string[];
  status: ScammerReportStatus;
  adminNote?: string | null;
  approvedAt?: Date | null;
  approvedBy?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

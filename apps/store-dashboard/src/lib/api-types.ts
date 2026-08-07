// Mirrors admin-panel's lib/api-types.ts convention: types describing the
// ACTUAL JSON the API returns, not the idealized domain types in
// @commerceos/types.

export type Role =
  | "MASTER_ADMIN"
  | "STORE_OWNER"
  | "STORE_MANAGER"
  | "INVENTORY_MANAGER"
  | "ORDER_MANAGER"
  | "CUSTOMER_SUPPORT";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  storeId: string | null;
}

export type StoreStatus = "PENDING_SETUP" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export interface StoreDetail {
  id: string;
  name: string;
  slug: string;
  status: StoreStatus;
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export type RiskLevel = "NONE" | "CAUTION" | "HIGH_RISK";

export interface RecentOrder {
  id: string;
  status: string;
  total: string;
  createdAt: string;
  customer: { id: string; name: string; phone: string; riskLevel: RiskLevel };
}

export interface StoreDashboardSummary {
  ordersToday: number;
  revenueThisMonth: string;
  pendingCodConfirmations: number;
  lowStockProductCount: number;
  salesTrend: Array<{ date: string; orderCount: number }>;
  recentOrders: RecentOrder[];
}

export type OrderStatus = "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "RETURNED" | "CANCELLED";
export type CourierName = "PATHAO" | "STEADFAST" | "REDX" | "OTHER";

export interface CustomerSummary {
  id: string;
  name: string;
  phone: string;
  riskLevel: RiskLevel;
}

export interface CustomerOrderSummary {
  id: string;
  status: OrderStatus;
  total: string;
  createdAt: string;
}

export interface CustomerDetail extends CustomerSummary {
  storeId: string;
  totalOrders: number;
  deliveredOrders: number;
  refusedOrders: number;
  createdAt: string;
  addresses: Array<{ id: string; label: string | null; recipientName: string; phone: string; addressLine: string; city: string; isDefault: boolean }>;
  orders: CustomerOrderSummary[];
}

export interface OrderListItem {
  id: string;
  status: OrderStatus;
  total: string;
  paymentMethod: string;
  codConfirmedByCall: boolean;
  createdAt: string;
  customer: CustomerSummary;
}

export interface OrderItemDetail {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: string;
  product: { id: string; name: string };
  variant: { id: string; sku: string; attributes: Record<string, string> };
}

export interface OrderStatusHistoryEntry {
  id: string;
  status: OrderStatus;
  actorId: string | null;
  note: string | null;
  createdAt: string;
}

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  attributes: Record<string, string>;
  stock: number;
  priceOverride: string | null;
  isActive: boolean;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  altText: string | null;
  displayOrder: number;
  createdAt: string;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string;
  categoryId: string | null;
  category: Category | null;
  basePrice: string;
  status: ProductStatus;
  slug: string;
  lowStockThreshold: number;
  createdAt: string;
  variants: ProductVariant[];
  images: ProductImage[];
}

export interface OrderDetail {
  id: string;
  storeId: string;
  customerId: string;
  status: OrderStatus;
  paymentMethod: string;
  codConfirmedByCall: boolean;
  codCallNote: string | null;
  callAttempts: number;
  deliveryAddress: string;
  courierName: CourierName | null;
  courierTrackingId: string | null;
  courierStatusNote: string | null;
  cancelledReason: string | null;
  isPaid: boolean;
  total: string;
  createdAt: string;
  updatedAt: string;
  customer: CustomerDetail;
  items: OrderItemDetail[];
  statusHistory: OrderStatusHistoryEntry[];
}

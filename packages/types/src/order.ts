// Per SRS Part 9.1
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "RETURNED"
  | "CANCELLED";

// Per SRS Part 9.2 - COD is the only active V1 method; V2 values reserved so no
// schema migration is needed when V2 payment features are added (Part 11.2/11.3).
export type PaymentMethod =
  | "CASH_ON_DELIVERY"
  | "MANUAL_BKASH_VERIFICATION" // reserved, unused until V2
  | "AUTOMATED_GATEWAY"; // reserved, unused until V2

export interface OrderItem {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  storeId: string;
  customerId: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  // Per SRS Part 9.3 - set after staff calls to confirm intent before shipment
  codConfirmedByCall: boolean;
  items: OrderItem[];
  total: number;
  createdAt: string;
}

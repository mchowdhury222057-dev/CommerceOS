import { api } from "../lib/api-client";
import type { CourierName, OrderDetail, OrderListItem, OrderStatus } from "../lib/api-types";

export interface ListOrdersResult {
  orders: OrderListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export function listOrders(storeId: string, filters: { status?: OrderStatus[]; page?: number } = {}): Promise<ListOrdersResult> {
  const query = new URLSearchParams();
  if (filters.status?.length) query.set("status", filters.status.join(","));
  if (filters.page) query.set("page", String(filters.page));
  const qs = query.toString();
  return api.get<ListOrdersResult>(`/api/store/${storeId}/orders${qs ? `?${qs}` : ""}`);
}

export function getOrder(storeId: string, orderId: string): Promise<{ order: OrderDetail }> {
  return api.get<{ order: OrderDetail }>(`/api/store/${storeId}/orders/${orderId}`);
}

export function updateOrderStatus(
  storeId: string,
  orderId: string,
  input: { status: OrderStatus; note?: string; codConfirmOverrideReason?: string },
): Promise<{ order: OrderDetail }> {
  return api.patch<{ order: OrderDetail }>(`/api/store/${storeId}/orders/${orderId}/status`, input);
}

export function confirmCod(
  storeId: string,
  orderId: string,
  input: { outcome: "CONFIRMED" | "NO_ANSWER" | "DECLINED"; note?: string },
): Promise<{ order: OrderDetail }> {
  return api.patch<{ order: OrderDetail }>(`/api/store/${storeId}/orders/${orderId}/confirm-cod`, input);
}

export function updateCourier(
  storeId: string,
  orderId: string,
  input: { courierName: CourierName; courierTrackingId: string },
): Promise<{ order: OrderDetail }> {
  return api.patch<{ order: OrderDetail }>(`/api/store/${storeId}/orders/${orderId}/courier`, input);
}

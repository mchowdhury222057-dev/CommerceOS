import { api } from "../lib/api-client";
import type { OrderView, Product, PublicStore } from "../lib/api-types";

export function getStoreInfo(storeSlug: string): Promise<PublicStore> {
  return api.get<PublicStore>(`/api/storefront/${storeSlug}`);
}

export function listProducts(storeSlug: string): Promise<{ products: Product[] }> {
  return api.get<{ products: Product[] }>(`/api/storefront/${storeSlug}/products`);
}

export function getProduct(storeSlug: string, productId: string): Promise<{ product: Product }> {
  return api.get<{ product: Product }>(`/api/storefront/${storeSlug}/products/${productId}`);
}

export interface CheckoutInput {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  customerNote?: string;
  items: Array<{ productId: string; variantId: string; quantity: number }>;
}

export function checkout(storeSlug: string, input: CheckoutInput): Promise<{ order: OrderView }> {
  return api.post<{ order: OrderView }>(`/api/storefront/${storeSlug}/checkout`, input);
}

export function lookupOrders(storeSlug: string, phone: string): Promise<{ orders: OrderView[] }> {
  return api.get<{ orders: OrderView[] }>(`/api/storefront/${storeSlug}/orders?phone=${encodeURIComponent(phone)}`);
}

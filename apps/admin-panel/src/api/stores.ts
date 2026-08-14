import { api } from "../lib/api-client";
import type { AdminStore, StoreStatus } from "../lib/api-types";

export interface ListStoresResult {
  stores: AdminStore[];
  total: number;
  page: number;
  pageSize: number;
}

export function listStores(params: { search?: string; status?: StoreStatus[]; page?: number; pageSize?: number } = {}): Promise<ListStoresResult> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status?.length) query.set("status", params.status.join(","));
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  const qs = query.toString();
  return api.get<ListStoresResult>(`/api/admin/stores${qs ? `?${qs}` : ""}`);
}

export interface CreateStoreInput {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerName: string;
}

export interface CreateStoreResult {
  store: AdminStore;
  inviteToken: string;
}

export function createStore(input: CreateStoreInput): Promise<CreateStoreResult> {
  return api.post<CreateStoreResult>("/api/admin/stores", input);
}

export function setStoreStatus(
  storeId: string,
  input: { status: "APPROVED" | "SUSPENDED" | "REJECTED"; reason?: string },
): Promise<{ store: AdminStore }> {
  return api.patch<{ store: AdminStore }>(`/api/admin/stores/${storeId}/status`, input);
}

export function getStore(storeId: string): Promise<{ store: AdminStore }> {
  return api.get<{ store: AdminStore }>(`/api/admin/stores/${storeId}`);
}

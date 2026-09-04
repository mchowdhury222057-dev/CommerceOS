import { api } from "../lib/api-client";
import type { CustomerDetail, CustomerSummary, RiskLevel } from "../lib/api-types";

export interface ListCustomersResult {
  customers: CustomerSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export function listCustomers(
  storeId: string,
  filters: { riskLevel?: RiskLevel[]; search?: string; page?: number; pageSize?: number } = {},
): Promise<ListCustomersResult> {
  const query = new URLSearchParams();
  if (filters.riskLevel?.length) query.set("riskLevel", filters.riskLevel.join(","));
  if (filters.search) query.set("search", filters.search);
  if (filters.page) query.set("page", String(filters.page));
  if (filters.pageSize) query.set("pageSize", String(filters.pageSize));
  const qs = query.toString();
  return api.get<ListCustomersResult>(`/api/store/${storeId}/customers${qs ? `?${qs}` : ""}`);
}

export function getCustomer(storeId: string, customerId: string): Promise<{ customer: CustomerDetail }> {
  return api.get<{ customer: CustomerDetail }>(`/api/store/${storeId}/customers/${customerId}`);
}

export function getRiskLevelDistribution(storeId: string): Promise<{ distribution: Record<RiskLevel, number> }> {
  return api.get<{ distribution: Record<RiskLevel, number> }>(`/api/store/${storeId}/customers/risk-summary`);
}

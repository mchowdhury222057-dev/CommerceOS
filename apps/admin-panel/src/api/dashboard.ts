import { api } from "../lib/api-client";
import type { DashboardSummary, PlatformRevenue, RevenueRangeDays, StoreGrowth } from "../lib/api-types";

export function getDashboardSummary(): Promise<DashboardSummary> {
  return api.get<DashboardSummary>("/api/admin/dashboard");
}

export function getPlatformRevenue(rangeDays: RevenueRangeDays): Promise<PlatformRevenue> {
  return api.get<PlatformRevenue>(`/api/admin/analytics/revenue?range=${rangeDays}`);
}

export function getStoreGrowth(): Promise<StoreGrowth> {
  return api.get<StoreGrowth>("/api/admin/analytics/store-growth");
}

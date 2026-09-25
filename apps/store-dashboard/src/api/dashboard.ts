import { api } from "../lib/api-client";
import type { AnalyticsRangeDays, StoreAnalytics, StoreDashboardSummary } from "../lib/api-types";

export function getStoreDashboardSummary(storeId: string): Promise<StoreDashboardSummary> {
  return api.get<StoreDashboardSummary>(`/api/store/${storeId}/dashboard`);
}

export function getStoreAnalytics(storeId: string, rangeDays: AnalyticsRangeDays): Promise<StoreAnalytics> {
  return api.get<StoreAnalytics>(`/api/store/${storeId}/analytics?range=${rangeDays}`);
}

import { api } from "../lib/api-client";
import type { StoreDashboardSummary } from "../lib/api-types";

export function getStoreDashboardSummary(storeId: string): Promise<StoreDashboardSummary> {
  return api.get<StoreDashboardSummary>(`/api/store/${storeId}/dashboard`);
}

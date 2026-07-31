import { api } from "../lib/api-client";
import type { DashboardSummary } from "../lib/api-types";

export function getDashboardSummary(): Promise<DashboardSummary> {
  return api.get<DashboardSummary>("/api/admin/dashboard");
}

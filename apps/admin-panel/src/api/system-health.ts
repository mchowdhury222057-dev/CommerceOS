import { api } from "../lib/api-client";
import type { SystemHealth } from "../lib/api-types";

export function getSystemHealth(): Promise<SystemHealth> {
  return api.get<SystemHealth>("/api/admin/system-health");
}

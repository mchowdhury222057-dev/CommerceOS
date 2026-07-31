import { api } from "../lib/api-client";
import type { AuditLogEntry } from "../lib/api-types";

export interface AuditLogFilters {
  storeId?: string;
  actorId?: string;
  action?: string;
  impersonationOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ListAuditLogsResult {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export function listAuditLogs(filters: AuditLogFilters = {}): Promise<ListAuditLogsResult> {
  const query = new URLSearchParams();
  if (filters.storeId) query.set("storeId", filters.storeId);
  if (filters.actorId) query.set("actorId", filters.actorId);
  if (filters.action) query.set("action", filters.action);
  if (filters.impersonationOnly) query.set("impersonationOnly", "true");
  if (filters.dateFrom) query.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) query.set("dateTo", filters.dateTo);
  if (filters.page) query.set("page", String(filters.page));
  if (filters.pageSize) query.set("pageSize", String(filters.pageSize));
  const qs = query.toString();
  return api.get<ListAuditLogsResult>(`/api/admin/audit-logs${qs ? `?${qs}` : ""}`);
}

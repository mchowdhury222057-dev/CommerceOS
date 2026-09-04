import { api } from "../lib/api-client";
import type { AdminVerificationDetail, AdminVerificationListItem, VerificationStatus } from "../lib/api-types";

export interface ListVerificationsResult {
  verifications: AdminVerificationListItem[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<VerificationStatus, number>;
}

export function listVerifications(
  params: { search?: string; status?: VerificationStatus[]; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number } = {},
): Promise<ListVerificationsResult> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status?.length) query.set("status", params.status.join(","));
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  const qs = query.toString();
  return api.get<ListVerificationsResult>(`/api/admin/verifications${qs ? `?${qs}` : ""}`);
}

// Per Section 14/15 - opening this also transitions SUBMITTED ->
// UNDER_REVIEW server-side (the "admin opened application" audit event),
// so simply loading the review page is itself a meaningful action.
export function getVerificationDetail(verificationId: string): Promise<{ verification: AdminVerificationDetail }> {
  return api.get<{ verification: AdminVerificationDetail }>(`/api/admin/verifications/${verificationId}`);
}

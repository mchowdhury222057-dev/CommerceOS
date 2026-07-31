import { api } from "../lib/api-client";
import type { ImpersonationSession } from "../lib/api-types";

export interface StartImpersonationResult {
  session: ImpersonationSession;
  impersonationToken: string;
  expiresAt: string;
}

export function startImpersonation(storeId: string, reason: string): Promise<StartImpersonationResult> {
  return api.post<StartImpersonationResult>(`/api/admin/stores/${storeId}/impersonate/start`, { reason });
}

export function endImpersonation(sessionId: string): Promise<void> {
  return api.post<void>("/api/admin/impersonate/end", { sessionId });
}

export function getActiveImpersonationSession(): Promise<{ session: ImpersonationSession | null }> {
  return api.get<{ session: ImpersonationSession | null }>("/api/admin/impersonate/active");
}

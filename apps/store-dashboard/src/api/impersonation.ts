import { api } from "../lib/api-client";

// Ends whichever session the current (impersonation) token's own
// impersonationSessionId claim identifies - the same endpoint the Admin
// Panel's own banner calls, hit directly here since this app has no
// admin-panel session to relay the request through. CORS already allows
// this origin (see apps/api's CORS_ORIGIN default).
export function endImpersonation(): Promise<void> {
  return api.post<void>("/api/admin/impersonate/end", {});
}

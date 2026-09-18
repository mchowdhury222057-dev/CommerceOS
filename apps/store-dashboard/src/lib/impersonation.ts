import { useAuthStore } from "../stores/auth.store";
import { endImpersonation } from "../api/impersonation";
import type { AuthUser } from "./api-types";

const ADMIN_PANEL_URL = (import.meta.env.VITE_ADMIN_PANEL_URL as string | undefined) ?? "http://localhost:5173";
const IMPERSONATE_PARAM = "impersonate";

// Decoding is display-only (populates the auth store/UI - who to show as
// "Impersonating", which store to scope queries to). It is NOT the
// security boundary: every request still carries the raw token as-is, and
// the server re-verifies its signature (requireAuth) and Redis-tracked
// liveness (requireStoreAccess) on every single call, exactly like any
// other access token. Nothing here needs to be trusted client-side.
function decodeJwtPayload(token: string): AuthUser | null {
  try {
    const payloadSegment = token.split(".")[1];
    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64)) as AuthUser;
    return payload;
  } catch {
    return null;
  }
}

// Per Part 15.2 - the Admin Panel starts a session, then hands off by
// navigating the browser here with the token in the URL (a real
// cross-origin page load, not an SPA route - see admin-panel's
// StoreManagementPage). Called once at boot, before the normal
// cookie-based bootstrapSession(), so an impersonation token always wins
// over whatever the Admin's own refresh cookie would otherwise restore.
export function tryConsumeImpersonationToken(): boolean {
  const params = new URLSearchParams(window.location.search);
  const token = params.get(IMPERSONATE_PARAM);
  if (!token) return false;

  const user = decodeJwtPayload(token);
  if (!user?.impersonationSessionId) return false;

  useAuthStore.getState().setSession(token, user);

  // Strip the token out of the address bar/history - it's a live
  // credential and has no reason to linger there once adopted.
  params.delete(IMPERSONATE_PARAM);
  const nextSearch = params.toString();
  window.history.replaceState({}, "", `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`);
  return true;
}

// Shared by the Impersonation Banner's "Stop Impersonating" and the
// Sidebar's Logout button when impersonating (a normal logout would just
// strand the Admin on this app's own /login screen, which they have no
// Store Owner credentials for).
export async function stopImpersonating(): Promise<void> {
  try {
    await endImpersonation();
  } finally {
    useAuthStore.getState().clear();
    window.location.href = ADMIN_PANEL_URL;
  }
}

import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";

// Per SRS Part 4.2 - every store-dashboard route requires an authenticated,
// store-scoped user. A Master Administrator's own plain login token is
// never accepted here (Part B.2.1: their access to a store's pages only
// ever exists through an active impersonation session) - only a
// MASTER_ADMIN identity that also carries an impersonationSessionId claim
// (minted by impersonation.service.ts's startImpersonation and adopted via
// lib/impersonation.ts's tryConsumeImpersonationToken) is let through. The
// actual authorization boundary is enforced server-side (requireStoreAccess
// re-checks the session is live on every request); this only prevents a
// flash of protected UI before a redirect.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-default border-t-primary" aria-label="Loading" />
      </div>
    );
  }
  const isImpersonatingAdmin = user?.role === "MASTER_ADMIN" && Boolean(user.impersonationSessionId);
  if (status === "unauthenticated" || !user || (user.role === "MASTER_ADMIN" && !isImpersonatingAdmin) || !user.storeId) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

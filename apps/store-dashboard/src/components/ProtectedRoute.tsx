import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";

// Per SRS Part 4.2 - every store-dashboard route requires an authenticated,
// store-scoped user. A Master Administrator's own login token is never
// accepted here (Part B.2.1: their access to a store's pages only ever
// exists through an active impersonation session in apps/admin-panel), so
// role === "MASTER_ADMIN" is rejected the same way an unauthenticated
// request is. The actual authorization boundary is enforced server-side
// (requireStoreAccess); this only prevents a flash of protected UI before a
// redirect.
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
  if (status === "unauthenticated" || !user || user.role === "MASTER_ADMIN" || !user.storeId) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

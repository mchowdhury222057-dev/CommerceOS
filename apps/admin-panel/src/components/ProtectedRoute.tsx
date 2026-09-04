import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";

// Per SRS Part 4.2 - every admin-panel route requires an authenticated
// MASTER_ADMIN. The actual authorization boundary is enforced server-side
// (requireMasterAdmin, Part O.8); this only prevents a flash of protected UI
// before a redirect, and denies non-Master-Admin roles the same way -
// there is no other role this app is built for.
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
  if (status === "unauthenticated" || !user || user.role !== "MASTER_ADMIN") {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

import { useQuery } from "@tanstack/react-query";
import { getMyStore } from "../api/store";
import { useAuthStore } from "../stores/auth.store";
import { Layout } from "./Layout";
import PendingApprovalPage from "../pages/PendingApprovalPage";
import RejectedPage from "../pages/RejectedPage";
import SuspendedPage from "../pages/SuspendedPage";

// Per Section 19/23 - the single point that decides whether a Store Owner
// sees the real Dashboard/Sidebar/TopNav at all. Sits between
// ProtectedRoute (auth only) and Layout in the router tree, so a
// non-APPROVED store never even mounts the Sidebar/TopNav/Outlet - not
// just a message inside the dashboard content area, per Section 9's
// explicit "no navigation, no store design/preview" requirement. Backend
// enforcement (Section 24's requireApprovedStore) is what actually
// protects the APIs; this only controls what renders client-side.
export function StoreAccessGate() {
  const storeId = useAuthStore((s) => s.user?.storeId);
  const storeQuery = useQuery({
    queryKey: ["my-store", storeId],
    queryFn: () => getMyStore(storeId as string),
    enabled: Boolean(storeId),
  });

  if (storeQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-default border-t-primary" aria-label="Loading" />
      </div>
    );
  }
  if (storeQuery.isError || !storeQuery.data) {
    return <div className="flex min-h-screen items-center justify-center text-status-danger">Could not load your store. Please try again shortly.</div>;
  }

  const { store } = storeQuery.data;

  if (store.status === "PENDING") return <PendingApprovalPage />;
  if (store.status === "REJECTED") return <RejectedPage reason={store.rejectedReason} />;
  if (store.status === "SUSPENDED") return <SuspendedPage reason={store.suspendedReason} />;
  if (store.status === "ARCHIVED") return <SuspendedPage reason="This store has been archived." />;

  return <Layout />;
}

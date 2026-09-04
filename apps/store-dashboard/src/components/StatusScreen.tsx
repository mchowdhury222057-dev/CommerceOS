import type { ReactNode } from "react";
import { Button } from "@commerceos/ui";
import { logout } from "../api/auth";
import { useAuthStore } from "../stores/auth.store";

// Per Section 9's exact requirement - logo, message, Logout only. No
// Dashboard/Products/Orders/Analytics/Storefront links, no Sidebar, no
// TopNav, nothing that implies the owner has access beyond this screen.
// Shared by PendingApprovalPage/RejectedPage/SuspendedPage - each only
// supplies its own icon/title/body.
export function StatusScreen({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  const clear = useAuthStore((s) => s.clear);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clear();
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-page px-4">
      <div className="w-full max-w-sm rounded-xl border border-border-default bg-surface-card p-8 text-center shadow-card">
        <div className="mb-4 flex items-center justify-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">C</span>
          <span className="text-sm font-bold tracking-tight text-text-primary">CommerceOS</span>
        </div>
        <div className="mb-4 flex justify-center">{icon}</div>
        <h1 className="mb-2 text-lg font-bold text-text-primary">{title}</h1>
        <div className="mb-6 text-sm leading-relaxed text-text-secondary">{children}</div>
        <Button variant="secondary" onClick={handleLogout} className="w-full">
          Logout
        </Button>
      </div>
    </div>
  );
}

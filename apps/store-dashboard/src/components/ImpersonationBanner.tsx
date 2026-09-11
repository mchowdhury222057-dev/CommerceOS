import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@commerceos/ui";
import { stopImpersonating } from "../lib/impersonation";
import { useAuthStore } from "../stores/auth.store";
import type { StoreDetail } from "../lib/api-types";

// Per Part 15.2/Section 5 - persistent, unmissable, for the entire
// duration of the session, so the Admin can never mistake this for their
// own Store Owner account. Same amber-impersonation token admin-panel's
// own banner uses (packages/ui's shared preset), for one consistent
// "impersonation mode" visual language across both apps.
export function ImpersonationBanner({ store }: { store: StoreDetail | undefined }) {
  const user = useAuthStore((s) => s.user);
  const [ending, setEnding] = useState(false);

  if (!user?.impersonationSessionId) return null;

  async function handleStop() {
    setEnding(true);
    await stopImpersonating();
  }

  return (
    <div
      role="status"
      className="flex items-center justify-between gap-4 bg-amber-impersonation px-6 py-3 text-sm font-medium text-slate-900"
    >
      <span className="flex items-center gap-2">
        <ShieldAlert size={16} aria-hidden="true" />
        Admin mode — Impersonating: <strong>{store?.owner?.email ?? "…"}</strong>
      </span>
      <Button variant="secondary" size="sm" loading={ending} onClick={handleStop}>
        Stop Impersonating
      </Button>
    </div>
  );
}

import { ShieldOff } from "lucide-react";
import { StatusScreen } from "../components/StatusScreen";

const ADMIN_EMAIL = "admin@commerceos.dev";

// Section 21 - Owner sees only "Store Suspended" + reason + support
// contact + Logout.
export default function SuspendedPage({ reason }: { reason: string | null }) {
  return (
    <StatusScreen icon={<ShieldOff size={40} className="text-status-danger" aria-hidden="true" />} title="Store Suspended">
      <p>Your store has been suspended and is temporarily unavailable.</p>
      {reason && <p className="mt-3 rounded-lg bg-status-danger/10 px-3.5 py-2.5 text-text-primary">{reason}</p>}
      <p className="mt-3">
        Contact support at{" "}
        <a href={`mailto:${ADMIN_EMAIL}`} className="font-medium text-primary hover:underline">
          {ADMIN_EMAIL}
        </a>{" "}
        to resolve this.
      </p>
    </StatusScreen>
  );
}

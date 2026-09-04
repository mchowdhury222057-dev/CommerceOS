import { XCircle } from "lucide-react";
import { StatusScreen } from "../components/StatusScreen";

const ADMIN_EMAIL = "admin@commerceos.dev";

// Section 20 - Owner sees only "Application Rejected" + reason + support
// contact + Logout.
export default function RejectedPage({ reason }: { reason: string | null }) {
  return (
    <StatusScreen icon={<XCircle size={40} className="text-status-danger" aria-hidden="true" />} title="Application Rejected">
      <p>Your store application was not approved.</p>
      {reason && <p className="mt-3 rounded-lg bg-status-danger/10 px-3.5 py-2.5 text-text-primary">{reason}</p>}
      <p className="mt-3">
        If you believe this is a mistake, contact support at{" "}
        <a href={`mailto:${ADMIN_EMAIL}`} className="font-medium text-primary hover:underline">
          {ADMIN_EMAIL}
        </a>
        .
      </p>
    </StatusScreen>
  );
}

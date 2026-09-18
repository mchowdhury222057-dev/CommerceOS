import { ClipboardCheck } from "lucide-react";
import { StatusScreen } from "../components/StatusScreen";

// Email verification has been removed from this flow (per the "email
// verification is not required" decision) - this is now a single static
// screen with no sub-states, no resend action, and no mention of email.
// Logo, status, Logout only (Section 9's original requirement, still true).
export default function PendingApprovalPage() {
  return (
    <StatusScreen icon={<ClipboardCheck size={40} className="text-primary" aria-hidden="true" />} title="Application Submitted">
      <p>Your store application has been received and is pending approval.</p>
      <p className="mt-2">Your store is now waiting for admin approval. You will be able to log in after your application has been approved.</p>
    </StatusScreen>
  );
}

import { Clock, MailCheck, ShieldCheck } from "lucide-react";
import { StatusScreen } from "../components/StatusScreen";
import type { VerificationStatus } from "../lib/api-types";

// Section 9 - extremely simple: logo, status, "check your email" prompt,
// Logout only. No Dashboard/Products/Orders/Analytics/Storefront links.
// Content adapts to the verification sub-state (Section 12's "Verification
// Submitted / Under Review" is the same route, not a separate page) -
// "Application Submitted" always refers to the signup itself; the prompt
// underneath changes depending on whether verification has been completed yet.
export default function PendingApprovalPage({ verificationStatus }: { verificationStatus: VerificationStatus | undefined }) {
  const awaitingVerification = !verificationStatus || verificationStatus === "NOT_STARTED" || verificationStatus === "IN_PROGRESS";

  if (awaitingVerification) {
    return (
      <StatusScreen icon={<MailCheck size={40} className="text-primary" aria-hidden="true" />} title="Application Submitted">
        <p>Your store application has been received and is pending approval.</p>
        <p className="mt-2">Check your email for a link to complete your store verification - it only takes a few minutes.</p>
      </StatusScreen>
    );
  }

  return (
    <StatusScreen icon={<ShieldCheck size={40} className="text-primary" aria-hidden="true" />} title="Verification Submitted">
      <p>Thanks - your verification details have been submitted.</p>
      <p className="mt-2 flex items-center justify-center gap-1.5 font-medium text-text-primary">
        <Clock size={14} aria-hidden="true" />
        Under review by our team
      </p>
      <p className="mt-2">We'll email you as soon as a decision is made.</p>
    </StatusScreen>
  );
}

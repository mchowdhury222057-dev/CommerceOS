import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@commerceos/ui";
import { ArrowLeft, Building2, Check, FileText, ShieldCheck, User } from "lucide-react";
import { getVerificationDetail } from "../api/verifications";
import { listAuditLogs } from "../api/audit-logs";
import { setStoreStatus } from "../api/stores";
import { toast } from "../components/ui/Toaster";
import { ApiError } from "../lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import type { BadgeTone } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { ConfirmDialog, PromptDialog } from "../components/ui/ConfirmDialog";
import type { StoreStatus, VerificationStatus } from "../lib/api-types";

const STORE_STATUS_LABEL: Record<StoreStatus, string> = {
  PENDING: "Pending Approval",
  APPROVED: "Active",
  SUSPENDED: "Suspended",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
};

const STORE_STATUS_TONE: Record<StoreStatus, BadgeTone> = {
  PENDING: "caution",
  APPROVED: "success",
  SUSPENDED: "danger",
  REJECTED: "danger",
  ARCHIVED: "neutral",
};

const VERIFICATION_STATUS_LABEL: Record<VerificationStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  VERIFIED: "Approved",
  REJECTED: "Rejected",
};

const VERIFICATION_STATUS_TONE: Record<VerificationStatus, BadgeTone> = {
  NOT_STARTED: "neutral",
  IN_PROGRESS: "neutral",
  SUBMITTED: "caution",
  UNDER_REVIEW: "info",
  VERIFIED: "success",
  REJECTED: "danger",
};

type PendingAction = { kind: "approve" } | { kind: "reject" } | { kind: "suspend" } | null;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-text-secondary">{label}</div>
      <div className="mt-1 text-sm text-text-primary">{value}</div>
    </div>
  );
}

function DocumentLink({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border-default px-3.5 py-2.5">
      <span className="flex items-center gap-2 text-sm text-text-primary">
        <FileText size={15} className="text-text-secondary" aria-hidden="true" />
        {label}
      </span>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline">
          View document
        </a>
      ) : (
        <span className="text-xs text-text-disabled">Not provided</span>
      )}
    </div>
  );
}

// Per Section 15 - the full review page for a single store's verification
// application: Owner Info, Store Info, Verification Info (identity/
// documents), and Application History, plus the same three Approve/
// Reject/Suspend actions as Store Management (Section 16-21) - this page
// is simply a more detailed entry point into the same store-status
// transitions, not a parallel action set.
export default function VerificationReviewPage() {
  const { verificationId = "" } = useParams<{ verificationId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const detailQuery = useQuery({
    queryKey: ["verification-detail", verificationId],
    queryFn: () => getVerificationDetail(verificationId),
    enabled: Boolean(verificationId),
  });

  const verification = detailQuery.data?.verification;

  // "Review started" isn't its own column on Verification (Section 15 just
  // wants it surfaced, not a new persisted field) - it's sourced from the
  // audit trail's VerificationReviewOpened entry, reusing the existing
  // AuditLog mechanism rather than adding a duplicate timestamp column.
  const reviewOpenedQuery = useQuery({
    queryKey: ["verification-review-opened", verification?.storeId],
    queryFn: () => listAuditLogs({ storeId: verification!.storeId, action: "VerificationReviewOpened", pageSize: 1 }),
    enabled: Boolean(verification?.storeId),
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: "APPROVED" | "SUSPENDED" | "REJECTED"; reason?: string }) =>
      setStoreStatus(verification!.storeId, { status, reason }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["verification-detail", verificationId] });
      queryClient.invalidateQueries({ queryKey: ["verifications"] });
      const message = variables.status === "SUSPENDED" ? "Store suspended" : variables.status === "REJECTED" ? "Application rejected" : "Store approved";
      toast.success(message);
      setPendingAction(null);
      navigate("/verifications");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update store status"),
  });

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (detailQuery.isError || !verification) {
    return <p className="text-sm text-status-danger">Could not load this verification application. It may not exist.</p>;
  }

  const reviewOpenedAt = reviewOpenedQuery.data?.entries[0]?.createdAt ?? null;
  const storeStatus = verification.store.status;

  return (
    <div>
      <Link to="/verifications" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary">
        <ArrowLeft size={15} aria-hidden="true" />
        Back to Verification Center
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">{verification.store.name}</h1>
          <p className="mt-0.5 text-sm text-text-secondary">{verification.store.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={STORE_STATUS_TONE[storeStatus]}>Store: {STORE_STATUS_LABEL[storeStatus]}</Badge>
          <Badge tone={VERIFICATION_STATUS_TONE[verification.status]}>Verification: {VERIFICATION_STATUS_LABEL[verification.status]}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User size={15} aria-hidden="true" />
                Owner Information
              </CardTitle>
            </CardHeader>
            <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name" value={verification.fullName ?? verification.owner.name} />
              <Field label="Phone" value={verification.phone ?? verification.owner.phone ?? "—"} />
              <Field label="Email" value={verification.owner.email} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 size={15} aria-hidden="true" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Store name" value={verification.store.name} />
              <Field label="Business type" value={verification.businessType ?? "—"} />
              <div className="sm:col-span-2">
                <Field label="Business address" value={verification.businessAddress ?? "—"} />
              </div>
              <div className="sm:col-span-2">
                <Field label="Description" value={verification.description ?? "—"} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck size={15} aria-hidden="true" />
                Identity Verification
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <Field label="NID number" value={verification.nidNumber ?? "—"} />
              <DocumentLink label="NID document" url={verification.nidDocumentUrl} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={15} aria-hidden="true" />
                Business Documents
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <Field label="Trade license number" value={verification.tradeLicenseNumber ?? "—"} />
              <DocumentLink label="Trade license document" url={verification.tradeLicenseDocumentUrl} />
              <DocumentLink label="Supporting document" url={verification.supportingDocumentUrl} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {(storeStatus === "PENDING" || storeStatus === "SUSPENDED") && (
                <Button variant="primary" className="w-full" onClick={() => setPendingAction({ kind: "approve" })}>
                  Approve
                </Button>
              )}
              {storeStatus === "PENDING" && (
                <Button variant="destructive" className="w-full" onClick={() => setPendingAction({ kind: "reject" })}>
                  Reject
                </Button>
              )}
              {storeStatus === "APPROVED" && (
                <Button variant="secondary" className="w-full" onClick={() => setPendingAction({ kind: "suspend" })}>
                  Suspend
                </Button>
              )}
              {storeStatus === "REJECTED" && <p className="text-xs text-text-secondary">This application was rejected and requires no further action.</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Application History</CardTitle>
            </CardHeader>
            <CardBody>
              <ol className="space-y-4">
                <TimelineItem label="Application created" at={verification.createdAt} />
                {verification.submittedAt && <TimelineItem label="Verification submitted" at={verification.submittedAt} />}
                {reviewOpenedAt && <TimelineItem label="Review started" at={reviewOpenedAt} />}
                {verification.reviewedAt && (
                  <TimelineItem
                    label={`Decision made: ${verification.status === "VERIFIED" ? "Approved" : "Rejected"}${verification.reviewedByUser ? ` by ${verification.reviewedByUser.name}` : ""}`}
                    at={verification.reviewedAt}
                  />
                )}
              </ol>
              {verification.status === "REJECTED" && verification.rejectionReason && (
                <p className="mt-4 rounded-lg bg-status-danger/10 p-3 text-xs text-status-danger">Reason: {verification.rejectionReason}</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={pendingAction?.kind === "approve"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title="Approve this store?"
        description={
          storeStatus === "SUSPENDED" ? `"${verification.store.name}" will become visible to customers again.` : `"${verification.store.name}" will go live immediately.`
        }
        confirmLabel="Approve"
        loading={statusMutation.isPending}
        onConfirm={() => statusMutation.mutate({ status: "APPROVED" })}
      />

      <PromptDialog
        open={pendingAction?.kind === "reject"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title="Reject this application?"
        description={`Provide a reason for rejecting "${verification.store.name}"'s application.`}
        label="Reason for rejecting"
        confirmLabel="Reject"
        destructive
        loading={statusMutation.isPending}
        onSubmit={(reason) => statusMutation.mutate({ status: "REJECTED", reason })}
      />

      <PromptDialog
        open={pendingAction?.kind === "suspend"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title="Suspend this store?"
        description={`Provide a reason for suspending "${verification.store.name}".`}
        label="Reason for suspending"
        confirmLabel="Suspend"
        destructive
        loading={statusMutation.isPending}
        onSubmit={(reason) => statusMutation.mutate({ status: "SUSPENDED", reason })}
      />
    </div>
  );
}

function TimelineItem({ label, at }: { label: string; at: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Check size={12} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div className="text-sm text-text-primary">{label}</div>
        <div className="text-xs text-text-secondary">{new Date(at).toLocaleString()}</div>
      </div>
    </li>
  );
}

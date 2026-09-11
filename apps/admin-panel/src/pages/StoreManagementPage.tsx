import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Paintbrush, Store as StoreIcon, UserCog } from "lucide-react";
import { Button } from "@commerceos/ui";
import { toast } from "../components/ui/Toaster";
import { createStore, listStores, setStoreStatus } from "../api/stores";
import { startImpersonation } from "../api/impersonation";
import { ApiError } from "../lib/api-client";
import { Badge } from "../components/ui/Badge";
import type { BadgeTone } from "../components/ui/Badge";
import { SectionHeader } from "../components/ui/SectionHeader";
import { SearchBar } from "../components/ui/SearchBar";
import { Input } from "../components/ui/Input";
import { Table, TBody, TD, TH, THead, TR, TableState } from "../components/ui/Table";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { Pagination } from "../components/ui/Pagination";
import { ConfirmDialog, PromptDialog } from "../components/ui/ConfirmDialog";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import type { AdminStore, StoreStatus } from "../lib/api-types";

const STATUS_LABEL: Record<StoreStatus, string> = {
  PENDING: "Pending Approval",
  APPROVED: "Active",
  SUSPENDED: "Suspended",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
};

const STATUS_TONE: Record<StoreStatus, BadgeTone> = {
  PENDING: "caution",
  APPROVED: "success",
  SUSPENDED: "danger",
  REJECTED: "danger",
  ARCHIVED: "neutral",
};

const PAGE_SIZE = 15;

// Same VITE_*_URL-with-localhost-fallback convention already used for the
// Theme Editor's "preview live storefront" link (ThemeManagementPage.tsx) -
// the Store Dashboard is a separate app/origin, so entering it after
// Impersonate is a real browser navigation, not an in-app route change.
const STORE_DASHBOARD_URL = (import.meta.env.VITE_STORE_DASHBOARD_URL as string | undefined) ?? "http://localhost:5174";

// "approve" covers BOTH a brand-new PENDING application and a previously
// SUSPENDED store - one button, one code path, per this milestone's
// amendment. The backend's approveStore already merges these; this is
// just the frontend half of that same unification (the button always
// reads "Approve", never "Reactivate").
type PendingAction =
  | { kind: "approve"; store: AdminStore }
  | { kind: "reject-reason"; store: AdminStore }
  | { kind: "suspend-reason"; store: AdminStore }
  | { kind: "impersonate-reason"; store: AdminStore }
  | { kind: "impersonate-confirm"; store: AdminStore; reason: string }
  | null;

// Per SRS Part 22.4's canonical Store Management pattern: a searchable
// data table with status pills, a direct Edit Theme action per row, and
// an amber-outlined Impersonate action requiring confirmation. No Delete
// or Reset Password actions here yet - both need new backend work first
// (see this milestone's Section B).
export default function StoreManagementPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["stores", search, page],
    queryFn: () => listStores({ search: search || undefined, page, pageSize: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });

  const statusMutation = useMutation({
    mutationFn: ({ storeId, status, reason }: { storeId: string; status: "APPROVED" | "SUSPENDED" | "REJECTED"; reason?: string }) =>
      setStoreStatus(storeId, { status, reason }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      const message = variables.status === "SUSPENDED" ? "Store suspended" : variables.status === "REJECTED" ? "Application rejected" : "Store approved";
      toast.success(message);
      setPendingAction(null);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update store status"),
  });

  const impersonateMutation = useMutation({
    mutationFn: ({ storeId, reason }: { storeId: string; reason: string }) => startImpersonation(storeId, reason),
    // Starting the session is only half the job - the Admin actually has to
    // END UP on the Store Owner dashboard. The Store Dashboard is a
    // different app/origin, so this is a real page navigation carrying the
    // impersonation token, not a client-side route change; that app's own
    // boot sequence (main.tsx) picks the token up from the URL, adopts it
    // as its session, and shows the Impersonation Banner from there.
    onSuccess: (result) => {
      toast.success("Impersonation session started - opening the Store Owner dashboard…");
      window.location.href = `${STORE_DASHBOARD_URL}/?impersonate=${encodeURIComponent(result.impersonationToken)}`;
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not start impersonation"),
  });

  return (
    <div>
      <SectionHeader
        title="Store Management"
        description="Every store on the platform, and the entry point into theme editing and impersonation."
        actions={
          <Button variant="primary" onClick={() => setShowCreateForm((v) => !v)}>
            {showCreateForm ? "Cancel" : "+ Create Store"}
          </Button>
        }
      />

      {showCreateForm && (
        <CreateStoreForm
          onCreated={() => {
            setShowCreateForm(false);
            queryClient.invalidateQueries({ queryKey: ["stores"] });
          }}
        />
      )}

      <SearchBar
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder="Search stores by name…"
        className="mb-4 max-w-sm"
      />

      <Table footer={data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />}>
        <THead>
          <tr>
            <TH>Store</TH>
            <TH>Owner</TH>
            <TH>Status</TH>
            <TH>Created</TH>
            <TH className="text-right">Actions</TH>
          </tr>
        </THead>
        <TBody>
          {isLoading && Array.from({ length: 5 }, (_, i) => <TableRowSkeleton key={i} columns={5} />)}
          {isError && (
            <TableState colSpan={5} tone="danger">
              Could not load stores. Retry shortly.
            </TableState>
          )}
          {!isLoading && !isError && data?.stores.length === 0 && (
            <TableState colSpan={5}>{search ? "No stores match your search." : "No stores yet. Create your first store to get started."}</TableState>
          )}
          {data?.stores.map((store) => (
            <TR key={store.id}>
              <TD>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary" aria-hidden="true">
                    <StoreIcon size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-text-primary">{store.name}</div>
                    <div className="text-xs text-text-secondary">{store.slug}</div>
                  </div>
                </div>
              </TD>
              <TD>
                {store.owner ? (
                  <>
                    <div className="text-text-primary">{store.owner.name}</div>
                    <div className="text-xs text-text-secondary">{store.owner.email}</div>
                  </>
                ) : (
                  <span className="text-text-secondary">No owner</span>
                )}
              </TD>
              <TD>
                <Badge tone={STATUS_TONE[store.status]}>{STATUS_LABEL[store.status]}</Badge>
              </TD>
              <TD className="text-text-secondary">{new Date(store.createdAt).toLocaleDateString()}</TD>
              <TD>
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    aria-label={`View activity for ${store.name}`}
                    title="View Store Activity"
                    onClick={() => navigate(`/stores/${store.id}/activity`)}
                    className="rounded-md p-2 text-text-secondary transition-colors hover:bg-surface-sunken hover:text-primary"
                  >
                    <Activity size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Edit theme for ${store.name}`}
                    title="Edit Theme"
                    onClick={() => navigate(`/stores/${store.id}/theme`)}
                    className="rounded-md p-2 text-text-secondary transition-colors hover:bg-surface-sunken hover:text-primary"
                  >
                    <Paintbrush size={16} aria-hidden="true" />
                  </button>
                  {(store.status === "PENDING" || store.status === "SUSPENDED") && (
                    <Button variant="primary" size="sm" onClick={() => setPendingAction({ kind: "approve", store })}>
                      Approve
                    </Button>
                  )}
                  {store.status === "PENDING" && (
                    <Button variant="destructive" size="sm" onClick={() => setPendingAction({ kind: "reject-reason", store })}>
                      Reject
                    </Button>
                  )}
                  {store.status === "APPROVED" && (
                    <Button variant="secondary" size="sm" onClick={() => setPendingAction({ kind: "suspend-reason", store })}>
                      Suspend
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPendingAction({ kind: "impersonate-reason", store })}
                    disabled={impersonateMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-md border border-amber-impersonation px-3 py-1.5 text-sm font-medium text-amber-impersonation transition-colors hover:bg-amber-impersonation/10 disabled:opacity-50"
                  >
                    <UserCog size={16} aria-hidden="true" />
                    Impersonate
                  </button>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <ConfirmDialog
        open={pendingAction?.kind === "approve"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title="Approve this store?"
        description={
          pendingAction?.kind === "approve"
            ? pendingAction.store.status === "SUSPENDED"
              ? `"${pendingAction.store.name}" will become visible to customers again.`
              : `"${pendingAction.store.name}" will go live immediately.`
            : undefined
        }
        confirmLabel="Approve"
        loading={statusMutation.isPending}
        onConfirm={() => pendingAction?.kind === "approve" && statusMutation.mutate({ storeId: pendingAction.store.id, status: "APPROVED" })}
      />

      <PromptDialog
        open={pendingAction?.kind === "reject-reason"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title="Reject this application?"
        description={pendingAction?.kind === "reject-reason" ? `Provide a reason for rejecting "${pendingAction.store.name}"'s application.` : undefined}
        label="Reason for rejecting"
        confirmLabel="Reject"
        destructive
        loading={statusMutation.isPending}
        onSubmit={(reason) => pendingAction?.kind === "reject-reason" && statusMutation.mutate({ storeId: pendingAction.store.id, status: "REJECTED", reason })}
      />

      <PromptDialog
        open={pendingAction?.kind === "suspend-reason"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title="Suspend this store?"
        description={pendingAction?.kind === "suspend-reason" ? `Provide a reason for suspending "${pendingAction.store.name}".` : undefined}
        label="Reason for suspending"
        confirmLabel="Suspend"
        destructive
        loading={statusMutation.isPending}
        onSubmit={(reason) => pendingAction?.kind === "suspend-reason" && statusMutation.mutate({ storeId: pendingAction.store.id, status: "SUSPENDED", reason })}
      />

      <PromptDialog
        open={pendingAction?.kind === "impersonate-reason"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title="Impersonate this store's owner?"
        description={pendingAction?.kind === "impersonate-reason" ? `Why are you impersonating the Store Owner of "${pendingAction.store.name}"?` : undefined}
        label="Reason"
        confirmLabel="Continue"
        onSubmit={(reason) => pendingAction?.kind === "impersonate-reason" && setPendingAction({ kind: "impersonate-confirm", store: pendingAction.store, reason })}
      />

      <ConfirmDialog
        open={pendingAction?.kind === "impersonate-confirm"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title="Confirm impersonation"
        description={pendingAction?.kind === "impersonate-confirm" ? `You are about to act AS the Store Owner of "${pendingAction.store.name}". Continue?` : undefined}
        confirmLabel="Start Session"
        destructive
        loading={impersonateMutation.isPending}
        onConfirm={() => pendingAction?.kind === "impersonate-confirm" && impersonateMutation.mutate({ storeId: pendingAction.store.id, reason: pendingAction.reason })}
      />
    </div>
  );
}

function CreateStoreForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inviteToken: string } | null>(null);

  const mutation = useMutation({
    mutationFn: createStore,
    onSuccess: (data) => {
      setResult({ inviteToken: data.inviteToken });
      onCreated();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not create store"),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate({ name, slug, ownerName, ownerEmail });
  }

  return (
    <Card className="animate-panel-in mb-6">
      <CardHeader>
        <CardTitle>Create a new store</CardTitle>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Store name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} required placeholder="acme-shop" />
            <Input label="Owner name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
            <Input label="Owner email" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} required />
          </div>
          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-status-danger/10 px-3.5 py-2.5 text-sm text-status-danger">
              {error}
            </p>
          )}
          {result && (
            <p className="mt-3 rounded-lg bg-primary-subtle p-3 text-xs text-text-primary">
              Store created. Owner invite token (no email dispatch yet - relay manually):{" "}
              <code className="break-all">{result.inviteToken}</code>
            </p>
          )}
          <Button type="submit" variant="primary" loading={mutation.isPending} className="mt-4">
            Create Store
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

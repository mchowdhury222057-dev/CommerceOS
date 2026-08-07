import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Paintbrush, UserCog } from "lucide-react";
import { Button, StatusBadge } from "@commerceos/ui";
import type { StatusTone } from "@commerceos/ui";
import { createStore, listStores, setStoreStatus } from "../api/stores";
import { startImpersonation } from "../api/impersonation";
import { ApiError } from "../lib/api-client";
import type { AdminStore, StoreStatus } from "../lib/api-types";

const STATUS_TONE: Record<StoreStatus, StatusTone> = {
  PENDING_SETUP: "caution",
  ACTIVE: "success",
  SUSPENDED: "danger",
  ARCHIVED: "neutral",
};

// Per SRS Part 22.4's canonical Store Management pattern: a searchable,
// filterable data table with status pills, a direct Edit Theme action per
// row, and an amber-outlined Impersonate action requiring confirmation.
export default function StoreManagementPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["stores", search],
    queryFn: () => listStores({ search: search || undefined }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ storeId, status, reason }: { storeId: string; status: "ACTIVE" | "SUSPENDED"; reason?: string }) =>
      setStoreStatus(storeId, { status, reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stores"] }),
  });

  const impersonateMutation = useMutation({
    mutationFn: ({ storeId, reason }: { storeId: string; reason: string }) => startImpersonation(storeId, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["impersonation", "active"] }),
  });

  function handleToggleStatus(store: AdminStore) {
    if (store.status === "ACTIVE") {
      const reason = window.prompt(`Reason for suspending "${store.name}"?`);
      if (!reason) return;
      statusMutation.mutate({ storeId: store.id, status: "SUSPENDED", reason });
    } else if (store.status === "SUSPENDED") {
      statusMutation.mutate({ storeId: store.id, status: "ACTIVE" });
    }
  }

  // Per SRS Part 6.2 - a distinct action from Suspend/Reactivate: approving
  // moves a brand-new store out of Pending Setup for the first time.
  function handleApprove(store: AdminStore) {
    if (!window.confirm(`Approve "${store.name}" and make it live?`)) return;
    statusMutation.mutate({ storeId: store.id, status: "ACTIVE" });
  }

  function handleImpersonate(store: AdminStore) {
    const reason = window.prompt(`Why are you impersonating the Store Owner of "${store.name}"?`);
    if (!reason) return;
    if (!window.confirm(`You are about to act AS the Store Owner of "${store.name}". Continue?`)) return;
    impersonateMutation.mutate({ storeId: store.id, reason });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Store Management</h1>
          <p className="text-sm text-text-secondary">Every store on the platform, and the entry point into theme editing and impersonation.</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateForm((v) => !v)}>
          {showCreateForm ? "Cancel" : "Create Store"}
        </Button>
      </div>

      {showCreateForm && (
        <CreateStoreForm
          onCreated={() => {
            setShowCreateForm(false);
            queryClient.invalidateQueries({ queryKey: ["stores"] });
          }}
        />
      )}

      <input
        type="search"
        placeholder="Search stores by name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-sm rounded-md border border-border-default px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      />

      <div className="overflow-hidden rounded-lg border border-border-default bg-surface-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-sunken text-xs uppercase tracking-wide text-text-secondary">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-secondary">
                  Loading stores…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-status-danger">
                  Could not load stores. Retry shortly.
                </td>
              </tr>
            )}
            {!isLoading && !isError && data?.stores.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-secondary">
                  No stores yet. Create your first store to get started.
                </td>
              </tr>
            )}
            {data?.stores.map((store) => (
              <tr key={store.id} className="border-t border-border-default transition-colors hover:bg-surface-sunken/60">
                <td className="px-4 py-3 font-medium text-text-primary">
                  {store.name}
                  <div className="text-xs font-normal text-text-secondary">{store.slug}</div>
                </td>
                <td className="px-4 py-3">
                  {store.owner ? (
                    <>
                      <div className="text-text-primary">{store.owner.name}</div>
                      <div className="text-xs text-text-secondary">{store.owner.email}</div>
                    </>
                  ) : (
                    <span className="text-text-secondary">No owner</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone={STATUS_TONE[store.status]} label={store.status.replace("_", " ")} />
                </td>
                <td className="px-4 py-3 text-text-secondary">{new Date(store.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      aria-label={`View activity for ${store.name}`}
                      title="View Store Activity"
                      onClick={() => navigate(`/stores/${store.id}/activity`)}
                      className="rounded-md p-2 text-text-secondary hover:bg-surface-sunken hover:text-primary"
                    >
                      <Activity size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Edit theme for ${store.name}`}
                      title="Edit Theme"
                      onClick={() => navigate(`/stores/${store.id}/theme`)}
                      className="rounded-md p-2 text-text-secondary hover:bg-surface-sunken hover:text-primary"
                    >
                      <Paintbrush size={16} aria-hidden="true" />
                    </button>
                    {store.status === "PENDING_SETUP" && (
                      <Button variant="primary" size="sm" onClick={() => handleApprove(store)}>
                        Approve
                      </Button>
                    )}
                    {(store.status === "ACTIVE" || store.status === "SUSPENDED") && (
                      <Button variant="secondary" size="sm" onClick={() => handleToggleStatus(store)}>
                        {store.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleImpersonate(store)}
                      disabled={impersonateMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-md border border-amber-impersonation px-3 py-1.5 text-sm font-medium text-amber-impersonation hover:bg-amber-impersonation/10 disabled:opacity-50"
                    >
                      <UserCog size={16} aria-hidden="true" />
                      Impersonate
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
    <form onSubmit={handleSubmit} className="animate-panel-in mb-6 rounded-lg border border-border-default bg-surface-card p-5">
      <h2 className="mb-4 text-sm font-semibold text-text-primary">Create a new store</h2>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Store name" value={name} onChange={setName} required />
        <Field label="Slug" value={slug} onChange={setSlug} required placeholder="acme-shop" />
        <Field label="Owner name" value={ownerName} onChange={setOwnerName} required />
        <Field label="Owner email" type="email" value={ownerEmail} onChange={setOwnerEmail} required />
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-status-danger">
          {error}
        </p>
      )}
      {result && (
        <p className="mt-3 rounded-md bg-primary-subtle p-3 text-xs text-text-primary">
          Store created. Owner invite token (no email dispatch yet - relay manually):{" "}
          <code className="break-all">{result.inviteToken}</code>
        </p>
      )}
      <Button type="submit" variant="primary" loading={mutation.isPending} className="mt-4">
        Create Store
      </Button>
    </form>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-text-primary">{props.label}</span>
      <input
        type={props.type ?? "text"}
        required={props.required}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded-md border border-border-default px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      />
    </label>
  );
}

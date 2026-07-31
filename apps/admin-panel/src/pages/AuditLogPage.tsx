import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { listAuditLogs } from "../api/audit-logs";

// Per SRS Part 15.3 - a queryable, immutable, read-only surface (no edit or
// delete anywhere in this page's UI, by design). Impersonation-tagged
// entries are visually distinguished (amber left border + icon) since Part
// 15.2 treats reviewing impersonation activity as this page's primary use.
export default function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [storeIdFilter, setStoreIdFilter] = useState("");
  const [impersonationOnly, setImpersonationOnly] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit-logs", actionFilter, storeIdFilter, impersonationOnly],
    queryFn: () =>
      listAuditLogs({
        action: actionFilter || undefined,
        storeId: storeIdFilter || undefined,
        impersonationOnly: impersonationOnly || undefined,
      }),
  });

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-text-primary">Audit Log</h1>
      <p className="mb-6 text-sm text-text-secondary">
        Append-only record of every sensitive platform action. Nothing on this page can be edited or deleted.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Filter by action (e.g. StoreSuspended)"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-md border border-border-default px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />
        <input
          type="text"
          placeholder="Filter by target store ID"
          value={storeIdFilter}
          onChange={(e) => setStoreIdFilter(e.target.value)}
          className="rounded-md border border-border-default px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input type="checkbox" checked={impersonationOnly} onChange={(e) => setImpersonationOnly(e.target.checked)} />
          Impersonation sessions only
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-border-default bg-surface-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-sunken text-xs uppercase tracking-wide text-text-secondary">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-secondary">
                  Loading…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-status-danger">
                  Could not load the audit log.
                </td>
              </tr>
            )}
            {!isLoading && !isError && data?.entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-secondary">
                  No entries match your filters.
                </td>
              </tr>
            )}
            {data?.entries.map((entry) => {
              const isImpersonated = Boolean(entry.impersonationSessionId);
              return (
                <tr
                  key={entry.id}
                  className={`border-t border-border-default ${isImpersonated ? "border-l-4 border-l-amber-impersonation bg-amber-impersonation/5" : ""}`}
                >
                  <td className="px-4 py-3 text-text-secondary">{new Date(entry.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    <span className="font-mono text-xs">{entry.actorId}</span>
                    <div className="text-xs">{entry.actorRole}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-text-primary">
                    <div className="flex items-center gap-1.5">
                      {isImpersonated && <ShieldAlert size={14} className="text-amber-impersonation" aria-hidden="true" />}
                      {entry.action}
                    </div>
                    {isImpersonated && (
                      <span className="text-xs font-normal text-amber-impersonation">
                        during impersonation session {entry.impersonationSessionId}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {entry.targetResource ?? entry.targetStoreId ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

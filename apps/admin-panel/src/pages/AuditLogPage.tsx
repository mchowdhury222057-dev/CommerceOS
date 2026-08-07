import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAuditLogs } from "../api/audit-logs";
import { AuditLogTable } from "../components/AuditLogTable";

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
        Append-only record of every sensitive platform action - Master Admin actions and Store Owner/staff catalog
        activity alike. Nothing on this page can be edited or deleted.
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

      <AuditLogTable entries={data?.entries} isLoading={isLoading} isError={isError} />
    </div>
  );
}

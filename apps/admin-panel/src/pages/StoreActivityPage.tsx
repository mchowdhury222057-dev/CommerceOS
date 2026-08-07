import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getStore } from "../api/stores";
import { listAuditLogs } from "../api/audit-logs";
import { AuditLogTable } from "../components/AuditLogTable";

// Per SRS Part 7.5/18.2 - a single store's activity feed, combining Store
// Owner/staff catalog actions (item 1's new logging) and any Master Admin
// actions already taken on this store (theme changes, status changes) in
// one chronological view. Reuses AuditLogTable (the same component the
// global Audit Log page uses) pre-scoped to this storeId, per the "reuse
// the existing viewer's patterns, don't rebuild" instruction.
export default function StoreActivityPage() {
  const { storeId = "" } = useParams();
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const storeQuery = useQuery({ queryKey: ["store", storeId], queryFn: () => getStore(storeId) });
  const activityQuery = useQuery({
    queryKey: ["audit-logs", "store", storeId, actionFilter, dateFrom, dateTo],
    queryFn: () =>
      listAuditLogs({
        storeId,
        action: actionFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        pageSize: 100,
      }),
  });

  return (
    <div>
      <Link to="/stores" className="mb-4 inline-block text-sm text-text-secondary hover:text-text-primary">
        ← Back to Store Management
      </Link>

      <h1 className="mb-1 text-xl font-semibold text-text-primary">
        {storeQuery.data ? `${storeQuery.data.store.name} — Activity` : "Store Activity"}
      </h1>
      <p className="mb-6 text-sm text-text-secondary">
        Everything Store Owner/staff and Master Admin actions have done in this store, newest first.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Filter by action (e.g. ProductCreated)"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-md border border-border-default px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />
        <label className="flex items-center gap-2 text-sm text-text-primary">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-border-default px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-text-primary">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-border-default px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      <AuditLogTable entries={activityQuery.data?.entries} isLoading={activityQuery.isLoading} isError={activityQuery.isError} />
    </div>
  );
}

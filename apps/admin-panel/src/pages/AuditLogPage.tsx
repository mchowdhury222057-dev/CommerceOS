import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAuditLogs } from "../api/audit-logs";
import { AuditLogTable } from "../components/AuditLogTable";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Input } from "../components/ui/Input";
import { Pagination } from "../components/ui/Pagination";

const PAGE_SIZE = 25;

// Per SRS Part 15.3 - a queryable, immutable, read-only surface (no edit or
// delete anywhere in this page's UI, by design). Impersonation-tagged
// entries are visually distinguished (amber left border + icon) since Part
// 15.2 treats reviewing impersonation activity as this page's primary use.
// Relabeled "System Logs" in the UI per this milestone - same page, same
// data, same endpoint.
export default function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [storeIdFilter, setStoreIdFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [impersonationOnly, setImpersonationOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit-logs", actionFilter, storeIdFilter, dateFrom, dateTo, impersonationOnly, page],
    queryFn: () =>
      listAuditLogs({
        action: actionFilter || undefined,
        storeId: storeIdFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        impersonationOnly: impersonationOnly || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: (prev) => prev,
  });

  function resetToFirstPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  return (
    <div>
      <SectionHeader
        title="System Logs"
        description="Append-only record of every sensitive platform action - Master Admin and Store Owner/staff activity alike. Nothing here can be edited or deleted."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input placeholder="Filter by action (e.g. StoreSuspended)" value={actionFilter} onChange={(e) => resetToFirstPage(setActionFilter)(e.target.value)} className="w-64" />
        <Input placeholder="Filter by target store ID" value={storeIdFilter} onChange={(e) => resetToFirstPage(setStoreIdFilter)(e.target.value)} className="w-56" />
        <label className="mb-2.5 flex items-center gap-2 text-sm text-text-secondary">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => resetToFirstPage(setDateFrom)(e.target.value)}
            className="rounded-lg border border-border-default bg-surface-card px-2.5 py-2 text-sm text-text-primary"
          />
        </label>
        <label className="mb-2.5 flex items-center gap-2 text-sm text-text-secondary">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => resetToFirstPage(setDateTo)(e.target.value)}
            className="rounded-lg border border-border-default bg-surface-card px-2.5 py-2 text-sm text-text-primary"
          />
        </label>
        <label className="mb-2.5 flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={impersonationOnly}
            onChange={(e) => resetToFirstPage(setImpersonationOnly)(e.target.checked)}
            className="h-4 w-4 rounded border-border-default text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          Impersonation sessions only
        </label>
      </div>

      <AuditLogTable
        entries={data?.entries}
        isLoading={isLoading}
        isError={isError}
        footer={data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />}
      />
    </div>
  );
}

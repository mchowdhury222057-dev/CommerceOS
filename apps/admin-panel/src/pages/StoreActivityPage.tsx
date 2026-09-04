import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Paintbrush, Store as StoreIcon } from "lucide-react";
import { Button } from "@commerceos/ui";
import { getStore } from "../api/stores";
import { listAuditLogs } from "../api/audit-logs";
import { AuditLogTable } from "../components/AuditLogTable";
import { Card, CardBody } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import type { BadgeTone } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { Skeleton } from "../components/ui/Skeleton";
import type { StoreStatus } from "../lib/api-types";

const STATUS_TONE: Record<StoreStatus, BadgeTone> = {
  PENDING: "caution",
  APPROVED: "success",
  SUSPENDED: "danger",
  REJECTED: "danger",
  ARCHIVED: "neutral",
};

// Per SRS Part 7.5/18.2 - a single store's profile + activity feed,
// combining Store Owner/staff catalog actions and Master Admin actions
// (theme changes, status changes) in one chronological view. Reuses
// AuditLogTable (the same component the global System Logs page uses)
// pre-scoped to this storeId. Only Edit Theme is offered as an action -
// there's no general-purpose "Edit Store" (name/slug/etc.) endpoint or
// page anywhere in this codebase yet, so it isn't shown here as a live
// button despite being mentioned in the milestone brief.
export default function StoreActivityPage() {
  const { storeId = "" } = useParams();
  const navigate = useNavigate();
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

  const store = storeQuery.data?.store;

  return (
    <div>
      <Link to="/stores" className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-text-primary">
        <ChevronLeft size={16} aria-hidden="true" />
        Back to Store Management
      </Link>

      <Card className="mb-6">
        <CardBody>
          {storeQuery.isLoading && <Skeleton className="h-16 w-full" />}
          {storeQuery.isError && <p className="text-sm text-status-danger">Could not load this store.</p>}
          {store && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-subtle text-primary" aria-hidden="true">
                  <StoreIcon size={22} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold tracking-tight text-text-primary">{store.name}</h1>
                    <Badge tone={STATUS_TONE[store.status]}>{store.status.replace("_", " ")}</Badge>
                  </div>
                  <p className="text-sm text-text-secondary">
                    {store.slug} · {store.owner ? `${store.owner.name} (${store.owner.email})` : "No owner"} · Created{" "}
                    {new Date(store.createdAt).toLocaleDateString()}
                  </p>
                  {store.suspendedReason && <p className="mt-1 text-xs text-status-danger">Suspended: {store.suspendedReason}</p>}
                </div>
              </div>
              <Button variant="secondary" onClick={() => navigate(`/stores/${storeId}/theme`)}>
                <Paintbrush size={14} aria-hidden="true" />
                Edit Theme
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      <h2 className="mb-3 text-sm font-semibold text-text-primary">Activity</h2>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input placeholder="Filter by action (e.g. ProductCreated)" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="max-w-xs" />
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          From
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-border-default bg-surface-card px-2.5 py-2 text-sm text-text-primary" />
        </label>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          To
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-border-default bg-surface-card px-2.5 py-2 text-sm text-text-primary" />
        </label>
      </div>

      <AuditLogTable entries={activityQuery.data?.entries} isLoading={activityQuery.isLoading} isError={activityQuery.isError} />
    </div>
  );
}

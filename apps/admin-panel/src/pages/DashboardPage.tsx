import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Store, ShoppingCart, Users, ShieldAlert } from "lucide-react";
import { getDashboardSummary } from "../api/dashboard";
import { listAuditLogs } from "../api/audit-logs";
import { KpiCard } from "../components/KpiCard";
import type { StoreStatus } from "../lib/api-types";

const STATUS_LABEL: Record<StoreStatus, string> = {
  PENDING_SETUP: "Pending Setup",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  ARCHIVED: "Archived",
};

const STATUS_BAR_COLOR: Record<StoreStatus, string> = {
  PENDING_SETUP: "bg-status-caution",
  ACTIVE: "bg-status-success",
  SUSPENDED: "bg-status-danger",
  ARCHIVED: "bg-status-neutral",
};

const STATUS_ORDER: StoreStatus[] = ["ACTIVE", "PENDING_SETUP", "SUSPENDED", "ARCHIVED"];

// Per SRS Part 18.2 - the Master Admin's landing page after login (replacing
// Store Management as the index route). Read-only KPI aggregates plus a
// Recent Activity feed sourced from the same Audit Log the full page uses,
// just capped to 10 entries here.
export default function DashboardPage() {
  const summaryQuery = useQuery({ queryKey: ["dashboard", "summary"], queryFn: getDashboardSummary });
  const activityQuery = useQuery({
    queryKey: ["audit-logs", "recent"],
    queryFn: () => listAuditLogs({ pageSize: 10 }),
  });

  const summary = summaryQuery.data;
  const activeCount = summary?.storesByStatus.ACTIVE ?? 0;
  const suspendedCount = summary?.storesByStatus.SUSPENDED ?? 0;
  const pendingCount = summary?.storesByStatus.PENDING_SETUP ?? 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary">Platform-wide overview across every store.</p>
      </div>

      {summaryQuery.isError && (
        <p role="alert" className="mb-4 text-sm text-status-danger">
          Could not load dashboard summary. Retry shortly.
        </p>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Stores"
          value={summaryQuery.isLoading ? "…" : (summary?.totalStores ?? 0)}
          icon={<Store size={18} aria-hidden="true" />}
          caption={
            summaryQuery.isLoading
              ? undefined
              : `${activeCount} Active · ${suspendedCount} Suspended · ${pendingCount} Pending`
          }
        />
        <KpiCard
          label="Platform Orders"
          value={summaryQuery.isLoading ? "…" : (summary?.totalPlatformOrders ?? 0)}
          icon={<ShoppingCart size={18} aria-hidden="true" />}
        />
        <KpiCard
          label="Store Owners"
          value={summaryQuery.isLoading ? "…" : (summary?.totalStoreOwners ?? 0)}
          icon={<Users size={18} aria-hidden="true" />}
        />
        <KpiCard
          label="Impersonation Sessions (7d)"
          value={summaryQuery.isLoading ? "…" : (summary?.recentImpersonationSessionCount ?? 0)}
          icon={<ShieldAlert size={18} aria-hidden="true" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border-default bg-surface-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-text-primary">Stores by Status</h2>
          {summaryQuery.isLoading && <p className="text-sm text-text-secondary">Loading…</p>}
          {summary && (
            <ul className="space-y-3">
              {STATUS_ORDER.map((status) => {
                const count = summary.storesByStatus[status];
                const pct = summary.totalStores > 0 ? Math.round((count / summary.totalStores) * 100) : 0;
                return (
                  <li key={status}>
                    <div className="mb-1 flex items-center justify-between text-xs text-text-secondary">
                      <span>{STATUS_LABEL[status]}</span>
                      <span>{count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                      <div
                        className={`h-full rounded-full ${STATUS_BAR_COLOR[status]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-border-default bg-surface-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Recent Activity</h2>
            <Link to="/audit-logs" className="text-xs font-medium text-primary hover:underline">
              View full Audit Log →
            </Link>
          </div>
          {activityQuery.isLoading && <p className="text-sm text-text-secondary">Loading…</p>}
          {activityQuery.isError && <p className="text-sm text-status-danger">Could not load recent activity.</p>}
          {activityQuery.data?.entries.length === 0 && (
            <p className="text-sm text-text-secondary">No activity yet.</p>
          )}
          <ul className="divide-y divide-border-default">
            {activityQuery.data?.entries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium text-text-primary">{entry.action}</div>
                  <div className="truncate text-xs text-text-secondary">
                    {entry.actorRole}
                    {entry.targetResource ? ` · ${entry.targetResource}` : ""}
                  </div>
                </div>
                <div className="shrink-0 pl-3 text-xs text-text-secondary">
                  {new Date(entry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

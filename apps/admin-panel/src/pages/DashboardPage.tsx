import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Store, ShoppingCart, Users, ShieldAlert, CheckCircle2, ShieldOff, Clock, CalendarPlus, TrendingUp } from "lucide-react";
import { getDashboardSummary } from "../api/dashboard";
import { listAuditLogs } from "../api/audit-logs";
import { StatCard } from "../components/ui/StatCard";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import type { StoreStatus } from "../lib/api-types";

const STATUS_LABEL: Record<StoreStatus, string> = {
  PENDING: "Pending Approval",
  APPROVED: "Active",
  SUSPENDED: "Suspended",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
};

const STATUS_BAR_COLOR: Record<StoreStatus, string> = {
  PENDING: "bg-status-caution",
  APPROVED: "bg-status-success",
  SUSPENDED: "bg-status-danger",
  REJECTED: "bg-status-neutral",
  ARCHIVED: "bg-status-neutral",
};

const STATUS_ORDER: StoreStatus[] = ["APPROVED", "PENDING", "SUSPENDED", "REJECTED", "ARCHIVED"];

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25, delay, ease: "easeOut" as const },
  };
}

// Per SRS Part 18.2 - the Master Admin's landing page. Every stat card
// here maps to a real dashboard.service.ts query EXCEPT "Today's Orders"
// and "New Stores Today", which have no backend support at all (only an
// all-time order count and total store count exist, no date-filtered
// versions) - those two render as an honest "-" rather than a fabricated
// number. Flagged back as small future backend additions, not built this
// round since Section A is frontend-only.
export default function DashboardPage() {
  const summaryQuery = useQuery({ queryKey: ["dashboard", "summary"], queryFn: getDashboardSummary });
  const activityQuery = useQuery({
    queryKey: ["audit-logs", "recent"],
    queryFn: () => listAuditLogs({ pageSize: 8 }),
  });

  const summary = summaryQuery.data;

  return (
    <div>
      <motion.div {...fadeUp(0)}>
        <SectionHeader title="Platform Dashboard" description="Real-time overview across every store on CommerceOS." />
      </motion.div>

      {summaryQuery.isError && (
        <p role="alert" className="mb-4 rounded-lg bg-status-danger/10 px-3.5 py-2.5 text-sm text-status-danger">
          Could not load dashboard summary. Retry shortly.
        </p>
      )}

      <motion.div {...fadeUp(0.05)} className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Stores" value={summary?.totalStores ?? 0} icon={<Store size={16} aria-hidden="true" />} tone="primary" loading={summaryQuery.isLoading} />
        <StatCard
          label="Active Stores"
          value={summary?.storesByStatus.APPROVED ?? 0}
          icon={<CheckCircle2 size={16} aria-hidden="true" />}
          tone="success"
          loading={summaryQuery.isLoading}
        />
        <StatCard
          label="Suspended Stores"
          value={summary?.storesByStatus.SUSPENDED ?? 0}
          icon={<ShieldOff size={16} aria-hidden="true" />}
          tone="danger"
          loading={summaryQuery.isLoading}
        />
        <StatCard
          label="Pending Approvals"
          value={summary?.storesByStatus.PENDING ?? 0}
          icon={<Clock size={16} aria-hidden="true" />}
          tone="caution"
          loading={summaryQuery.isLoading}
        />
        <StatCard label="Today's Orders" value={0} icon={<TrendingUp size={16} aria-hidden="true" />} tone="info" notAvailable caption="Needs a new backend query" />
        <StatCard label="New Stores Today" value={0} icon={<CalendarPlus size={16} aria-hidden="true" />} tone="info" notAvailable caption="Needs a new backend query" />
      </motion.div>

      <motion.div {...fadeUp(0.1)} className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Platform Orders (all-time)" value={summary?.totalPlatformOrders ?? 0} icon={<ShoppingCart size={16} aria-hidden="true" />} tone="primary" loading={summaryQuery.isLoading} />
        <StatCard label="Store Owners" value={summary?.totalStoreOwners ?? 0} icon={<Users size={16} aria-hidden="true" />} tone="primary" loading={summaryQuery.isLoading} />
        <StatCard label="Impersonation Sessions (7d)" value={summary?.recentImpersonationSessionCount ?? 0} icon={<ShieldAlert size={16} aria-hidden="true" />} tone="caution" loading={summaryQuery.isLoading} />
      </motion.div>

      <motion.div {...fadeUp(0.15)} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stores by Status</CardTitle>
          </CardHeader>
          <CardBody>
            {summaryQuery.isLoading && <Skeleton className="h-32 w-full" />}
            {summary && (
              <ul className="space-y-4">
                {STATUS_ORDER.map((status) => {
                  const count = summary.storesByStatus[status];
                  const pct = summary.totalStores > 0 ? Math.round((count / summary.totalStores) * 100) : 0;
                  return (
                    <li key={status}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="text-text-secondary">{STATUS_LABEL[status]}</span>
                        <span className="font-medium text-text-primary">{count}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                        <motion.div
                          className={`h-full rounded-full ${STATUS_BAR_COLOR[status]}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <Link to="/audit-logs" className="text-xs font-medium text-primary hover:underline">
              View System Logs →
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {activityQuery.isLoading && (
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            )}
            {activityQuery.isError && <p className="p-5 text-sm text-status-danger">Could not load recent activity.</p>}
            {activityQuery.data?.entries.length === 0 && (
              <EmptyState icon={<ShieldAlert size={20} aria-hidden="true" />} title="No activity yet" />
            )}
            <ul className="divide-y divide-border-default">
              {activityQuery.data?.entries.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-text-primary">{entry.action}</div>
                    <div className="truncate text-xs text-text-secondary">
                      {entry.actorRole}
                      {entry.targetResource ? ` · ${entry.targetResource}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-text-secondary">
                    {new Date(entry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
}

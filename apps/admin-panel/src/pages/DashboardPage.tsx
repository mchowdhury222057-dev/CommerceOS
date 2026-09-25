import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Store, ShoppingCart, Users, ShieldAlert, CheckCircle2, ShieldOff, Clock, CalendarPlus, TrendingUp, Wallet, CalendarDays, CalendarRange, UserPlus } from "lucide-react";
import { getDashboardSummary, getPlatformRevenue, getStoreGrowth } from "../api/dashboard";
import { listAuditLogs } from "../api/audit-logs";
import { StatCard } from "../components/ui/StatCard";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { Table, THead, TBody, TR, TH, TD, TableState } from "../components/ui/Table";
import { Tabs } from "../components/ui/Tabs";
import { RevenueTrendChart } from "../components/RevenueTrendChart";
import { StoreGrowthChart } from "../components/StoreGrowthChart";
import type { RevenueRangeDays, StoreStatus } from "../lib/api-types";

const RANGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "7", label: "7 Days" },
  { value: "30", label: "30 Days" },
  { value: "90", label: "3 Months" },
  { value: "365", label: "1 Year" },
];

function formatMoney(value: string): string {
  const n = Number(value);
  return `৳${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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
  const [revenueRange, setRevenueRange] = useState<RevenueRangeDays>(30);
  const revenueQuery = useQuery({
    queryKey: ["dashboard", "revenue", revenueRange],
    queryFn: () => getPlatformRevenue(revenueRange),
  });
  const growthQuery = useQuery({ queryKey: ["dashboard", "store-growth"], queryFn: getStoreGrowth });

  const summary = summaryQuery.data;
  const revenue = revenueQuery.data;
  const growth = growthQuery.data;

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

      <motion.div {...fadeUp(0.2)} className="mt-8">
        <SectionHeader
          title="Platform Revenue"
          description="Revenue across every store on CommerceOS."
          actions={<Tabs items={RANGE_OPTIONS} value={String(revenueRange)} onChange={(v) => setRevenueRange(Number(v) as RevenueRangeDays)} />}
        />

        {revenueQuery.isError && (
          <p role="alert" className="mb-4 rounded-lg bg-status-danger/10 px-3.5 py-2.5 text-sm text-status-danger">
            Could not load platform revenue. Retry shortly.
          </p>
        )}

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Revenue"
            value={revenueQuery.isLoading ? "" : formatMoney(revenue?.totalRevenue ?? "0")}
            icon={<Wallet size={16} aria-hidden="true" />}
            tone="success"
            loading={revenueQuery.isLoading}
          />
          <StatCard
            label="Today"
            value={revenueQuery.isLoading ? "" : formatMoney(revenue?.revenueToday ?? "0")}
            icon={<CalendarDays size={16} aria-hidden="true" />}
            tone="primary"
            loading={revenueQuery.isLoading}
          />
          <StatCard
            label="This Month"
            value={revenueQuery.isLoading ? "" : formatMoney(revenue?.revenueThisMonth ?? "0")}
            icon={<CalendarRange size={16} aria-hidden="true" />}
            tone="primary"
            loading={revenueQuery.isLoading}
          />
          <StatCard
            label="This Year"
            value={revenueQuery.isLoading ? "" : formatMoney(revenue?.revenueThisYear ?? "0")}
            icon={<TrendingUp size={16} aria-hidden="true" />}
            tone="info"
            loading={revenueQuery.isLoading}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardBody>
              {revenueQuery.isLoading ? <Skeleton className="h-[240px] w-full" /> : <RevenueTrendChart data={revenue?.revenueTrend ?? []} />}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue by Store</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {revenueQuery.isLoading && (
                <div className="space-y-3 p-5">
                  {Array.from({ length: 4 }, (_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              )}
              {!revenueQuery.isLoading && (
                <Table>
                  <THead>
                    <tr>
                      <TH>Store</TH>
                      <TH className="text-right">Orders</TH>
                      <TH className="text-right">Revenue</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {revenue?.revenueByStore.length === 0 && (
                      <TableState colSpan={3}>No paid orders in this range yet.</TableState>
                    )}
                    {revenue?.revenueByStore.slice(0, 8).map((row) => (
                      <TR key={row.storeId}>
                        <TD className="font-medium">{row.storeName}</TD>
                        <TD className="text-right">{row.orders}</TD>
                        <TD className="text-right font-semibold">{formatMoney(row.revenue)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardBody>
          </Card>
        </div>
      </motion.div>

      <motion.div {...fadeUp(0.25)} className="mt-8">
        <SectionHeader title="Store Growth" description="How the platform's store count is trending over time." />

        {growthQuery.isError && (
          <p role="alert" className="mb-4 rounded-lg bg-status-danger/10 px-3.5 py-2.5 text-sm text-status-danger">
            Could not load store growth. Retry shortly.
          </p>
        )}

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Stores" value={growth?.totalStores ?? 0} icon={<Store size={16} aria-hidden="true" />} tone="primary" loading={growthQuery.isLoading} />
          <StatCard label="New This Week" value={growth?.newStoresThisWeek ?? 0} icon={<UserPlus size={16} aria-hidden="true" />} tone="success" loading={growthQuery.isLoading} />
          <StatCard label="New This Month" value={growth?.newStoresThisMonth ?? 0} icon={<CalendarPlus size={16} aria-hidden="true" />} tone="success" loading={growthQuery.isLoading} />
          <StatCard label="New This Year" value={growth?.newStoresThisYear ?? 0} icon={<CalendarRange size={16} aria-hidden="true" />} tone="info" loading={growthQuery.isLoading} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Growth Trend — Last 12 Months</CardTitle>
          </CardHeader>
          <CardBody>
            {growthQuery.isLoading ? <Skeleton className="h-[240px] w-full" /> : <StoreGrowthChart data={growth?.growthTrend ?? []} />}
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
}

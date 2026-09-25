import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart3, PackageSearch, ShoppingBag, UserPlus, Wallet } from "lucide-react";
import { getStoreAnalytics } from "../api/dashboard";
import { useAuthStore } from "../stores/auth.store";
import { StatCard } from "../components/ui/StatCard";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { RevenueTrendChart } from "../components/RevenueTrendChart";
import { cn } from "../lib/cn";
import type { AnalyticsRangeDays, OrderStatus } from "../lib/api-types";
import type { BadgeTone } from "../components/ui/Badge";

const RANGE_OPTIONS: Array<{ value: AnalyticsRangeDays; label: string }> = [
  { value: 7, label: "7D" },
  { value: 30, label: "30D" },
  { value: 90, label: "90D" },
];

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
};

const ORDER_STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  PENDING: "caution",
  CONFIRMED: "info",
  PROCESSING: "info",
  SHIPPED: "info",
  DELIVERED: "success",
  RETURNED: "danger",
  CANCELLED: "neutral",
};

function formatMoney(value: string): string {
  const n = Number(value);
  return `৳${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25, delay, ease: "easeOut" as const },
  };
}

// Deeper analytics beyond the Dashboard's own KPI cards/14-day order-count
// chart (that page's own comment used to point here and say "coming
// soon" - this is that page, now built on real Prisma aggregates via
// store-dashboard.service.ts's getStoreAnalytics). No cohort/LTV modeling
// (would need data this schema doesn't track cleanly); revenue, order mix,
// and top products cover what the real data actually supports.
export default function AnalyticsPage() {
  const storeId = useAuthStore((s) => s.user?.storeId);
  const [range, setRange] = useState<AnalyticsRangeDays>(30);

  const analyticsQuery = useQuery({
    queryKey: ["store-analytics", storeId, range],
    queryFn: () => getStoreAnalytics(storeId as string, range),
    enabled: Boolean(storeId),
  });

  const data = analyticsQuery.data;
  const totalStatusCount = data?.ordersByStatus.reduce((sum, s) => sum + s.count, 0) ?? 0;

  return (
    <div>
      <motion.div {...fadeUp(0)}>
        <SectionHeader
          title="Analytics"
          description="Deeper insights into your store's performance."
          actions={
            <div className="flex shrink-0 gap-1 rounded-lg border border-border-default bg-surface-card p-1">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRange(opt.value)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                    range === opt.value ? "bg-primary text-white" : "text-text-secondary hover:bg-surface-sunken hover:text-text-primary",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          }
        />
      </motion.div>

      {analyticsQuery.isError && (
        <p role="alert" className="mb-4 text-sm text-status-danger">
          Could not load analytics. Retry shortly.
        </p>
      )}

      <motion.div {...fadeUp(0.05)} className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={formatMoney(data?.totalRevenue ?? "0")}
          icon={<Wallet size={16} aria-hidden="true" />}
          tone="success"
          loading={analyticsQuery.isLoading}
        />
        <StatCard
          label="Total Orders"
          value={data?.totalOrders ?? 0}
          icon={<ShoppingBag size={16} aria-hidden="true" />}
          tone="primary"
          loading={analyticsQuery.isLoading}
        />
        <StatCard
          label="Average Order Value"
          value={formatMoney(data?.averageOrderValue ?? "0")}
          icon={<BarChart3 size={16} aria-hidden="true" />}
          tone="info"
          loading={analyticsQuery.isLoading}
        />
        <StatCard
          label="New Customers"
          value={data?.newCustomers ?? 0}
          icon={<UserPlus size={16} aria-hidden="true" />}
          tone="caution"
          loading={analyticsQuery.isLoading}
        />
      </motion.div>

      <motion.div {...fadeUp(0.1)} className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue — Last {range} Days</CardTitle>
          </CardHeader>
          <CardBody>
            {analyticsQuery.isLoading ? <Skeleton className="h-[220px] w-full" /> : <RevenueTrendChart data={data?.revenueTrend ?? []} />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
          </CardHeader>
          <CardBody>
            {analyticsQuery.isLoading && <Skeleton className="h-40 w-full" />}
            {!analyticsQuery.isLoading && totalStatusCount === 0 && <p className="text-sm text-text-secondary">No orders in this period.</p>}
            {!analyticsQuery.isLoading && totalStatusCount > 0 && (
              <ul className="space-y-3">
                {data?.ordersByStatus
                  .sort((a, b) => b.count - a.count)
                  .map((s) => {
                    const pct = Math.round((s.count / totalStatusCount) * 100);
                    return (
                      <li key={s.status}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <Badge tone={ORDER_STATUS_TONE[s.status]} size="sm">
                            {ORDER_STATUS_LABEL[s.status] ?? s.status}
                          </Badge>
                          <span className="text-text-secondary">
                            {s.count} · {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}
          </CardBody>
        </Card>
      </motion.div>

      <motion.div {...fadeUp(0.15)}>
        <Card>
          <CardHeader>
            <CardTitle>Top Products — Last {range} Days</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {analyticsQuery.isLoading && (
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            )}
            {!analyticsQuery.isLoading && data?.topProducts.length === 0 && (
              <EmptyState icon={<PackageSearch size={20} aria-hidden="true" />} title="No sales in this period" description="Top-selling products will show up here once orders come in." />
            )}
            <ul className="divide-y divide-border-default">
              {data?.topProducts.map((product, i) => (
                <li key={product.productId} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-semibold text-text-secondary">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-text-primary">{product.name}</div>
                      <div className="text-xs text-text-secondary">{product.unitsSold} units sold</div>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-text-primary">{formatMoney(product.revenue)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
}

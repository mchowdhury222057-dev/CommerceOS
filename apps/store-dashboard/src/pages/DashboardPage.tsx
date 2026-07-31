import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock, ShieldOff, Archive, ShoppingBag, Wallet, PhoneCall, PackageX } from "lucide-react";
import { getMyStore } from "../api/store";
import { getStoreDashboardSummary } from "../api/dashboard";
import { useAuthStore } from "../stores/auth.store";
import { KpiCard } from "../components/KpiCard";
import { SalesTrendChart } from "../components/SalesTrendChart";
import { RiskBadge } from "../components/RiskBadge";

// Per SRS Part 6.2 - a store not yet Active must never show a broken or
// empty dashboard. Pending Setup, Suspended, and Archived each get their own
// clear, honest message instead of silently falling through to the real
// dashboard below.
function StatusGate({ title, message, icon }: { title: string; message: string; icon: ReactNode }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 text-text-secondary" aria-hidden="true">
        {icon}
      </div>
      <h1 className="mb-2 text-lg font-semibold text-text-primary">{title}</h1>
      <p className="max-w-sm text-sm text-text-secondary">{message}</p>
    </div>
  );
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
};

function formatMoney(value: string): string {
  const n = Number(value);
  return `৳${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DashboardPage() {
  const storeId = useAuthStore((s) => s.user?.storeId);
  const storeQuery = useQuery({
    queryKey: ["my-store", storeId],
    queryFn: () => getMyStore(storeId as string),
    enabled: Boolean(storeId),
  });

  const status = storeQuery.data?.store.status;

  const summaryQuery = useQuery({
    queryKey: ["store-dashboard", storeId],
    queryFn: () => getStoreDashboardSummary(storeId as string),
    enabled: Boolean(storeId) && status === "ACTIVE",
  });

  if (storeQuery.isLoading) {
    return <div className="text-text-secondary">Loading…</div>;
  }
  if (storeQuery.isError) {
    return <div className="text-status-danger">Could not load your store. Please try again shortly.</div>;
  }

  if (status === "PENDING_SETUP") {
    return (
      <StatusGate
        icon={<Clock size={40} aria-hidden="true" />}
        title="Your store is pending approval"
        message="A Master Administrator needs to review and approve your store before you can start managing it. You'll be able to access your dashboard as soon as it's approved."
      />
    );
  }
  if (status === "SUSPENDED") {
    return (
      <StatusGate
        icon={<ShieldOff size={40} aria-hidden="true" />}
        title="Your store is suspended"
        message="This store has been suspended by a Master Administrator. Please contact platform support to resolve this before you can continue managing it."
      />
    );
  }
  if (status === "ARCHIVED") {
    return (
      <StatusGate
        icon={<Archive size={40} aria-hidden="true" />}
        title="Your store is archived"
        message="This store has been archived and is no longer active. Please contact platform support if you believe this is a mistake."
      />
    );
  }

  const summary = summaryQuery.data;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary">Your store at a glance.</p>
      </div>

      {summaryQuery.isError && (
        <p role="alert" className="mb-4 text-sm text-status-danger">
          Could not load dashboard data. Retry shortly.
        </p>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Orders Today"
          value={summaryQuery.isLoading ? "…" : (summary?.ordersToday ?? 0)}
          icon={<ShoppingBag size={18} aria-hidden="true" />}
        />
        <KpiCard
          label="Revenue This Month"
          value={summaryQuery.isLoading ? "…" : formatMoney(summary?.revenueThisMonth ?? "0")}
          icon={<Wallet size={18} aria-hidden="true" />}
        />
        <KpiCard
          label="Pending COD Confirmations"
          value={summaryQuery.isLoading ? "…" : (summary?.pendingCodConfirmations ?? 0)}
          icon={<PhoneCall size={18} aria-hidden="true" />}
        />
        <KpiCard
          label="Low Stock Products"
          value={summaryQuery.isLoading ? "…" : (summary?.lowStockProductCount ?? 0)}
          icon={<PackageX size={18} aria-hidden="true" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border-default bg-surface-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-text-primary">Orders — Last 14 Days</h2>
          {summaryQuery.isLoading && <p className="text-sm text-text-secondary">Loading…</p>}
          {summary && <SalesTrendChart data={summary.salesTrend} />}
        </div>

        <div className="rounded-lg border border-border-default bg-surface-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Recent Orders</h2>
            <Link to="/orders" className="text-xs font-medium text-primary hover:underline">
              View all orders →
            </Link>
          </div>
          {summaryQuery.isLoading && <p className="text-sm text-text-secondary">Loading…</p>}
          {summary?.recentOrders.length === 0 && <p className="text-sm text-text-secondary">No orders yet.</p>}
          <ul className="divide-y divide-border-default">
            {summary?.recentOrders.map((order) => (
              <li key={order.id} className="py-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-text-primary">{order.customer.name}</span>
                      <RiskBadge level={order.customer.riskLevel} />
                    </div>
                    <div className="text-xs text-text-secondary">
                      {ORDER_STATUS_LABEL[order.status] ?? order.status} · {formatMoney(order.total)}
                    </div>
                  </div>
                  <div className="shrink-0 pl-3 text-xs text-text-secondary">
                    {new Date(order.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

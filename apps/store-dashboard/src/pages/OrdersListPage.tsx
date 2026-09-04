import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, ShoppingCart } from "lucide-react";
import { listOrders } from "../api/orders";
import { useAuthStore } from "../stores/auth.store";
import { RiskBadge } from "../components/RiskBadge";
import { Badge } from "../components/ui/Badge";
import type { BadgeTone } from "../components/ui/Badge";
import { Select } from "../components/ui/Input";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Table, TBody, TD, TH, THead, TR, TableState } from "../components/ui/Table";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Pagination } from "../components/ui/Pagination";
import type { OrderStatus } from "../lib/api-types";

const PAGE_SIZE = 15;

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  PENDING: "caution",
  CONFIRMED: "info",
  PROCESSING: "info",
  SHIPPED: "info",
  DELIVERED: "success",
  RETURNED: "danger",
  CANCELLED: "neutral",
};

const STATUS_OPTIONS: Array<{ value: OrderStatus | ""; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "RETURNED", label: "Returned" },
  { value: "CANCELLED", label: "Cancelled" },
];

function formatMoney(value: string): string {
  return `৳${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH_ON_DELIVERY: "Cash on Delivery",
  MANUAL_BKASH_VERIFICATION: "bKash (Manual)",
  AUTOMATED_GATEWAY: "Online Payment",
};

export default function OrdersListPage() {
  const navigate = useNavigate();
  const storeId = useAuthStore((s) => s.user?.storeId) as string;
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = (searchParams.get("status") as OrderStatus | "") ?? "";
  const quickFilter = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? "1");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["orders", storeId, statusFilter, page],
    queryFn: () => listOrders(storeId, { status: statusFilter ? [statusFilter] : undefined, page, pageSize: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next);
  }

  // Filters only this page's already-loaded rows (there's no server-side
  // order search endpoint) - a real, useful quick-filter, just scoped to
  // what's currently on screen rather than the full dataset.
  const visibleOrders = useMemo(() => {
    const orders = data?.orders ?? [];
    if (!quickFilter.trim()) return orders;
    const needle = quickFilter.trim().toLowerCase();
    return orders.filter((o) => o.customer.name.toLowerCase().includes(needle) || o.customer.phone.includes(needle));
  }, [data?.orders, quickFilter]);

  return (
    <div>
      <SectionHeader title="Orders" description="Every order placed through your storefront." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" aria-hidden="true" />
          <input
            type="search"
            value={quickFilter}
            onChange={(e) => updateParam("q", e.target.value)}
            placeholder="Filter this page by customer or phone…"
            className="w-full rounded-lg border border-border-default bg-surface-card py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-disabled focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => updateParam("status", e.target.value)} className="sm:w-48">
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      <Table>
        <THead>
          <tr>
            <TH>Order</TH>
            <TH>Customer</TH>
            <TH>Phone</TH>
            <TH>Payment</TH>
            <TH>Status</TH>
            <TH>Date</TH>
            <TH className="text-right">Total</TH>
          </tr>
        </THead>
        <TBody>
          {isLoading && Array.from({ length: 6 }, (_, i) => <TableRowSkeleton key={i} columns={7} />)}
          {isError && (
            <TableState colSpan={7} tone="danger">
              Could not load orders. Retry shortly.
            </TableState>
          )}
          {!isLoading && !isError && visibleOrders.length === 0 && (
            <TableState colSpan={7}>
              <EmptyState icon={<ShoppingCart size={20} aria-hidden="true" />} title="No orders match" description="Try a different filter." />
            </TableState>
          )}
          {visibleOrders.map((order) => (
            <TR key={order.id} clickable onClick={() => navigate(`/orders/${order.id}`)}>
              <TD className="font-mono text-xs text-text-secondary">#{order.id.slice(-8).toUpperCase()}</TD>
              <TD>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-primary">{order.customer.name}</span>
                  <RiskBadge level={order.customer.riskLevel} />
                </div>
              </TD>
              <TD className="text-text-secondary">{order.customer.phone}</TD>
              <TD className="text-text-secondary">{PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}</TD>
              <TD>
                <Badge tone={STATUS_TONE[order.status]} size="sm">
                  {order.status}
                </Badge>
              </TD>
              <TD className="text-text-secondary">{new Date(order.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</TD>
              <TD className="text-right font-medium">{formatMoney(order.total)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={(p) => updateParam("page", String(p))} />}
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "@commerceos/ui";
import type { StatusTone } from "@commerceos/ui";
import { listOrders } from "../api/orders";
import { useAuthStore } from "../stores/auth.store";
import { RiskBadge } from "../components/RiskBadge";
import type { OrderStatus } from "../lib/api-types";

const STATUS_TONE: Record<OrderStatus, StatusTone> = {
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

// Per SRS Part 9 - the full order list, filterable by status. Clicking a
// row opens OrderDetailPage, where the actual status workflow lives.
export default function OrdersListPage() {
  const navigate = useNavigate();
  const storeId = useAuthStore((s) => s.user?.storeId) as string;
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["orders", storeId, statusFilter],
    queryFn: () => listOrders(storeId, { status: statusFilter ? [statusFilter] : undefined }),
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Orders</h1>
        <p className="text-sm text-text-secondary">Every order placed through your storefront.</p>
      </div>

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "")}
        className="mb-4 rounded-md border border-border-default px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <div className="overflow-hidden rounded-lg border border-border-default bg-surface-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-sunken text-xs uppercase tracking-wide text-text-secondary">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Placed</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-secondary">
                  Loading orders…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-status-danger">
                  Could not load orders. Retry shortly.
                </td>
              </tr>
            )}
            {!isLoading && !isError && data?.orders.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-secondary">
                  No orders match this filter.
                </td>
              </tr>
            )}
            {data?.orders.map((order) => (
              <tr
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="cursor-pointer border-t border-border-default hover:bg-surface-sunken"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">{order.customer.name}</span>
                    <RiskBadge level={order.customer.riskLevel} />
                  </div>
                  <div className="text-xs text-text-secondary">{order.customer.phone}</div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone={STATUS_TONE[order.status]} label={order.status} size="sm" />
                </td>
                <td className="px-4 py-3 text-text-primary">{formatMoney(order.total)}</td>
                <td className="px-4 py-3 text-text-secondary">{new Date(order.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

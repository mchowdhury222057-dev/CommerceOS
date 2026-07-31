import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, StatusBadge } from "@commerceos/ui";
import type { StatusTone } from "@commerceos/ui";
import { confirmCod, getOrder, updateCourier, updateOrderStatus } from "../api/orders";
import { useAuthStore } from "../stores/auth.store";
import { RiskBadge } from "../components/RiskBadge";
import { ApiError } from "../lib/api-client";
import type { CourierName, OrderStatus } from "../lib/api-types";

const STATUS_TONE: Record<OrderStatus, StatusTone> = {
  PENDING: "caution",
  CONFIRMED: "info",
  PROCESSING: "info",
  SHIPPED: "info",
  DELIVERED: "success",
  RETURNED: "danger",
  CANCELLED: "neutral",
};

// Mirrors order.service.ts's ORDER_STATUS_TRANSITIONS exactly (Part 9.1) -
// the server is the actual point of enforcement; this only decides which
// buttons render.
const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: [],
  RETURNED: [],
  CANCELLED: [],
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
};

const COURIER_OPTIONS: Array<{ value: CourierName; label: string }> = [
  { value: "PATHAO", label: "Pathao" },
  { value: "STEADFAST", label: "Steadfast" },
  { value: "REDX", label: "RedX" },
  { value: "OTHER", label: "Other" },
];

function formatMoney(value: string): string {
  return `৳${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function OrderDetailPage() {
  const { orderId = "" } = useParams();
  const navigate = useNavigate();
  const storeId = useAuthStore((s) => s.user?.storeId) as string;
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [courierName, setCourierName] = useState<CourierName>("PATHAO");
  const [courierTrackingId, setCourierTrackingId] = useState("");

  const orderQuery = useQuery({
    queryKey: ["order", storeId, orderId],
    queryFn: () => getOrder(storeId, orderId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["order", storeId, orderId] });

  const statusMutation = useMutation({
    mutationFn: (input: { status: OrderStatus; note?: string; codConfirmOverrideReason?: string }) =>
      updateOrderStatus(storeId, orderId, input),
    onSuccess: invalidate,
    onError: (err) => setActionError(err instanceof ApiError ? err.message : "Could not update order status"),
  });

  const codMutation = useMutation({
    mutationFn: (outcome: "CONFIRMED" | "NO_ANSWER" | "DECLINED") => confirmCod(storeId, orderId, { outcome }),
    onSuccess: invalidate,
    onError: (err) => setActionError(err instanceof ApiError ? err.message : "Could not log call outcome"),
  });

  const courierMutation = useMutation({
    mutationFn: () => updateCourier(storeId, orderId, { courierName, courierTrackingId }),
    onSuccess: invalidate,
    onError: (err) => setActionError(err instanceof ApiError ? err.message : "Could not save courier tracking"),
  });

  function handleTransition(target: OrderStatus) {
    setActionError(null);
    if (target === "CANCELLED") {
      const reason = window.prompt("Reason for cancelling this order?");
      if (!reason) return;
      statusMutation.mutate({ status: target, note: reason });
      return;
    }
    if (target === "CONFIRMED" && !order?.codConfirmedByCall) {
      const reason = window.prompt(
        "This order hasn't been confirmed by a call yet. Enter an override reason to confirm anyway, or Cancel and log the call outcome below first.",
      );
      if (!reason) return;
      statusMutation.mutate({ status: target, codConfirmOverrideReason: reason });
      return;
    }
    if (!window.confirm(`Move this order to ${STATUS_LABEL[target]}?`)) return;
    statusMutation.mutate({ status: target });
  }

  if (orderQuery.isLoading) return <div className="text-text-secondary">Loading order…</div>;
  if (orderQuery.isError || !orderQuery.data) {
    return <div className="text-status-danger">Could not load this order.</div>;
  }

  const order = orderQuery.data.order;
  const nextStatuses = NEXT_STATUSES[order.status];

  return (
    <div className="max-w-4xl">
      <button type="button" onClick={() => navigate("/orders")} className="mb-4 text-sm text-text-secondary hover:text-text-primary">
        ← Back to Orders
      </button>

      {/* Customer + risk badge - per Part 22.14, the single most important
          piece of information on this screen, so it leads the page at full
          size rather than sitting in a side panel. */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-text-primary">{order.customer.name}</h1>
        <RiskBadge level={order.customer.riskLevel} />
        <StatusBadge tone={STATUS_TONE[order.status]} label={STATUS_LABEL[order.status]} />
      </div>

      {actionError && (
        <p role="alert" className="mb-4 rounded-md bg-status-danger/10 px-3 py-2 text-sm text-status-danger">
          {actionError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border border-border-default bg-surface-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-text-primary">Order Items</h2>
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="py-2">Product</th>
                  <th className="py-2">Variant</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Unit Price</th>
                  <th className="py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-t border-border-default">
                    <td className="py-2 text-text-primary">{item.product.name}</td>
                    <td className="py-2 text-text-secondary">
                      {Object.entries(item.variant.attributes)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(", ")}
                    </td>
                    <td className="py-2 text-right text-text-primary">{item.quantity}</td>
                    <td className="py-2 text-right text-text-primary">{formatMoney(item.unitPrice)}</td>
                    <td className="py-2 text-right text-text-primary">
                      {formatMoney((Number(item.unitPrice) * item.quantity).toString())}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border-default font-semibold">
                  <td colSpan={4} className="py-2 text-right text-text-primary">
                    Total
                  </td>
                  <td className="py-2 text-right text-text-primary">{formatMoney(order.total)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          <section className="rounded-lg border border-border-default bg-surface-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-text-primary">Delivery</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-secondary">Phone</dt>
                <dd className="text-text-primary">{order.customer.phone}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-text-secondary">Address</dt>
                <dd className="text-right text-text-primary">{order.deliveryAddress}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Payment Method</dt>
                <dd className="text-text-primary">Cash on Delivery</dd>
              </div>
            </dl>
          </section>

          {/* Per Part 9.4 - only meaningful once a courier is actually
              involved; the backend rejects this before Shipped too. */}
          {["SHIPPED", "DELIVERED", "RETURNED"].includes(order.status) && (
            <section className="rounded-lg border border-border-default bg-surface-card p-5">
              <h2 className="mb-3 text-sm font-semibold text-text-primary">Courier Tracking</h2>
              {order.courierTrackingId && (
                <p className="mb-3 text-sm text-text-secondary">
                  Currently: {COURIER_OPTIONS.find((c) => c.value === order.courierName)?.label ?? order.courierName} —{" "}
                  <span className="font-mono">{order.courierTrackingId}</span>
                </p>
              )}
              <div className="flex flex-wrap items-end gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-medium text-text-primary">Courier</span>
                  <select
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value as CourierName)}
                    className="rounded-md border border-border-default px-3 py-2 text-sm"
                  >
                    {COURIER_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-medium text-text-primary">Tracking / Consignment ID</span>
                  <input
                    type="text"
                    value={courierTrackingId}
                    onChange={(e) => setCourierTrackingId(e.target.value)}
                    placeholder={order.courierTrackingId ?? "e.g. PTH-123456"}
                    className="rounded-md border border-border-default px-3 py-2 text-sm"
                  />
                </label>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={courierMutation.isPending}
                  disabled={!courierTrackingId}
                  onClick={() => courierMutation.mutate()}
                >
                  Save
                </Button>
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          {/* Per Part 9.3 - the COD confirmation gate; only loggable while
              Pending, since it exists to decide whether Pending -> Confirmed
              should proceed. */}
          {order.status === "PENDING" && (
            <section className="rounded-lg border border-border-default bg-surface-card p-5">
              <h2 className="mb-1 text-sm font-semibold text-text-primary">COD Confirmation Call</h2>
              <p className="mb-3 text-xs text-text-secondary">
                {order.codConfirmedByCall
                  ? "Confirmed by call."
                  : `Not yet confirmed${order.callAttempts > 0 ? ` (${order.callAttempts} attempt${order.callAttempts === 1 ? "" : "s"})` : ""}.`}
              </p>
              <div className="flex flex-col gap-2">
                <Button variant="secondary" size="sm" loading={codMutation.isPending} onClick={() => codMutation.mutate("CONFIRMED")}>
                  Customer Confirmed
                </Button>
                <Button variant="ghost" size="sm" loading={codMutation.isPending} onClick={() => codMutation.mutate("NO_ANSWER")}>
                  No Answer
                </Button>
                <Button variant="ghost" size="sm" loading={codMutation.isPending} onClick={() => codMutation.mutate("DECLINED")}>
                  Declined
                </Button>
              </div>
            </section>
          )}

          <section className="rounded-lg border border-border-default bg-surface-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-text-primary">Status</h2>
            {nextStatuses.length === 0 ? (
              <p className="text-sm text-text-secondary">This order is in a final state.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {nextStatuses.map((target) => (
                  <Button
                    key={target}
                    variant={target === "CANCELLED" || target === "RETURNED" ? "destructive" : "primary"}
                    size="sm"
                    loading={statusMutation.isPending}
                    onClick={() => handleTransition(target)}
                  >
                    Mark as {STATUS_LABEL[target]}
                  </Button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border-default bg-surface-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-text-primary">History</h2>
            <ul className="space-y-2 text-xs">
              {order.statusHistory.map((entry) => (
                <li key={entry.id} className="border-l-2 border-border-default pl-3">
                  <div className="font-medium text-text-primary">{STATUS_LABEL[entry.status]}</div>
                  <div className="text-text-secondary">{new Date(entry.createdAt).toLocaleString()}</div>
                  {entry.note && <div className="text-text-secondary">{entry.note}</div>}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

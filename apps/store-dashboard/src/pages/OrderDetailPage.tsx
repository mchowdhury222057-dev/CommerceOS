import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@commerceos/ui";
import { ChevronLeft, MapPin, Phone, Truck, Wallet } from "lucide-react";
import { confirmCod, getOrder, updateCourier, updateOrderStatus } from "../api/orders";
import { useAuthStore } from "../stores/auth.store";
import { RiskBadge } from "../components/RiskBadge";
import { ApiError } from "../lib/api-client";
import { toast } from "../components/ui/Toaster";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import type { BadgeTone } from "../components/ui/Badge";
import { Select, Input } from "../components/ui/Input";
import { Skeleton } from "../components/ui/Skeleton";
import { ConfirmDialog, PromptDialog } from "../components/ui/ConfirmDialog";
import type { CourierName, OrderStatus } from "../lib/api-types";

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
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

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH_ON_DELIVERY: "Cash on Delivery",
  MANUAL_BKASH_VERIFICATION: "bKash (Manual)",
  AUTOMATED_GATEWAY: "Online Payment",
};

type PendingAction = { kind: "confirm"; target: OrderStatus } | { kind: "cancel-reason" } | { kind: "override-reason" } | null;

export default function OrderDetailPage() {
  const { orderId = "" } = useParams();
  const navigate = useNavigate();
  const storeId = useAuthStore((s) => s.user?.storeId) as string;
  const queryClient = useQueryClient();
  const [courierName, setCourierName] = useState<CourierName>("PATHAO");
  const [courierTrackingId, setCourierTrackingId] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const orderQuery = useQuery({
    queryKey: ["order", storeId, orderId],
    queryFn: () => getOrder(storeId, orderId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["order", storeId, orderId] });

  const statusMutation = useMutation({
    mutationFn: (input: { status: OrderStatus; note?: string; codConfirmOverrideReason?: string }) =>
      updateOrderStatus(storeId, orderId, input),
    onSuccess: () => {
      invalidate();
      toast.success("Order status updated");
      setPendingAction(null);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update order status"),
  });

  const codMutation = useMutation({
    mutationFn: (outcome: "CONFIRMED" | "NO_ANSWER" | "DECLINED") => confirmCod(storeId, orderId, { outcome }),
    onSuccess: () => {
      invalidate();
      toast.success("Call outcome logged");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not log call outcome"),
  });

  const courierMutation = useMutation({
    mutationFn: () => updateCourier(storeId, orderId, { courierName, courierTrackingId }),
    onSuccess: () => {
      invalidate();
      toast.success("Courier tracking saved");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not save courier tracking"),
  });

  function handleTransition(target: OrderStatus) {
    if (target === "CANCELLED") {
      setPendingAction({ kind: "cancel-reason" });
      return;
    }
    if (target === "CONFIRMED" && !order?.codConfirmedByCall) {
      setPendingAction({ kind: "override-reason" });
      return;
    }
    setPendingAction({ kind: "confirm", target });
  }

  if (orderQuery.isLoading) {
    return (
      <div className="max-w-4xl space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (orderQuery.isError || !orderQuery.data) {
    return <div className="text-status-danger">Could not load this order.</div>;
  }

  const order = orderQuery.data.order;
  const nextStatuses = NEXT_STATUSES[order.status];

  return (
    <div className="max-w-4xl">
      <button type="button" onClick={() => navigate("/orders")} className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-text-primary">
        <ChevronLeft size={16} aria-hidden="true" />
        Back to Orders
      </button>

      {/* Customer + risk badge - per Part 22.14, the single most important
          piece of information on this screen, so it leads the page at full
          size rather than sitting in a side panel. */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">{order.customer.name}</h1>
        <RiskBadge level={order.customer.riskLevel} />
        <Badge tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-text-secondary">
                  <tr>
                    <th className="px-5 py-2.5">Product</th>
                    <th className="px-5 py-2.5">Variant</th>
                    <th className="px-5 py-2.5 text-right">Qty</th>
                    <th className="px-5 py-2.5 text-right">Unit Price</th>
                    <th className="px-5 py-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-2.5 text-text-primary">{item.product.name}</td>
                      <td className="px-5 py-2.5 text-text-secondary">
                        {Object.entries(item.variant.attributes)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ") || "—"}
                      </td>
                      <td className="px-5 py-2.5 text-right text-text-primary">{item.quantity}</td>
                      <td className="px-5 py-2.5 text-right text-text-primary">{formatMoney(item.unitPrice)}</td>
                      <td className="px-5 py-2.5 text-right font-medium text-text-primary">
                        {formatMoney((Number(item.unitPrice) * item.quantity).toString())}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border-default font-semibold">
                    <td colSpan={4} className="px-5 py-3 text-right text-text-primary">
                      Total
                    </td>
                    <td className="px-5 py-3 text-right text-text-primary">{formatMoney(order.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="flex items-center gap-2 text-text-secondary">
                  <Phone size={14} aria-hidden="true" />
                  Phone
                </span>
                <span className="text-right text-text-primary">{order.customer.phone}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="flex shrink-0 items-center gap-2 text-text-secondary">
                  <MapPin size={14} aria-hidden="true" />
                  Address
                </span>
                <span className="text-right text-text-primary">{order.deliveryAddress}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="flex items-center gap-2 text-text-secondary">
                  <Wallet size={14} aria-hidden="true" />
                  Payment Method
                </span>
                <span className="text-text-primary">{PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}</span>
              </div>
            </CardBody>
          </Card>

          {["SHIPPED", "DELIVERED", "RETURNED"].includes(order.status) && (
            <Card>
              <CardHeader>
                <CardTitle>Courier Tracking</CardTitle>
              </CardHeader>
              <CardBody>
                {order.courierTrackingId && (
                  <p className="mb-3 flex items-center gap-2 text-sm text-text-secondary">
                    <Truck size={14} aria-hidden="true" />
                    Currently: {COURIER_OPTIONS.find((c) => c.value === order.courierName)?.label ?? order.courierName} —{" "}
                    <span className="font-mono">{order.courierTrackingId}</span>
                  </p>
                )}
                <div className="flex flex-wrap items-end gap-3">
                  <Select label="Courier" value={courierName} onChange={(e) => setCourierName(e.target.value as CourierName)} className="w-40">
                    {COURIER_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Tracking / Consignment ID"
                    value={courierTrackingId}
                    onChange={(e) => setCourierTrackingId(e.target.value)}
                    placeholder={order.courierTrackingId ?? "e.g. PTH-123456"}
                    className="w-48"
                  />
                  <Button variant="secondary" size="sm" loading={courierMutation.isPending} disabled={!courierTrackingId} onClick={() => courierMutation.mutate()}>
                    Save
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {order.status === "PENDING" && (
            <Card>
              <CardHeader>
                <CardTitle>COD Confirmation Call</CardTitle>
              </CardHeader>
              <CardBody>
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
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardBody>
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
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardBody>
              <ol className="space-y-3 text-xs">
                {order.statusHistory.map((entry) => (
                  <li key={entry.id} className="relative pl-4">
                    <span className="absolute left-0 top-1 h-1.5 w-1.5 rounded-full bg-border-strong" aria-hidden="true" />
                    <div className="font-medium text-text-primary">{STATUS_LABEL[entry.status]}</div>
                    <div className="text-text-secondary">{new Date(entry.createdAt).toLocaleString()}</div>
                    {entry.note && <div className="text-text-secondary">{entry.note}</div>}
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={pendingAction?.kind === "confirm"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title={pendingAction?.kind === "confirm" ? `Move this order to ${STATUS_LABEL[pendingAction.target]}?` : ""}
        destructive={pendingAction?.kind === "confirm" && (pendingAction.target === "CANCELLED" || pendingAction.target === "RETURNED")}
        loading={statusMutation.isPending}
        onConfirm={() => pendingAction?.kind === "confirm" && statusMutation.mutate({ status: pendingAction.target })}
      />

      <PromptDialog
        open={pendingAction?.kind === "cancel-reason"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title="Cancel this order?"
        description="This can't be undone. Please provide a reason."
        label="Reason for cancelling"
        confirmLabel="Cancel Order"
        destructive
        loading={statusMutation.isPending}
        onSubmit={(reason) => statusMutation.mutate({ status: "CANCELLED", note: reason })}
      />

      <PromptDialog
        open={pendingAction?.kind === "override-reason"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title="Confirm without a call?"
        description="This order hasn't been confirmed by a call yet. Enter an override reason to confirm anyway, or close this and log the call outcome in the COD Confirmation Call panel first."
        label="Override reason"
        confirmLabel="Confirm Anyway"
        loading={statusMutation.isPending}
        onSubmit={(reason) => statusMutation.mutate({ status: "CONFIRMED", codConfirmOverrideReason: reason })}
      />
    </div>
  );
}

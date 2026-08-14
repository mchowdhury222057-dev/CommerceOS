import { useState } from "react";
import type { FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button, StatusBadge } from "@commerceos/ui";
import type { StatusTone } from "@commerceos/ui";
import { lookupOrders } from "../api/storefront";
import type { OrderStatus, OrderView } from "../lib/api-types";

const STATUS_TONE: Record<OrderStatus, StatusTone> = {
  PENDING: "caution",
  CONFIRMED: "info",
  PROCESSING: "info",
  SHIPPED: "info",
  DELIVERED: "success",
  RETURNED: "danger",
  CANCELLED: "neutral",
};

function formatMoney(value: string): string {
  return `৳${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Per SRS Part 10.1 - no customer account/login exists in V1; the phone
// number used at checkout is the only "credential" needed to look up past
// orders, scoped server-side to this exact store (see
// storefront.service.ts's lookupOrdersByPhone).
export default function OrderLookupPage() {
  const { storeSlug = "" } = useParams();
  const [phone, setPhone] = useState("");
  const [searched, setSearched] = useState(false);
  const [orders, setOrders] = useState<OrderView[]>([]);

  const mutation = useMutation({
    mutationFn: () => lookupOrders(storeSlug, phone.trim()),
    onSuccess: (data) => {
      setOrders(data.orders);
      setSearched(true);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    mutation.mutate();
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-1 text-xl font-semibold text-text-primary">Track My Order</h1>
      <p className="mb-6 text-sm text-text-secondary">Enter the phone number you used at checkout.</p>

      <form onSubmit={handleSubmit} className="mb-8 flex gap-2">
        <input
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="01XXXXXXXXX"
          className="flex-1 rounded-md border border-border-default bg-surface-card px-3 py-2 text-sm text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />
        <Button type="submit" variant="primary" loading={mutation.isPending}>
          Search
        </Button>
      </form>

      {mutation.isError && <p className="text-sm text-status-danger">Something went wrong. Please try again.</p>}

      {searched && orders.length === 0 && !mutation.isError && (
        <p className="text-sm text-text-secondary">No orders found for this phone number.</p>
      )}

      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="rounded-lg border border-border-default bg-surface-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">Order #{order.id.slice(-8).toUpperCase()}</span>
              <StatusBadge tone={STATUS_TONE[order.status]} label={order.status} size="sm" />
            </div>
            <ul className="mb-2 space-y-1 text-xs text-text-secondary">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.product.name} × {item.quantity}
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">{new Date(order.createdAt).toLocaleDateString()}</span>
              <span className="font-semibold text-text-primary">{formatMoney(order.total)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

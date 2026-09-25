import { useEffect } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Package, Phone, UserRound } from "lucide-react";
import { StatusBadge } from "@commerceos/ui";
import type { StatusTone } from "@commerceos/ui";
import { getMyAccount } from "../api/storefront";
import { ApiError } from "../lib/api-client";
import { useCustomerAuth } from "../account/CustomerAuthContext";
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

function formatMoney(value: string): string {
  return `৳${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AccountPage() {
  const { storeSlug = "" } = useParams();
  const navigate = useNavigate();
  const { customer, token, signOut } = useCustomerAuth();

  const accountQuery = useQuery({
    queryKey: ["customer-account", storeSlug, token],
    queryFn: () => getMyAccount(storeSlug, token as string),
    enabled: Boolean(token),
    retry: false,
  });

  // A token the server no longer accepts (expired, or the account was
  // removed) - clear it and send the shopper back to sign in.
  const unauthorized = accountQuery.error instanceof ApiError && accountQuery.error.status === 401;
  useEffect(() => {
    if (unauthorized) signOut();
  }, [unauthorized, signOut]);

  if (!customer || !token) return <Navigate to={`/${storeSlug}/account/login`} replace />;

  const profile = accountQuery.data?.customer ?? customer;
  const orders = accountQuery.data?.orders ?? [];

  function handleSignOut() {
    signOut();
    navigate(`/${storeSlug}`, { replace: true });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">My Account</h1>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-1.5 rounded-lg border border-border-default bg-surface-card px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-sunken"
        >
          <LogOut size={15} aria-hidden="true" />
          Sign out
        </button>
      </div>

      <div className="mb-8 flex items-center gap-4 rounded-2xl border border-border-default bg-surface-card p-5 shadow-sm">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-white" aria-hidden="true">
          <UserRound size={22} />
        </span>
        <div className="min-w-0">
          <div className="truncate font-semibold text-text-primary">{profile.name}</div>
          <div className="flex items-center gap-1.5 text-sm text-text-secondary">
            <Phone size={13} aria-hidden="true" />
            {profile.phone}
          </div>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-text-primary">My Orders</h2>

      {accountQuery.isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-sunken" />
          ))}
        </div>
      )}

      {accountQuery.isError && !unauthorized && (
        <p role="alert" className="rounded-lg bg-status-danger/10 px-3.5 py-2.5 text-sm text-status-danger">
          Could not load your orders. Please try again shortly.
        </p>
      )}

      {accountQuery.isSuccess && orders.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-default bg-surface-card px-4 py-12 text-center">
          <Package size={36} className="text-text-disabled" aria-hidden="true" />
          <p className="font-medium text-text-primary">No orders yet</p>
          <Link to={`/${storeSlug}`} className="text-sm font-medium text-primary hover:underline">
            Start shopping →
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="rounded-2xl border border-border-default bg-surface-card p-4 shadow-sm sm:p-5">
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
            <div className="flex items-center justify-between border-t border-border-default pt-2 text-sm">
              <span className="text-text-secondary">{new Date(order.createdAt).toLocaleDateString()}</span>
              <span className="font-semibold text-text-primary">{formatMoney(order.total)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

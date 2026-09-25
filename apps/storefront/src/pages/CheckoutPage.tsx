import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ImageOff, MapPin, MessageSquare, ShieldCheck, UserRound, Wallet } from "lucide-react";
import { Button } from "@commerceos/ui";
import { checkout } from "../api/storefront";
import { useCart } from "../cart/CartContext";
import { useCustomerAuth } from "../account/CustomerAuthContext";
import { ApiError } from "../lib/api-client";

function formatMoney(value: number): string {
  return `৳${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Per SRS Part 11.1/2.3 - Cash on Delivery only in V1; no payment form, no
// card fields, nothing implying an online payment exists. The COD
// messaging is deliberately a first-class visual element (not a plain-text
// line) - for this audience, "you don't pay until it's in your hands" is
// the single biggest reason to trust an unfamiliar seller enough to order.
// Checkout requires a customer account: a signed-out shopper is sent to
// sign in (or sign up) and brought straight back here with their cart
// intact. The order is placed under the account's own name and phone.
export default function CheckoutPage() {
  const { storeSlug = "" } = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const { customer, token, signOut } = useCustomerAuth();

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (cart.items.length === 0) {
    return <Navigate to={`/${storeSlug}/cart`} replace />;
  }

  if (!customer || !token) {
    return <Navigate to={`/${storeSlug}/account/login?redirect=checkout`} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!customer || !token) return;
    setError(null);

    setSubmitting(true);
    try {
      const { order } = await checkout(
        storeSlug,
        {
          customerName: customer.name,
          customerPhone: customer.phone,
          deliveryAddress,
          customerNote: customerNote || undefined,
          items: cart.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        },
        token,
      );
      cart.clear();
      navigate(`/${storeSlug}/order-confirmation`, { state: { order }, replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        signOut();
        navigate(`/${storeSlug}/account/login?redirect=checkout`, { replace: true });
        return;
      }
      setError(err instanceof ApiError ? err.message : "Something went wrong placing your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSwitchAccount() {
    signOut();
    navigate(`/${storeSlug}/account/login?redirect=checkout`, { replace: true });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">Checkout</h1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
        <form onSubmit={handleSubmit} className="order-2 md:order-1 md:col-span-3">
          <div className="space-y-4 rounded-2xl border border-border-default bg-surface-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border-default bg-surface-sunken px-3.5 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <UserRound size={18} className="shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0 text-sm">
                  <div className="truncate font-medium text-text-primary">{customer.name}</div>
                  <div className="text-xs text-text-secondary">{customer.phone}</div>
                </div>
              </div>
              <button type="button" onClick={handleSwitchAccount} className="shrink-0 text-xs font-medium text-primary hover:underline">
                Not you?
              </button>
            </div>
            <label className="block text-sm">
              <span className="mb-1.5 flex items-center gap-1.5 font-medium text-text-primary">
                <MapPin size={14} className="text-text-secondary" aria-hidden="true" />
                Delivery address
              </span>
              <textarea
                required
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border-default bg-surface-card px-3.5 py-2.5 text-sm text-text-primary transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 flex items-center gap-1.5 font-medium text-text-primary">
                <MessageSquare size={14} className="text-text-secondary" aria-hidden="true" />
                Order note <span className="font-normal text-text-secondary">(optional)</span>
              </span>
              <textarea
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                rows={2}
                placeholder="e.g. leave at the gate, call before arriving"
                className="w-full rounded-lg border border-border-default bg-surface-card px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-disabled transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              />
            </label>
          </div>

          {/* The trust signal - a real card, not a text line. */}
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary-subtle p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-white shadow-sm">
              <Wallet size={18} aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-text-primary">Cash on Delivery</p>
              <p className="mt-0.5 text-sm text-text-secondary">
                Pay in cash when your order arrives at your door. No online payment, no card details needed.
              </p>
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-4 animate-fade-in-up rounded-lg bg-status-danger/10 px-3.5 py-2.5 text-sm text-status-danger">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            className="mt-5 w-full shadow-md shadow-primary/20 transition-transform hover:-translate-y-0.5"
          >
            Place Order — {formatMoney(cart.total)}
          </Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-text-secondary">
            <ShieldCheck size={14} className="text-primary" aria-hidden="true" />
            We'll call to confirm before your order ships.
          </p>
        </form>

        <div className="order-1 h-fit rounded-2xl border border-border-default bg-surface-card p-5 shadow-sm md:order-2 md:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-text-primary">Order Summary</h2>
          <ul className="mb-4 space-y-3">
            {cart.items.map((item) => (
              <li key={item.variantId} className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-sunken">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageOff size={14} className="text-text-disabled" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="truncate text-text-primary">{item.productName}</div>
                  <div className="text-xs text-text-secondary">Qty {item.quantity}</div>
                </div>
                <span className="shrink-0 text-sm font-medium text-text-primary">
                  {formatMoney(Number(item.unitPrice) * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between border-t border-border-default pt-3 text-base font-bold tracking-tight text-text-primary">
            <span>Total</span>
            <span>{formatMoney(cart.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

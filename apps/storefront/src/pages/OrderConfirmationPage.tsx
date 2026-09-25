import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, MapPin, PhoneCall } from "lucide-react";
import { Button } from "@commerceos/ui";
import type { OrderView } from "../lib/api-types";

function formatMoney(value: string): string {
  return `৳${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Per SRS Part 9.3 - ties the confirmation moment directly to the
// codConfirmedByCall workflow the Store Owner uses internally: the
// customer is told upfront that a confirmation call is coming, so the
// eventual call isn't a surprise.
export default function OrderConfirmationPage() {
  const { storeSlug = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const order = (location.state as { order?: OrderView } | null)?.order;

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="mb-2 text-lg font-semibold text-text-primary">Order details unavailable</h1>
        <p className="mb-4 text-sm text-text-secondary">
          This page only shows details right after checkout. If you have your phone number, use Track Order to look
          up your order.
        </p>
        <Link to={`/${storeSlug}/track-order`} className="text-sm font-medium text-primary hover:underline">
          Track my order →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:py-16">
      <div className="mb-8 flex animate-fade-in-up flex-col items-center text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-status-success/10 shadow-sm">
          <CheckCircle2 size={44} className="text-status-success" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">Order placed!</h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          Order <span className="font-semibold text-text-primary">#{order.id.slice(-8).toUpperCase()}</span>
        </p>
      </div>

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary-subtle p-4 shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-white shadow-sm">
          <PhoneCall size={18} aria-hidden="true" />
        </div>
        <div>
          <p className="font-semibold text-text-primary">We'll call to confirm</p>
          <p className="mt-0.5 text-sm text-text-secondary">
            Expect a call shortly to confirm your order before it ships — this is a normal part of every order, so
            please keep your phone handy.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border-default bg-surface-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Order Summary</h2>
        <ul className="mb-3 space-y-2 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span className="text-text-secondary">
                {item.product.name} × {item.quantity}
              </span>
              <span className="text-text-primary">{formatMoney((Number(item.unitPrice) * item.quantity).toString())}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t border-border-default pt-3 text-base font-bold tracking-tight text-text-primary">
          <span>Total</span>
          <span>{formatMoney(order.total)}</span>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border-default bg-surface-card p-4 shadow-sm">
        <MapPin size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
        <div className="text-sm">
          <div className="font-medium text-text-primary">Delivery address</div>
          <div className="text-text-secondary">{order.deliveryAddress}</div>
        </div>
      </div>

      <Button
        variant="secondary"
        size="lg"
        onClick={() => navigate(`/${storeSlug}`)}
        className="mt-6 w-full transition-transform hover:-translate-y-0.5"
      >
        Continue shopping
      </Button>
    </div>
  );
}

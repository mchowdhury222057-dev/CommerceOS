import { Link, useNavigate, useParams } from "react-router-dom";
import { ImageOff, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@commerceos/ui";
import { useCart } from "../cart/CartContext";

function formatMoney(value: number): string {
  return `৳${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CartPage() {
  const { storeSlug = "" } = useParams();
  const navigate = useNavigate();
  const cart = useCart();

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
        <span className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-surface-sunken">
          <ShoppingBag size={32} className="text-text-disabled" aria-hidden="true" />
        </span>
        <h1 className="mb-2 text-xl font-bold text-text-primary">Your cart is empty</h1>
        <p className="mb-6 text-sm text-text-secondary">Add something you like to get started.</p>
        <Button variant="primary" onClick={() => navigate(`/${storeSlug}`)}>
          Continue shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">Your Cart</h1>

      <div className="divide-y divide-border-default rounded-2xl border border-border-default bg-surface-card shadow-sm">
        {cart.items.map((item) => {
          const label = Object.entries(item.variantAttributes)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ");
          const lineTotal = Number(item.unitPrice) * item.quantity;
          return (
            <div key={item.variantId} className="flex items-center gap-4 p-4 sm:p-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-sunken">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" />
                ) : (
                  <ImageOff size={20} className="text-text-disabled" aria-hidden="true" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-text-primary">{item.productName}</div>
                {label && <div className="text-xs text-text-secondary">{label}</div>}
                <div className="mt-1 text-sm text-text-secondary">{formatMoney(Number(item.unitPrice))} each</div>
              </div>

              <div className="flex shrink-0 items-center rounded-full border border-border-default">
                <button
                  type="button"
                  onClick={() => cart.updateQuantity(item.variantId, item.quantity - 1)}
                  aria-label="Decrease quantity"
                  className="flex h-8 w-8 items-center justify-center text-text-secondary transition-colors hover:text-text-primary"
                >
                  <Minus size={14} aria-hidden="true" />
                </button>
                <span className="w-6 text-center text-sm font-medium text-text-primary">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => cart.updateQuantity(item.variantId, item.quantity + 1)}
                  disabled={item.quantity >= item.stock}
                  aria-label="Increase quantity"
                  className="flex h-8 w-8 items-center justify-center text-text-secondary transition-colors hover:text-text-primary disabled:opacity-30"
                >
                  <Plus size={14} aria-hidden="true" />
                </button>
              </div>

              <div className="w-24 shrink-0 text-right font-bold text-text-primary">{formatMoney(lineTotal)}</div>

              <button
                type="button"
                onClick={() => cart.removeItem(item.variantId)}
                aria-label={`Remove ${item.productName}`}
                className="shrink-0 rounded-lg p-2 text-text-disabled transition-colors hover:bg-status-danger/10 hover:text-status-danger"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between rounded-2xl border border-border-default bg-surface-card p-5 shadow-sm sm:p-6">
        <span className="text-base font-medium text-text-secondary">Total</span>
        <span className="text-2xl font-extrabold tracking-tight text-text-primary">{formatMoney(cart.total)}</span>
      </div>

      <div className="mt-6 flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-between">
        <Link to={`/${storeSlug}`} className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary">
          ← Continue shopping
        </Link>
        <Button
          variant="primary"
          size="lg"
          onClick={() => navigate(`/${storeSlug}/checkout`)}
          className="w-full shadow-md shadow-primary/20 transition-transform hover:-translate-y-0.5 sm:w-auto"
        >
          Proceed to Checkout
        </Button>
      </div>
    </div>
  );
}

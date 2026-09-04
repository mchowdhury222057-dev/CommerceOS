import { Link, useParams } from "react-router-dom";
import { ImageOff } from "lucide-react";
import type { Product } from "../lib/api-types";

function formatMoney(value: number): string {
  return `৳${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Per SRS Part 8/11.1 - a product's variants can each carry their own
// priceOverride; showing a single flat basePrice when they differ would be
// misleading (e.g. a shirt whose XL variant costs more). Mirrors the same
// "from ৳X" logic already used in the Store Owner's own product list.
function priceDisplay(product: Product): string {
  const prices = product.variants.map((v) => (v.priceOverride != null ? Number(v.priceOverride) : Number(product.basePrice)));
  const distinct = new Set(prices);
  const base = distinct.size <= 1 ? formatMoney(Number(product.basePrice)) : `from ${formatMoney(Math.min(...prices))}`;
  return base;
}

export function ProductCard({ product }: { product: Product }) {
  const { storeSlug } = useParams();
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const imageUrl = product.images[0]?.url;
  const outOfStock = totalStock === 0;

  return (
    <Link
      to={`/${storeSlug}/products/${product.id}`}
      className="group block overflow-hidden rounded-lg border border-border-default bg-surface-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-surface-sunken">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.images[0]?.altText ?? product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-text-secondary">
            <ImageOff size={28} aria-hidden="true" />
            <span className="px-4 text-center text-xs">{product.name}</span>
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <span className="rounded-full bg-text-primary px-3 py-1 text-xs font-semibold text-white">Out of Stock</span>
          </div>
        )}
      </div>
      <div className="p-3.5">
        <h3 className="truncate text-sm font-medium text-text-primary group-hover:text-primary">{product.name}</h3>
        <p className="mt-1 text-base font-bold text-text-primary">{priceDisplay(product)}</p>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-lg border border-border-default bg-surface-card">
      <div className="aspect-square bg-surface-sunken" />
      <div className="space-y-2 p-3.5">
        <div className="h-4 w-3/4 rounded bg-surface-sunken" />
        <div className="h-4 w-1/3 rounded bg-surface-sunken" />
      </div>
    </div>
  );
}

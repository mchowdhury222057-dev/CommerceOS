import { Link, useParams } from "react-router-dom";
import { ImageOff, Plus } from "lucide-react";
import type { Product } from "../lib/api-types";
import { useCart } from "../cart/CartContext";
import { cn } from "../lib/cn";

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

const CARD_STYLE_CLASS: Record<"minimal" | "bordered" | "shadow", string> = {
  minimal: "border-transparent hover:shadow-lg",
  bordered: "border-border-default hover:border-primary/40 hover:shadow-lg",
  shadow: "border-transparent shadow-md hover:shadow-2xl",
};

export interface ProductCardProps {
  product: Product;
  showPrice?: boolean;
  showAddToCart?: boolean;
  cardStyle?: "minimal" | "bordered" | "shadow";
}

export function ProductCard({ product, showPrice = true, showAddToCart = false, cardStyle = "bordered" }: ProductCardProps) {
  const { storeSlug } = useParams();
  const cart = useCart();
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const imageUrl = product.images[0]?.url;
  const outOfStock = totalStock === 0;
  // A grid card has no variant-picker UI (Section 33 rules out building
  // one just for this) - quick add-to-cart only works for a single-variant
  // product; anything else falls through to the product page, same
  // destination the rest of the card already links to.
  const singleVariant = product.variants.length === 1 ? product.variants[0] : null;

  function handleQuickAdd(e: React.MouseEvent) {
    if (!singleVariant || singleVariant.stock === 0) return;
    e.preventDefault();
    cart.addItem(
      {
        productId: product.id,
        variantId: singleVariant.id,
        productName: product.name,
        imageUrl: imageUrl ?? null,
        variantAttributes: singleVariant.attributes,
        unitPrice: (singleVariant.priceOverride ?? product.basePrice).toString(),
        stock: singleVariant.stock,
      },
      1,
    );
  }

  return (
    <Link
      to={`/${storeSlug}/products/${product.id}`}
      className={cn(
        "group relative block overflow-hidden border bg-surface-card transition-all duration-300 ease-out hover:-translate-y-1",
        CARD_STYLE_CLASS[cardStyle],
      )}
      style={{ borderRadius: "var(--radius-md)" }}
    >
      <div className="relative aspect-square overflow-hidden bg-surface-sunken">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.images[0]?.altText ?? product.name}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
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
        {showAddToCart && !outOfStock && (
          <button
            type="button"
            onClick={handleQuickAdd}
            aria-label={`Add ${product.name} to cart`}
            title={singleVariant ? "Add to cart" : "Choose options"}
            className="absolute bottom-2.5 right-2.5 flex h-10 w-10 translate-y-1 items-center justify-center bg-primary text-white opacity-0 shadow-lg shadow-black/20 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 hover:bg-primary-hover"
            style={{ borderRadius: "var(--theme-button-radius)" }}
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="p-4">
        <h3 className="truncate text-sm font-medium text-text-primary transition-colors group-hover:text-primary">{product.name}</h3>
        {showPrice && <p className="mt-1.5 text-base font-bold tracking-tight text-text-primary">{priceDisplay(product)}</p>}
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

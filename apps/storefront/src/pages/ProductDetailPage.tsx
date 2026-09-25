import { useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronLeft, ImageOff, ShieldCheck } from "lucide-react";
import { Button } from "@commerceos/ui";
import { getProduct } from "../api/storefront";
import { useCart } from "../cart/CartContext";
import type { ProductVariant } from "../lib/api-types";

function formatMoney(value: number): string {
  return `৳${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Per SRS Part 8/11.1 - the variant selector resolves to exactly one
// ProductVariant, and its priceOverride (falling back to basePrice) is the
// SAME calculation the checkout endpoint uses (order.service.ts's
// placeOrder: `variant.priceOverride ?? variant.product.basePrice`) - this
// page must never show a price checkout would then disagree with.
function resolveVariant(variants: ProductVariant[], selected: Record<string, string>): ProductVariant | undefined {
  return variants.find((v) => Object.entries(selected).every(([key, value]) => v.attributes[key] === value));
}

export default function ProductDetailPage() {
  const { storeSlug = "", productId = "" } = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const productQuery = useQuery({
    queryKey: ["product", storeSlug, productId],
    queryFn: () => getProduct(storeSlug, productId),
  });

  const attributeOptions = useMemo(() => {
    const options: Record<string, Set<string>> = {};
    for (const variant of productQuery.data?.product.variants ?? []) {
      for (const [key, value] of Object.entries(variant.attributes)) {
        (options[key] ??= new Set()).add(value);
      }
    }
    return Object.fromEntries(Object.entries(options).map(([k, v]) => [k, Array.from(v)]));
  }, [productQuery.data]);

  const variants = productQuery.data?.product.variants ?? [];
  const attributeKeys = Object.keys(attributeOptions);
  const allAttributesSelected = attributeKeys.every((key) => selected[key]);
  const selectedVariant = allAttributesSelected ? resolveVariant(variants, selected) : variants.length === 1 ? variants[0] : undefined;

  if (productQuery.isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-xl bg-surface-sunken" />
          <div className="space-y-4">
            <div className="h-8 w-2/3 animate-pulse rounded bg-surface-sunken" />
            <div className="h-6 w-1/3 animate-pulse rounded bg-surface-sunken" />
          </div>
        </div>
      </div>
    );
  }
  if (productQuery.isError || !productQuery.data) {
    return <div className="mx-auto max-w-5xl px-4 py-10 text-status-danger">This product isn't available.</div>;
  }

  const product = productQuery.data.product;
  const activeImage = product.images[activeImageIndex] ?? product.images[0];
  const price = selectedVariant ? Number(selectedVariant.priceOverride ?? product.basePrice) : null;
  const outOfStock = selectedVariant ? selectedVariant.stock === 0 : false;
  const lowStock = selectedVariant ? selectedVariant.stock > 0 && selectedVariant.stock <= 5 : false;
  const maxQuantity = selectedVariant ? Math.min(selectedVariant.stock, 20) : 1;

  function handleAddToCart() {
    if (!selectedVariant) return;
    cart.addItem(
      {
        productId: product.id,
        variantId: selectedVariant.id,
        productName: product.name,
        imageUrl: product.images[0]?.url ?? null,
        variantAttributes: selectedVariant.attributes,
        unitPrice: (selectedVariant.priceOverride ?? product.basePrice).toString(),
        stock: selectedVariant.stock,
      },
      quantity,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <Link to={`/${storeSlug}`} className="mb-6 inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-text-primary">
        <ChevronLeft size={16} aria-hidden="true" />
        Back to shop
      </Link>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-14">
        <div>
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-border-default bg-surface-sunken shadow-sm">
            {activeImage ? (
              <img src={activeImage.url} alt={activeImage.altText ?? product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-text-secondary">
                <ImageOff size={40} aria-hidden="true" />
                <span className="text-sm">{product.name}</span>
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {product.images.map((image, i) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActiveImageIndex(i)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                    i === activeImageIndex ? "border-primary shadow-sm" : "border-border-default hover:border-border-strong"
                  }`}
                >
                  <img src={image.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {product.category && <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-primary">{product.category.name}</p>}
          <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">{product.name}</h1>

          <div className="mt-3 flex items-center gap-3">
            <p className="text-3xl font-extrabold tracking-tight text-text-primary">{price != null ? formatMoney(price) : formatMoney(Number(product.basePrice))}</p>
            {selectedVariant && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  outOfStock ? "bg-status-danger/10 text-status-danger" : lowStock ? "bg-accent/10 text-accent" : "bg-status-success/10 text-status-success"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${outOfStock ? "bg-status-danger" : lowStock ? "bg-accent" : "bg-status-success"}`} />
                {outOfStock ? "Out of Stock" : lowStock ? `Only ${selectedVariant.stock} left` : "In Stock"}
              </span>
            )}
          </div>

          {product.description && <p className="mt-4 text-sm leading-relaxed text-text-secondary">{product.description}</p>}

          {attributeKeys.map((key) => (
            <div key={key} className="mt-6">
              <span className="mb-2 block text-sm font-semibold capitalize text-text-primary">{key}</span>
              <div className="flex flex-wrap gap-2">
                {attributeOptions[key].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelected((s) => ({ ...s, [key]: value }))}
                    className={`min-w-[3rem] rounded-full border-2 px-4 py-2 text-sm font-medium transition-all ${
                      selected[key] === value
                        ? "border-primary bg-primary text-white shadow-sm"
                        : "border-border-default text-text-primary hover:border-primary/50"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {selectedVariant && !outOfStock && (
            <div className="mt-6 flex items-center gap-3">
              <span className="text-sm font-medium text-text-primary">Quantity</span>
              <select
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="rounded-lg border border-border-default bg-surface-card px-3 py-2 text-sm text-text-primary transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {Array.from({ length: maxQuantity }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-7">
            <Button
              variant="primary"
              size="lg"
              disabled={!selectedVariant || outOfStock}
              onClick={handleAddToCart}
              className="w-full shadow-md shadow-primary/20 transition-transform hover:-translate-y-0.5 sm:w-auto sm:min-w-[220px]"
            >
              {outOfStock ? "Out of Stock" : selectedVariant ? "Add to Cart" : "Select options"}
            </Button>
            {added && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-status-success/10 px-3.5 py-2.5 text-sm font-medium text-status-success animate-fade-in-up">
                <Check size={16} aria-hidden="true" />
                Added to cart —{" "}
                <button type="button" onClick={() => navigate(`/${storeSlug}/cart`)} className="underline hover:no-underline">
                  view cart
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-border-default bg-surface-card px-4 py-3.5 text-xs text-text-secondary">
            <ShieldCheck size={18} className="shrink-0 text-primary" aria-hidden="true" />
            Cash on Delivery — pay when your order arrives, no online payment needed.
          </div>
        </div>
      </div>
    </div>
  );
}

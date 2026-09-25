import { PackageSearch } from "lucide-react";
import type { ProductGridSectionSettings, Product } from "../../lib/api-types";
import { ProductCard, ProductCardSkeleton } from "../ProductCard";

const COLUMNS_CLASS: Record<2 | 3 | 4, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
};

// Per Section 14 - the storefront's main catalog grid (generalizes what
// HomePage used to hardcode as "All Products"). isError/isLoading/empty
// states carried over unchanged from that original implementation.
export function ProductGrid({
  settings,
  products,
  isLoading,
  isError,
  cardStyle,
}: {
  settings: ProductGridSectionSettings;
  products: Product[];
  isLoading: boolean;
  isError: boolean;
  cardStyle: "minimal" | "bordered" | "shadow";
}) {
  return (
    <section id="products" className="mx-auto max-w-theme scroll-mt-20 px-4" style={{ paddingBlock: "var(--theme-section-spacing)" }}>
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">{settings.title}</h2>
        {!isLoading && !isError && <span className="text-sm text-text-secondary">{products.length} items</span>}
      </div>

      {isError && (
        <p className="border border-border-default bg-surface-card px-4 py-8 text-center text-status-danger" style={{ borderRadius: "var(--radius-md)" }}>
          Could not load products right now. Please try again shortly.
        </p>
      )}

      {isLoading && (
        <div className={`grid gap-4 sm:gap-6 ${COLUMNS_CLASS[settings.columns]}`}>
          {Array.from({ length: settings.columns * 2 }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && !isError && products.length === 0 && (
        <div
          className="flex flex-col items-center gap-3 border border-dashed border-border-default bg-surface-card px-4 py-16 text-center"
          style={{ borderRadius: "var(--radius-md)" }}
        >
          <PackageSearch size={40} className="text-text-disabled" aria-hidden="true" />
          <p className="font-medium text-text-primary">No products yet</p>
          <p className="max-w-xs text-sm text-text-secondary">This store hasn't added any products. Check back soon.</p>
        </div>
      )}

      {!isLoading && !isError && products.length > 0 && (
        <div className={`grid gap-4 sm:gap-6 ${COLUMNS_CLASS[settings.columns]}`}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} showPrice={settings.showPrice} showAddToCart={settings.showAddToCart} cardStyle={cardStyle} />
          ))}
        </div>
      )}
    </section>
  );
}

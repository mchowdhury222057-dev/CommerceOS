import type { FeaturedProductsSectionSettings, Product } from "../../lib/api-types";
import { ProductCard, ProductCardSkeleton } from "../ProductCard";

const COLUMNS_CLASS: Record<2 | 3 | 4, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
};

export function FeaturedProducts({
  settings,
  products,
  isLoading,
  cardStyle,
}: {
  settings: FeaturedProductsSectionSettings;
  products: Product[];
  isLoading: boolean;
  cardStyle: "minimal" | "bordered" | "shadow";
}) {
  const visible = products.slice(0, settings.limit);
  if (!isLoading && visible.length === 0) return null;

  return (
    <section className="mx-auto max-w-theme px-4" style={{ paddingBlock: "var(--theme-section-spacing)" }}>
      <h2 className="mb-6 font-heading text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">{settings.title}</h2>
      <div className={`grid gap-4 sm:gap-6 ${COLUMNS_CLASS[settings.columns]}`}>
        {isLoading
          ? Array.from({ length: settings.columns * 2 }, (_, i) => <ProductCardSkeleton key={i} />)
          : visible.map((product) => (
              <ProductCard key={product.id} product={product} showPrice={settings.showPrice} showAddToCart={settings.showAddToCart} cardStyle={cardStyle} />
            ))}
      </div>
    </section>
  );
}

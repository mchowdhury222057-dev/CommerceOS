import { ArrowUpRight, LayoutGrid } from "lucide-react";
import type { FeaturedCategoriesSectionSettings } from "../../lib/api-types";
import type { Product } from "../../lib/api-types";

// Per Section 13's own "use existing Product data" principle applied to
// categories too - no dedicated category-listing endpoint exists for the
// public storefront, so categories are derived from whatever products are
// already loaded (Product.category is already part of every Product
// response) rather than adding a new endpoint just for this section.
export function FeaturedCategories({
  settings,
  products,
  selectedCategoryId,
  onSelectCategory,
}: {
  settings: FeaturedCategoriesSectionSettings;
  products: Product[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}) {
  const categories = new Map<string, { id: string; name: string; count: number }>();
  for (const product of products) {
    if (!product.category) continue;
    const existing = categories.get(product.category.id);
    if (existing) existing.count += 1;
    else categories.set(product.category.id, { id: product.category.id, name: product.category.name, count: 1 });
  }
  const list = Array.from(categories.values()).slice(0, settings.limit);

  if (list.length === 0) return null;

  return (
    <section id="categories" className="mx-auto max-w-theme scroll-mt-20 px-4" style={{ paddingBlock: "var(--theme-section-spacing)" }}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">{settings.title}</h2>
          <p className="mt-1 text-sm text-text-secondary">Find exactly what you need, faster.</p>
        </div>
        {selectedCategoryId && (
          <button type="button" onClick={() => onSelectCategory(null)} className="shrink-0 text-sm font-medium text-primary hover:underline">
            View All Categories →
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {list.map((category) => {
          const active = selectedCategoryId === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(active ? null : category.id)}
              className={`group relative flex flex-col items-center gap-3 overflow-hidden border p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                active ? "border-primary bg-primary-subtle" : "border-border-default bg-surface-card hover:border-primary/40"
              }`}
              style={{ borderRadius: "var(--radius-md)" }}
            >
              <span
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-border-default bg-surface-page text-text-secondary opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:text-primary group-hover:opacity-100"
                aria-hidden="true"
              >
                <ArrowUpRight size={14} />
              </span>
              <span
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-sm transition-transform duration-300 group-hover:scale-110"
                aria-hidden="true"
              >
                <LayoutGrid size={20} />
              </span>
              <span className="text-sm font-semibold text-text-primary">{category.name}</span>
              <span className="text-xs text-text-secondary">{category.count} items</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

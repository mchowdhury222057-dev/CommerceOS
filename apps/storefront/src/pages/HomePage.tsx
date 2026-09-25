import { useMemo, useState } from "react";
import { Link, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { SearchX } from "lucide-react";
import { listProducts } from "../api/storefront";
import { SectionRenderer } from "../components/sections/SectionRenderer";
import { ProductCard, ProductCardSkeleton } from "../components/ProductCard";
import type { PublicStore } from "../lib/api-types";

// Per Sections 9/20/27 - the homepage is now built entirely from the
// published theme's ordered, enabled section list, rendered against real
// product data (fetched once, here, and handed down to every section that
// needs it) rather than a hardcoded hero + product grid.
//
// A ?q= param (set by Nav's real, client-side search) switches the page
// into a plain search-results grid instead of the theme's section list -
// hero/promo/trust sections don't make sense mid-search, same UX pattern
// most storefronts use. No backend search endpoint exists, so this filters
// the same product list the homepage already fetches - real filtering, not
// a fabricated integration.
export default function HomePage() {
  const { storeSlug = "" } = useParams();
  const store = useOutletContext<PublicStore>();
  const productsQuery = useQuery({ queryKey: ["products", storeSlug], queryFn: () => listProducts(storeSlug) });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";

  const searchResults = useMemo(() => {
    if (!query) return null;
    const needle = query.toLowerCase();
    return (productsQuery.data?.products ?? []).filter((p) => p.name.toLowerCase().includes(needle));
  }, [query, productsQuery.data]);

  if (query) {
    return (
      <div className="mx-auto max-w-theme px-4" style={{ paddingBlock: "var(--theme-section-spacing)" }}>
        <h1 className="mb-1 font-heading text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          Search results for &ldquo;{query}&rdquo;
        </h1>
        {!productsQuery.isLoading && <p className="mb-6 text-sm text-text-secondary">{searchResults?.length ?? 0} products found</p>}

        {productsQuery.isLoading && (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!productsQuery.isLoading && searchResults && searchResults.length === 0 && (
          <div
            className="flex flex-col items-center gap-3 border border-dashed border-border-default bg-surface-card px-4 py-16 text-center"
            style={{ borderRadius: "var(--radius-md)" }}
          >
            <SearchX size={40} className="text-text-disabled" aria-hidden="true" />
            <p className="font-medium text-text-primary">No products match &ldquo;{query}&rdquo;</p>
            <Link to={`/${storeSlug}`} className="text-sm font-medium text-primary hover:underline">
              Clear search
            </Link>
          </div>
        )}

        {!productsQuery.isLoading && searchResults && searchResults.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {searchResults.map((product) => (
              <ProductCard key={product.id} product={product} cardStyle={store.theme.productCardStyle} showAddToCart />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <SectionRenderer
      sections={store.layout.sections}
      products={productsQuery.data?.products ?? []}
      productsLoading={productsQuery.isLoading}
      productsError={productsQuery.isError}
      cardStyle={store.theme.productCardStyle}
      selectedCategoryId={selectedCategoryId}
      onSelectCategory={setSelectedCategoryId}
    />
  );
}

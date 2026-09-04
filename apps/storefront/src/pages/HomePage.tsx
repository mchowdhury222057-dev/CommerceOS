import { useOutletContext, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, PackageSearch } from "lucide-react";
import { listProducts } from "../api/storefront";
import { ProductCard, ProductCardSkeleton } from "../components/ProductCard";
import type { PublicStore } from "../lib/api-types";

// Per SRS Part 22.4/2.3 - a real hero banner (not empty white space): the
// store's own hero copy (still sourced from the API - that's content, not
// branding) inside a bold, gradient, on-brand band using this app's own
// default teal, with an obvious "Shop Now" CTA. Doubles as the product
// listing page (no separate /products route this app) - "All Products"
// below is both the homepage grid and the full catalog.
export default function HomePage() {
  const { storeSlug = "" } = useParams();
  const store = useOutletContext<PublicStore>();
  const productsQuery = useQuery({ queryKey: ["products", storeSlug], queryFn: () => listProducts(storeSlug) });

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-hover px-4 py-20 text-center text-white sm:py-28">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle, #fff 1.5px, transparent 1.5px)", backgroundSize: "28px 28px" }} aria-hidden="true" />
        <div className="relative">
          <h1 className="mx-auto max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">{store.layout.heroHeading}</h1>
          {store.layout.heroSubheading && (
            <p className="mx-auto mt-4 max-w-xl text-base text-white/90 sm:text-lg">{store.layout.heroSubheading}</p>
          )}
          <a
            href="#products"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary shadow-lg transition-transform hover:scale-105"
          >
            Shop Now
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </section>

      <div id="products" className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">All Products</h2>
          {productsQuery.data && (
            <span className="text-sm text-text-secondary">{productsQuery.data.products.length} items</span>
          )}
        </div>

        {productsQuery.isError && (
          <p className="rounded-lg border border-border-default bg-surface-card px-4 py-8 text-center text-status-danger">
            Could not load products right now. Please try again shortly.
          </p>
        )}

        {productsQuery.isLoading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        )}

        {productsQuery.data?.products.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-default bg-surface-card px-4 py-16 text-center">
            <PackageSearch size={40} className="text-text-disabled" aria-hidden="true" />
            <p className="font-medium text-text-primary">No products yet</p>
            <p className="max-w-xs text-sm text-text-secondary">This store hasn't added any products. Check back soon.</p>
          </div>
        )}

        {productsQuery.data && productsQuery.data.products.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
            {productsQuery.data.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

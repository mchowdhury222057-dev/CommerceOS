import { useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "../api/storefront";
import { SectionRenderer } from "../components/sections/SectionRenderer";
import type { PublicStore } from "../lib/api-types";

// Per Sections 9/20/27 - the homepage is now built entirely from the
// published theme's ordered, enabled section list, rendered against real
// product data (fetched once, here, and handed down to every section that
// needs it) rather than a hardcoded hero + product grid.
export default function HomePage() {
  const { storeSlug = "" } = useParams();
  const store = useOutletContext<PublicStore>();
  const productsQuery = useQuery({ queryKey: ["products", storeSlug], queryFn: () => listProducts(storeSlug) });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

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

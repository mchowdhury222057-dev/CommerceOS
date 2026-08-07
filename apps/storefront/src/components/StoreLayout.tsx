import { Outlet, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getStoreInfo } from "../api/storefront";
import { CartProvider } from "../cart/CartContext";
import { Nav } from "./Nav";
import { Footer } from "./Footer";

// Per Part 6.3 - resolves the store from :storeSlug once, at the top of the
// route tree, and wraps every child page in a CartProvider scoped to that
// exact store. A store that doesn't exist or isn't Active renders the same
// "not found" state (see storefront.service.ts's resolveActiveStore) -
// this app never distinguishes those two cases for a visitor.
//
// Colors/fonts come entirely from the storefront's own default design
// tokens (src/index.css) this round, not from store.theme.* - per the
// milestone scope, pulling live per-store branding is a later pass. The
// store's `theme` object is still fetched and available on `store` (passed
// via Outlet context) for whenever that integration lands.
export function StoreLayout() {
  const { storeSlug = "" } = useParams();
  const storeQuery = useQuery({ queryKey: ["store", storeSlug], queryFn: () => getStoreInfo(storeSlug) });

  if (storeQuery.isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-text-secondary">Loading…</div>;
  }
  if (storeQuery.isError || !storeQuery.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center text-center">
        <h1 className="mb-2 text-lg font-semibold text-text-primary">Store not found</h1>
        <p className="text-sm text-text-secondary">This store doesn't exist or isn't available right now.</p>
      </div>
    );
  }

  const store = storeQuery.data;

  return (
    <CartProvider storeSlug={storeSlug}>
      <div className="flex min-h-screen flex-col bg-surface-page">
        <Nav storeName={store.name} logoUrl={store.theme.logoUrl} />
        <div className="flex-1">
          <Outlet context={store} />
        </div>
        <Footer storeName={store.name} />
      </div>
    </CartProvider>
  );
}

import { useEffect } from "react";
import { Outlet, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getStoreInfo } from "../api/storefront";
import { CartProvider } from "../cart/CartContext";
import { CustomerAuthProvider } from "../account/CustomerAuthContext";
import { applyThemeToDocument } from "../lib/theme";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { AnnouncementBar } from "./sections/AnnouncementBar";

// Per Part 6.3 - resolves the store from :storeSlug once, at the top of the
// route tree, and wraps every child page in a CartProvider scoped to that
// exact store. A store that doesn't exist or isn't Active renders the same
// "not found" state (see storefront.service.ts's resolveActiveStore) -
// this app never distinguishes those two cases for a visitor.
//
// Per the Theme Editor milestone (Sections 7/8/27) - the store's full theme
// is applied here, once, at the top of the route tree, via CSS custom
// property overrides (lib/theme.ts) - every page/component underneath
// picks it up automatically through the same Tailwind tokens they already
// used, no per-component changes needed. The Announcement Bar renders here
// too (site-wide chrome, like the header/footer, not a per-page section).
export function StoreLayout() {
  const { storeSlug = "" } = useParams();
  const storeQuery = useQuery({ queryKey: ["store", storeSlug], queryFn: () => getStoreInfo(storeSlug) });
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (storeQuery.data) applyThemeToDocument(storeQuery.data.theme);
  }, [storeQuery.data]);

  // React Router's client-side <Link to="#hash"> navigation never triggers
  // the browser's native hash-scroll (that only happens on a full page
  // load with a plain <a href>) - this replicates it so Nav's Home/Shop/
  // Categories links (and any other #anchor link) actually move the page
  // instead of just changing the URL. Runs here, once, above every child
  // route, rather than per-page, since it's the same behavior everywhere.
  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    window.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, hash]);

  if (storeQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-border-default border-t-primary" aria-label="Loading" />
      </div>
    );
  }
  if (storeQuery.isError || !storeQuery.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface-page px-4 text-center">
        <h1 className="mb-2 text-lg font-semibold text-text-primary">Store Unavailable</h1>
        <p className="text-sm text-text-secondary">This store is currently unavailable.</p>
      </div>
    );
  }

  const store = storeQuery.data;

  return (
    <CustomerAuthProvider storeSlug={storeSlug}>
      <CartProvider storeSlug={storeSlug}>
        <div className="flex min-h-screen flex-col bg-surface-page">
          <AnnouncementBar settings={store.layout.announcementBar} />
          <Nav storeName={store.name} logoUrl={store.theme.logoUrl} showSearch={store.layout.header.showSearch} />
          <div className="flex-1">
            <Outlet context={store} />
          </div>
          <Footer storeName={store.name} settings={store.layout.footer} />
        </div>
      </CartProvider>
    </CustomerAuthProvider>
  );
}

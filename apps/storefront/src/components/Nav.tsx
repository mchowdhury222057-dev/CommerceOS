import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Menu, Search, ShoppingCart, X } from "lucide-react";
import { useCart } from "../cart/CartContext";

// Text-based placeholder logo: a colored monogram badge next to the store
// name. Per Part 7's scope note, real per-store logo/branding data isn't
// wired in this round - store.theme.logoUrl (already fetched) is still
// honored when present, this is just the fallback that makes "no logo yet"
// look intentional rather than broken.
function LogoMark({ storeName, logoUrl }: { storeName: string; logoUrl: string | null }) {
  if (logoUrl) {
    return <img src={logoUrl} alt={storeName} className="h-9 w-9 rounded-lg object-cover shadow-sm" />;
  }
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-sm font-bold text-white shadow-sm">
      {storeName.charAt(0).toUpperCase()}
    </span>
  );
}

export function Nav({ storeName, logoUrl, showSearch = true }: { storeName: string; logoUrl: string | null; showSearch?: boolean }) {
  const { storeSlug } = useParams();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-border-default bg-surface-card/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-theme items-center gap-4 px-4 py-3">
        <Link to={`/${storeSlug}`} className="flex shrink-0 items-center gap-2.5" onClick={() => setMenuOpen(false)}>
          <LogoMark storeName={storeName} logoUrl={logoUrl} />
          <span className="font-heading text-lg font-bold tracking-tight text-text-primary">{storeName}</span>
        </Link>

        {/* Visual-only search - not functionally wired this round (out of
            scope per the milestone), but present so the header reads as a
            real storefront, not a placeholder. Toggleable per Section 11's
            Header customization. */}
        {showSearch && (
          <div className="hidden flex-1 md:block">
            <label className="relative block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" aria-hidden="true" />
              <input
                type="search"
                placeholder={`Search ${storeName}…`}
                className="w-full max-w-md rounded-full border border-border-default bg-surface-page py-2 pl-9 pr-4 text-sm text-text-primary placeholder:text-text-disabled transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              />
            </label>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            to={`/${storeSlug}/track-order`}
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary sm:block"
          >
            Track Order
          </Link>
          <Link
            to={`/${storeSlug}/cart`}
            aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-text-primary transition-colors hover:bg-surface-sunken"
          >
            <ShoppingCart size={20} aria-hidden="true" />
            {itemCount > 0 && (
              <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-white shadow-sm">
                {itemCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-text-primary transition-colors hover:bg-surface-sunken md:hidden"
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile panel - search + Track Order, since this audience browses
          primarily on phones (per the milestone's explicit priority) and
          both need to stay reachable without the desktop's horizontal
          space. */}
      {menuOpen && (
        <div className="border-t border-border-default bg-surface-card px-4 py-3 md:hidden">
          {showSearch && (
            <label className="relative mb-2 block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" aria-hidden="true" />
              <input
                type="search"
                placeholder={`Search ${storeName}…`}
                className="w-full rounded-full border border-border-default bg-surface-page py-2 pl-9 pr-4 text-sm text-text-primary placeholder:text-text-disabled focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              />
            </label>
          )}
          <Link
            to={`/${storeSlug}/track-order`}
            onClick={() => setMenuOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary"
          >
            Track Order
          </Link>
        </div>
      )}
    </header>
  );
}

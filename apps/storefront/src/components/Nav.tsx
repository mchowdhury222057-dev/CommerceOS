import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { LayoutGrid, Menu, Search, ShoppingCart, Store, UserRound, X } from "lucide-react";
import { useCart } from "../cart/CartContext";
import { useCustomerAuth } from "../account/CustomerAuthContext";

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

// Real (not decorative) client-side search: filters the products the
// homepage already fetches via listProducts, via a ?q= URL param, rather
// than fabricating a backend search endpoint that doesn't exist. See
// HomePage.tsx's handling of the same param.
function useSearchNavigate() {
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  return (query: string) => {
    const q = query.trim();
    navigate(q ? `/${storeSlug}?q=${encodeURIComponent(q)}` : `/${storeSlug}`);
  };
}

const NAV_LINK_CLASS =
  "relative rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:scale-x-0 after:bg-gradient-to-r after:from-primary after:to-accent after:transition-transform after:content-[''] hover:after:scale-x-100";

export function Nav({ storeName, logoUrl, showSearch = true }: { storeName: string; logoUrl: string | null; showSearch?: boolean }) {
  const { storeSlug } = useParams();
  const [searchParams] = useSearchParams();
  const { itemCount } = useCart();
  const { customer } = useCustomerAuth();
  const accountHref = customer ? `/${storeSlug}/account` : `/${storeSlug}/account/login`;
  const accountLabel = customer ? "My Account" : "Sign in";
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const goToSearch = useSearchNavigate();

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    goToSearch(query);
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border-default bg-surface-card/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-theme items-center gap-3 px-4 py-3">
        <Link to={`/${storeSlug}`} className="flex shrink-0 items-center gap-2.5" onClick={() => setMenuOpen(false)}>
          <LogoMark storeName={storeName} logoUrl={logoUrl} />
          <span className="font-heading text-lg font-bold tracking-tight text-text-primary">{storeName}</span>
        </Link>

        <nav className="hidden shrink-0 items-center gap-0.5 md:flex" aria-label="Primary">
          <Link to={`/${storeSlug}`} className={NAV_LINK_CLASS}>
            Home
          </Link>
          <Link to={`/${storeSlug}#products`} className={NAV_LINK_CLASS}>
            Shop
          </Link>
          <Link to={`/${storeSlug}#categories`} className={NAV_LINK_CLASS}>
            Categories
          </Link>
        </nav>

        {showSearch && (
          <form onSubmit={handleSearchSubmit} className="hidden flex-1 md:block">
            <label className="relative block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for products…"
                className="w-full max-w-md rounded-full border border-border-default bg-surface-page py-2 pl-9 pr-4 text-sm text-text-primary placeholder:text-text-disabled transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              />
            </label>
          </form>
        )}

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            to={`/${storeSlug}/track-order`}
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary sm:flex"
          >
            <Store size={16} aria-hidden="true" />
            Track Order
          </Link>
          <Link
            to={accountHref}
            aria-label={accountLabel}
            title={customer ? `Signed in as ${customer.name}` : "Sign in"}
            className="flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-sunken"
          >
            <UserRound size={20} aria-hidden="true" />
            <span className="hidden lg:inline">{accountLabel}</span>
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

      {/* Mobile panel - nav links + search + Track Order, since this
          audience browses primarily on phones (per the milestone's explicit
          priority) and all need to stay reachable without the desktop's
          horizontal space. */}
      {menuOpen && (
        <div className="space-y-1 border-t border-border-default bg-surface-card px-4 py-3 md:hidden">
          {showSearch && (
            <form onSubmit={handleSearchSubmit}>
              <label className="relative mb-2 block">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for products…"
                  className="w-full rounded-full border border-border-default bg-surface-page py-2 pl-9 pr-4 text-sm text-text-primary placeholder:text-text-disabled focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                />
              </label>
            </form>
          )}
          <Link to={`/${storeSlug}`} onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary">
            Home
          </Link>
          <Link
            to={`/${storeSlug}#products`}
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary"
          >
            <Store size={16} aria-hidden="true" />
            Shop
          </Link>
          <Link
            to={`/${storeSlug}#categories`}
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary"
          >
            <LayoutGrid size={16} aria-hidden="true" />
            Categories
          </Link>
          <Link
            to={`/${storeSlug}/track-order`}
            onClick={() => setMenuOpen(false)}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary"
          >
            Track Order
          </Link>
          <Link
            to={accountHref}
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary"
          >
            <UserRound size={16} aria-hidden="true" />
            {accountLabel}
          </Link>
        </div>
      )}
    </header>
  );
}

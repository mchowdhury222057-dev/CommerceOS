import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Menu, Plus, Search, Settings, User as UserIcon, LogOut } from "lucide-react";
import { Button } from "@commerceos/ui";
import { logout } from "../api/auth";
import { useAuthStore } from "../stores/auth.store";
import { Avatar } from "./ui/Avatar";
import { Breadcrumb } from "./ui/Breadcrumb";
import type { Crumb } from "./ui/Breadcrumb";
import { DropdownContent, DropdownItem, DropdownLabel, DropdownRoot, DropdownSeparator, DropdownTrigger } from "./ui/Dropdown";
import { EmptyState } from "./ui/EmptyState";
import { ThemeToggle } from "./ThemeToggle";

export interface TopNavProps {
  storeName?: string;
  breadcrumb: Crumb[];
  onOpenMobileMenu: () => void;
}

export function TopNav({ storeName, breadcrumb, onOpenMobileMenu }: TopNavProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const [search, setSearch] = useState("");

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clear();
    }
  }

  // The only cross-page search this backend actually supports is
  // GET /api/store/:storeId/products?search= (products.routes.ts) - so
  // this searches products for real rather than pretending to search
  // orders/customers too, which have no such endpoint.
  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;
    navigate(`/products?search=${encodeURIComponent(search.trim())}`);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border-default bg-surface-card">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open menu"
          className="rounded-lg p-2 text-text-secondary hover:bg-surface-sunken hover:text-text-primary lg:hidden"
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <div className="hidden min-w-0 flex-col lg:flex">
          {storeName && <span className="truncate text-sm font-semibold text-text-primary">{storeName}</span>}
          <Breadcrumb items={breadcrumb} />
        </div>

        <form onSubmit={handleSearchSubmit} className="ml-2 hidden flex-1 max-w-md md:block">
          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="w-full rounded-lg border border-border-default bg-surface-sunken py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-disabled focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="primary" size="sm" onClick={() => navigate("/products/new")} className="hidden sm:inline-flex">
            <Plus size={14} aria-hidden="true" />
            Add Product
          </Button>

          <ThemeToggle />

          <DropdownRoot>
            <DropdownTrigger asChild>
              <button
                type="button"
                aria-label="Notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary"
              >
                <Bell size={18} aria-hidden="true" />
              </button>
            </DropdownTrigger>
            <DropdownContent className="w-80 p-0">
              <div className="border-b border-border-default px-4 py-3 text-sm font-semibold text-text-primary">Notifications</div>
              <EmptyState
                icon={<Bell size={20} aria-hidden="true" />}
                title="No notifications yet"
                description="You'll see new-order and low-stock alerts here once notifications are wired up."
              />
            </DropdownContent>
          </DropdownRoot>

          <DropdownRoot>
            <DropdownTrigger asChild>
              <button type="button" className="rounded-full transition-transform hover:scale-105" aria-label="Account menu">
                <Avatar name={user?.email ?? "?"} size="md" />
              </button>
            </DropdownTrigger>
            <DropdownContent>
              <DropdownLabel>{user?.email}</DropdownLabel>
              <DropdownSeparator />
              <DropdownItem onSelect={() => navigate("/profile")}>
                <UserIcon size={15} aria-hidden="true" />
                Profile
              </DropdownItem>
              <DropdownItem onSelect={() => navigate("/settings")}>
                <Settings size={15} aria-hidden="true" />
                Settings
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem destructive onSelect={handleLogout}>
                <LogOut size={15} aria-hidden="true" />
                Logout
              </DropdownItem>
            </DropdownContent>
          </DropdownRoot>
        </div>
      </div>
    </header>
  );
}

import { NavLink } from "react-router-dom";
import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  PackagePlus,
  Package,
  Settings,
  ShoppingCart,
  User,
  Users,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { logout } from "../api/auth";
import { useAuthStore } from "../stores/auth.store";
import { Tooltip } from "./ui/Tooltip";
import { cn } from "../lib/cn";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  comingSoon?: boolean;
}

// Per the redesign spec's exact sidebar order. "Add Product" is a
// deliberate nav restructure (was only reachable via a button on the
// Products page) - its own route now, still the same ProductFormPage /
// createProduct call underneath.
const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/products", label: "Products", icon: Package },
  { to: "/products/new", label: "Add Product", icon: PackagePlus },
  { to: "/orders", label: "Orders", icon: ShoppingCart },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/analytics", label: "Analytics", icon: BarChart3, comingSoon: true },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/profile", label: "Profile", icon: User },
];

export interface SidebarProps {
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggleCollapsed?: () => void;
}

export function Sidebar({ collapsed = false, onNavigate, onToggleCollapsed }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clear();
    }
  }

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className={cn("flex items-center gap-2.5 px-5 py-6", collapsed && "justify-center px-3")}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">C</span>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-bold tracking-tight text-text-primary">CommerceOS</div>
            <div className="truncate text-xs text-text-secondary">Store Dashboard</div>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const linkEl = item.comingSoon ? (
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-disabled",
                collapsed && "justify-center px-2.5",
              )}
            >
              <Icon size={18} className="shrink-0" aria-hidden="true" />
              {!collapsed && (
                <span className="flex flex-1 items-center justify-between gap-2">
                  {item.label}
                  <span className="rounded-full bg-surface-sunken px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Soon</span>
                </span>
              )}
            </div>
          ) : (
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                  collapsed && "justify-center px-2.5",
                  isActive
                    ? "bg-primary-subtle text-primary"
                    : "text-text-secondary hover:bg-surface-sunken hover:text-text-primary",
                )
              }
            >
              <Icon size={18} className="shrink-0" aria-hidden="true" />
              {!collapsed && item.label}
            </NavLink>
          );

          return collapsed ? (
            <Tooltip key={item.to + item.label} label={item.label}>
              <div>{linkEl}</div>
            </Tooltip>
          ) : (
            <div key={item.to + item.label}>{linkEl}</div>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-border-default px-3 py-3">
        {collapsed ? (
          <Tooltip label="Sign out">
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              className="flex w-full items-center justify-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-status-danger/10 hover:text-status-danger"
            >
              <LogOut size={18} className="shrink-0" aria-hidden="true" />
            </button>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-status-danger/10 hover:text-status-danger"
          >
            <LogOut size={18} className="shrink-0" aria-hidden="true" />
            Logout
          </button>
        )}

        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "hidden w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary lg:flex",
              collapsed && "justify-center px-2.5",
            )}
          >
            {collapsed ? <ChevronsRight size={18} aria-hidden="true" /> : <ChevronsLeft size={18} aria-hidden="true" />}
            {!collapsed && "Collapse"}
          </button>
        )}

        {!collapsed && user && (
          <div className="mt-2 truncate px-3 text-xs text-text-secondary">{user.email}</div>
        )}
      </div>
    </div>
  );
}

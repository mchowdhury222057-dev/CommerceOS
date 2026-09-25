import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Activity, ChevronsLeft, ChevronsRight, LayoutDashboard, ListChecks, LogOut, Palette, Settings, ShieldCheck, Store, User } from "lucide-react";
import { logout } from "../api/auth";
import { getPlatformSettings } from "../api/settings";
import { useAuthStore } from "../stores/auth.store";
import { Tooltip } from "./ui/Tooltip";
import { cn } from "../lib/cn";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

// Platform Settings now has real backend fields (PlatformSettings model),
// so it's back in the nav. Notifications/Users & Roles are still absent -
// no backend exists for either yet (see TopNav.tsx's own note on
// Notifications), and building them is out of this milestone's scope.
// Analytics isn't a separate item either - Platform Revenue/Store Growth
// are integrated into the existing Dashboard page, not a new route.
const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/stores", label: "Store Management", icon: Store },
  { to: "/themes", label: "Themes", icon: Palette },
  { to: "/verifications", label: "Verification Center", icon: ShieldCheck },
  { to: "/audit-logs", label: "System Logs", icon: ListChecks },
  { to: "/system-health", label: "System Health", icon: Activity },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/profile", label: "Profile", icon: User },
];

// Dark navy (#0F172A, bg-admin-sidebar) per SRS Part 22 - visually
// distinguishes the Super Admin Panel from the Store Dashboard's white
// sidebar at a glance (Part A.1.4: "one system, three skins"). Fixed
// across light/dark mode - this is a permanent identity marker for "the
// platform," not something that should change with the admin's personal
// theme preference.
export interface SidebarProps {
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggleCollapsed?: () => void;
}

export function Sidebar({ collapsed = false, onNavigate, onToggleCollapsed }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  // Real usage of PlatformSettings.platformName, not just a stored-but-
  // unread field - staleTime keeps this from refetching on every nav.
  const settingsQuery = useQuery({ queryKey: ["platform-settings"], queryFn: getPlatformSettings, staleTime: 60_000 });
  const platformName = settingsQuery.data?.platformName ?? "CommerceOS";

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clear();
    }
  }

  return (
    <div className="flex h-full flex-col bg-admin-sidebar text-white">
      <div className={cn("flex items-center gap-2.5 px-5 py-6", collapsed && "justify-center px-3")}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">C</span>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-bold tracking-tight">{platformName}</div>
            <div className="truncate text-xs text-white/60">Super Admin Panel</div>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const linkEl = (
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                  collapsed && "justify-center px-2.5",
                  isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
                )
              }
            >
              <Icon size={18} className="shrink-0" aria-hidden="true" />
              {!collapsed && item.label}
            </NavLink>
          );

          return collapsed ? (
            <Tooltip key={item.to} label={item.label}>
              <div>{linkEl}</div>
            </Tooltip>
          ) : (
            <div key={item.to}>{linkEl}</div>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-white/10 px-3 py-3">
        {collapsed ? (
          <Tooltip label="Sign out">
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              className="flex w-full items-center justify-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-status-danger/20 hover:text-white"
            >
              <LogOut size={18} className="shrink-0" aria-hidden="true" />
            </button>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-status-danger/20 hover:text-white"
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
              "hidden w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white lg:flex",
              collapsed && "justify-center px-2.5",
            )}
          >
            {collapsed ? <ChevronsRight size={18} aria-hidden="true" /> : <ChevronsLeft size={18} aria-hidden="true" />}
            {!collapsed && "Collapse"}
          </button>
        )}

        {!collapsed && user && <div className="mt-2 truncate px-3 text-xs text-white/60">{user.email}</div>}
      </div>
    </div>
  );
}

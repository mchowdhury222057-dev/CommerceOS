import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Menu, User as UserIcon } from "lucide-react";
import { logout } from "../api/auth";
import { useAuthStore } from "../stores/auth.store";
import { Avatar } from "./ui/Avatar";
import { Breadcrumb } from "./ui/Breadcrumb";
import type { Crumb } from "./ui/Breadcrumb";
import { DropdownContent, DropdownItem, DropdownLabel, DropdownRoot, DropdownSeparator, DropdownTrigger } from "./ui/Dropdown";
import { ThemeToggle } from "./ThemeToggle";

export interface TopNavProps {
  breadcrumb: Crumb[];
  onOpenMobileMenu: () => void;
}

// Notifications aren't in this nav bar - no notifications backend exists
// anywhere in this codebase yet (checked before building), and a bell
// with a permanently-empty dropdown is worse than no bell at all.
export function TopNav({ breadcrumb, onOpenMobileMenu }: TopNavProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  const today = useMemo(() => new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }), []);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clear();
    }
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

        <Breadcrumb items={breadcrumb} />

        <span className="ml-auto hidden text-sm text-text-secondary md:block">{today}</span>

        <div className="ml-2 flex items-center gap-1.5 border-l border-border-default pl-3">
          <ThemeToggle />

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

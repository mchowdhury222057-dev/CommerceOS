import { NavLink, Outlet } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";
import { logout } from "../api/auth";

// Pages are added here incrementally as each is built this milestone -
// intentionally not a full nav for pages that don't exist yet.
const NAV_ITEMS = [
  { to: "/", label: "Dashboard" },
  { to: "/orders", label: "Orders" },
];

// White sidebar (not the admin panel's dark navy) per SRS Part A.1.4 -
// "one system, three skins" distinguishes the Store Dashboard from the
// Super Admin Panel at a glance.
export function Layout() {
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
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border-default bg-white p-4">
        <div className="text-sm font-semibold tracking-wide">CommerceOS</div>
        <div className="mt-1 text-xs text-text-secondary">Store Dashboard</div>
        <nav className="mt-6 flex-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `mb-1 block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-primary-subtle text-primary" : "text-text-secondary hover:bg-surface-sunken hover:text-text-primary"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border-default pt-4 text-xs text-text-secondary">
          <div className="truncate">{user?.email}</div>
          <button type="button" onClick={handleLogout} className="mt-2 text-text-secondary underline hover:text-text-primary">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}

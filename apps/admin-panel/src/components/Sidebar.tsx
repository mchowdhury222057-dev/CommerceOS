import { NavLink } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";
import { logout } from "../api/auth";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/stores", label: "Store Management" },
  { to: "/audit-logs", label: "Audit Log" },
];

// Dark navy (#0F172A, bg-admin-sidebar) per SRS Part 22 - visually
// distinguishes the Super Admin Panel from the Store Dashboard's white
// sidebar at a glance (Part A.1.4: "one system, three skins").
export function Sidebar() {
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
    <aside className="flex w-60 shrink-0 flex-col bg-admin-sidebar text-white">
      <div className="px-5 py-6">
        <div className="text-sm font-semibold tracking-wide">CommerceOS</div>
        <div className="mt-1 text-xs text-white/60">Super Admin Panel</div>
      </div>
      <nav className="flex-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `mb-1 block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-primary-subtle/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 px-4 py-4 text-xs text-white/60">
        <div className="truncate">{user?.email}</div>
        <button type="button" onClick={handleLogout} className="mt-2 text-white/70 underline hover:text-white">
          Sign out
        </button>
      </div>
    </aside>
  );
}

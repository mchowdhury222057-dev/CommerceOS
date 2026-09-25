import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { Drawer } from "./ui/Drawer";
import type { Crumb } from "./ui/Breadcrumb";

const SIDEBAR_COLLAPSED_KEY = "commerceos-admin-sidebar-collapsed";

const SEGMENT_LABEL: Record<string, string> = {
  dashboard: "Dashboard",
  stores: "Store Management",
  theme: "Theme Editor",
  activity: "Store Activity",
  "audit-logs": "System Logs",
  "system-health": "System Health",
  settings: "Settings",
  profile: "Profile",
};

function breadcrumbFor(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Dashboard" }];

  const crumbs: Crumb[] = [];
  let acc = "";
  segments.forEach((seg, i) => {
    acc += `/${seg}`;
    const isLast = i === segments.length - 1;
    const looksLikeId = /^[a-z0-9]{20,}$/i.test(seg);
    const label = SEGMENT_LABEL[seg] ?? (looksLikeId ? "Details" : seg);
    crumbs.push({ label, to: isLast ? undefined : acc });
  });
  return crumbs;
}

export function AdminLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen">
      <aside
        className="hidden shrink-0 border-r border-white/10 transition-[width] duration-200 ease-in-out lg:block"
        style={{ width: collapsed ? 76 : 240 }}
      >
        <div className="sticky top-0 h-screen">
          <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((c) => !c)} />
        </div>
      </aside>

      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </Drawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <ImpersonationBanner />
        <TopNav breadcrumb={breadcrumbFor(location.pathname)} onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="admin-content-bg flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMyStore } from "../api/store";
import { useAuthStore } from "../stores/auth.store";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { Drawer } from "./ui/Drawer";
import type { Crumb } from "./ui/Breadcrumb";

const SIDEBAR_COLLAPSED_KEY = "commerceos-sidebar-collapsed";

const SEGMENT_LABEL: Record<string, string> = {
  products: "Products",
  new: "Add Product",
  edit: "Edit Product",
  orders: "Orders",
  customers: "Customers",
  analytics: "Analytics",
  settings: "Settings",
  profile: "Profile",
};

function breadcrumbFor(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Dashboard" }];

  const crumbs: Crumb[] = [{ label: "Dashboard", to: "/" }];
  let acc = "";
  segments.forEach((seg, i) => {
    acc += `/${seg}`;
    const isLast = i === segments.length - 1;
    // Dynamic id segments (orderId, productId) - a readable static label
    // beats fetching the entity just to name a breadcrumb crumb.
    const looksLikeId = /^[a-z0-9]{20,}$/i.test(seg);
    const label = SEGMENT_LABEL[seg] ?? (looksLikeId ? "Details" : seg);
    crumbs.push({ label, to: isLast ? undefined : acc });
  });
  return crumbs;
}

// White sidebar (not the admin panel's dark navy) per SRS Part A.1.4 -
// "one system, three skins" distinguishes the Store Dashboard from the
// Super Admin Panel at a glance. In dark mode both apps trend dark, but
// that distinction only ever mattered for the shared default light state.
export function Layout() {
  const location = useLocation();
  const storeId = useAuthStore((s) => s.user?.storeId);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
  const [mobileOpen, setMobileOpen] = useState(false);

  const storeQuery = useQuery({
    queryKey: ["my-store", storeId],
    queryFn: () => getMyStore(storeId as string),
    enabled: Boolean(storeId),
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen">
      <aside
        className="hidden shrink-0 border-r border-border-default transition-[width] duration-200 ease-in-out lg:block"
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
        <ImpersonationBanner store={storeQuery.data?.store} />
        <TopNav storeName={storeQuery.data?.store.name} breadcrumb={breadcrumbFor(location.pathname)} onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="dashboard-content-bg flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet context={storeQuery.data?.store} />
        </main>
      </div>
    </div>
  );
}

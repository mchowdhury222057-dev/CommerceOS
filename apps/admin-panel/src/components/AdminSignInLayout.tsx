import type { ReactNode } from "react";
import { BarChart3, ShieldCheck, ShoppingBag, Store, Users } from "lucide-react";

// Mirrors the pattern already established by the Store Dashboard's
// SignInLayout.tsx: a marketing panel on the left (hidden below xl) and
// the actual sign-in form on the right. Dedicated to the Admin Sign In
// page only - nothing else in the admin panel uses this layout.
//
// The features listed below describe real capabilities of this admin
// panel (store approval/management, user/verification review, audit
// logging, theme management) rather than invented marketing claims. No
// dashboard/laptop mockup graphic is built here, same call SignInLayout.tsx
// already made - it would require fabricated stats with no backing data.
const FEATURES = [
  { icon: Store, title: "Store Management", text: "Approve, manage and monitor all stores." },
  { icon: Users, title: "User Control", text: "Handle customers, store owners and platform users." },
  { icon: BarChart3, title: "Real-time Analytics", text: "Track sales, orders and platform performance." },
  { icon: ShieldCheck, title: "Secure & Reliable", text: "Built with modern security and best practices." },
];

// This page is intentionally always-dark regardless of the admin's
// light/dark theme preference (the existing LoginPage already opted out
// of the theme-aware surface tokens via the fixed admin-sidebar color) -
// so fixed slate/white-alpha values are used throughout rather than the
// theme CSS variables the authenticated dashboard uses.
export function AdminSignInLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 text-white xl:flex">
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/30 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-500 shadow-lg shadow-primary/30">
            <ShoppingBag size={20} aria-hidden="true" />
          </span>
          <div>
            <div className="text-lg font-bold tracking-tight">
              Commerce<span className="bg-gradient-to-r from-primary-hover to-blue-400 bg-clip-text text-transparent">OS</span>
            </div>
            <div className="text-xs text-white/60">Multi-Tenant E-Commerce Platform</div>
          </div>
        </div>

        <div className="relative">
          <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight">
            Manage. Monitor.
            <br />
            <span className="bg-gradient-to-r from-primary-hover to-blue-400 bg-clip-text text-transparent">Grow Together.</span>
          </h1>
          <p className="mb-10 max-w-md text-sm text-white/70">
            Your all-in-one platform to manage stores, oversee operations and scale e-commerce across multiple tenants.
          </p>

          <div className="grid grid-cols-2 gap-5">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/80 to-blue-500/80">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <div>
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="text-xs text-white/60">{text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative" />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

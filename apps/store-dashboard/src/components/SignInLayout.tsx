import type { ReactNode } from "react";
import { Package, ShieldCheck, ShoppingCart } from "lucide-react";

// "Team Collaboration" intentionally removed from this list per the
// redesign brief - three features, not the original four.
const FEATURES = [
  { icon: Package, title: "Product Management", text: "Keep your inventory in control" },
  { icon: ShoppingCart, title: "Order Tracking", text: "From purchase to delivery" },
  { icon: ShieldCheck, title: "Secure & Reliable", text: "Your data, our priority" },
];

// Dedicated to the Sign In page only - AuthLayout.tsx (Signup/Forgot/Reset
// Password) is untouched and keeps its existing look. Same "solid
// gradient, no illustration asset" call AuthLayout.tsx already documents:
// the reference design's laptop photo has no equivalent asset in this
// repo, so a dark gradient + dot-pattern panel stands in for it rather
// than fabricating a placeholder image.
export function SignInLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-primary-hover p-12 text-white xl:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1.5px, transparent 1.5px)", backgroundSize: "28px 28px" }}
          aria-hidden="true"
        />

        <div className="relative flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 text-base font-bold">C</span>
          <div>
            <div className="text-lg font-bold tracking-tight">CommerceOS</div>
            <div className="text-xs text-white/70">Build. Sell. Grow.</div>
          </div>
        </div>

        <div className="relative">
          <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight">
            Everything You Need to Run Your Business <span className="text-blue-300">Efficiently</span>
          </h1>
          <p className="mb-10 max-w-md text-sm text-white/80">Manage your products, orders, customers and team — all in one powerful platform.</p>

          <ul className="space-y-5">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-center gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <div>
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="text-xs text-white/70">{text}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-lg italic text-white/70">Better Commerce. Together.</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-surface-page px-4 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

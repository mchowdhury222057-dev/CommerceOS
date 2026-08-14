import type { ReactNode } from "react";
import { BarChart3, Package, ShieldCheck } from "lucide-react";

const HIGHLIGHTS = [
  { icon: Package, text: "Manage your entire product catalog in one place" },
  { icon: BarChart3, text: "Track sales trends and orders in real time" },
  { icon: ShieldCheck, text: "Built-in customer risk flagging for safer COD" },
];

// Split layout per the redesign spec - solid gradient panel (no glass/blur,
// per this project's design system), not an illustration asset, since
// no such asset exists in this repo and fabricating a fake "brand
// illustration" would be exactly the kind of placeholder content this
// milestone is trying to get away from.
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-gradient-to-br from-primary to-primary-hover p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1.5px, transparent 1.5px)", backgroundSize: "28px 28px" }}
          aria-hidden="true"
        />
        <div className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-sm font-bold">C</span>
          <span className="text-lg font-bold tracking-tight">CommerceOS</span>
        </div>

        <div className="relative">
          <h2 className="mb-4 text-3xl font-bold leading-tight tracking-tight">Run your store from one clean dashboard.</h2>
          <p className="mb-8 text-sm text-white/80">Products, orders, and customers — everything a growing store needs, without the clutter.</p>
          <ul className="space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/90">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Icon size={15} aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} CommerceOS</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-surface-page px-4 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

import { Headphones, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import type { TrustSectionSettings } from "../../lib/api-types";

// Per Section 16 - a fixed 4-icon set assigned by position, not a full
// icon picker (Section 33 rules that out) - the admin edits the text only.
const ICONS = [ShieldCheck, Truck, RotateCcw, Headphones];

export function TrustSection({ settings }: { settings: TrustSectionSettings }) {
  if (settings.items.length === 0) return null;

  return (
    <section className="border-y border-border-default bg-surface-sunken">
      <div className="mx-auto max-w-theme px-4" style={{ paddingBlock: "calc(var(--theme-section-spacing) * 0.7)" }}>
        {settings.title && <h2 className="mb-8 text-center font-heading text-xl font-bold tracking-tight text-text-primary sm:text-2xl">{settings.title}</h2>}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {settings.items.map((item, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <div
                key={i}
                className="flex flex-col items-center gap-3 border border-transparent bg-surface-card p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-border-default hover:shadow-md"
                style={{ borderRadius: "var(--radius-md)" }}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-white shadow-sm" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <span className="text-sm font-medium text-text-primary">{item.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

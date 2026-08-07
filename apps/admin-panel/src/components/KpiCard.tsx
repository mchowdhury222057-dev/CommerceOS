import type { ReactNode } from "react";

export interface KpiCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  caption?: string;
}

// Per SRS Part 18.2 - the Dashboard's top-line KPI row. Matches the existing
// pages' card convention (bg-surface-card / border-border-default / rounded-lg)
// rather than introducing a new card style. Part 22.8's motion tokens
// (120-200ms ease-in-out) applied as a subtle hover lift; the icon sits in
// a soft primary-tinted badge rather than bare, for stronger hierarchy
// against the large bold value below it.
export function KpiCard({ label, value, icon, caption }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-border-default bg-surface-card p-5 transition-shadow duration-150 ease-in-out hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-subtle text-primary" aria-hidden="true">
          {icon}
        </span>
      </div>
      <div className="text-3xl font-bold text-text-primary">{value}</div>
      {caption && <div className="mt-1 text-xs text-text-secondary">{caption}</div>}
    </div>
  );
}

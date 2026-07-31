import type { ReactNode } from "react";

export interface KpiCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  caption?: string;
}

export function KpiCard({ label, value, icon, caption }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-border-default bg-surface-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</span>
        <span className="text-primary" aria-hidden="true">
          {icon}
        </span>
      </div>
      <div className="text-2xl font-semibold text-text-primary">{value}</div>
      {caption && <div className="mt-1 text-xs text-text-secondary">{caption}</div>}
    </div>
  );
}

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "./Skeleton";
import { cn } from "../../lib/cn";

export type StatTone = "primary" | "success" | "caution" | "danger" | "info";

const toneClass: Record<StatTone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-status-success/10 text-status-success",
  caution: "bg-status-caution/10 text-status-caution",
  danger: "bg-status-danger/10 text-status-danger",
  info: "bg-status-info/10 text-status-info",
};

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: StatTone;
  caption?: string;
  loading?: boolean;
  /** True when there's no backend query behind this metric yet - shows a
   * clear "—" instead of a loading spinner or, worse, a faked number. */
  notAvailable?: boolean;
}

export function StatCard({ label, value, icon, tone = "primary", caption, loading = false, notAvailable = false }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15, ease: "easeInOut" }}
      className={cn("rounded-xl border bg-surface-card p-5 shadow-card hover:shadow-card-hover", notAvailable ? "border-dashed border-border-strong" : "border-border-default")}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</span>
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", toneClass[tone])} aria-hidden="true">
          {icon}
        </span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-20" />
      ) : notAvailable ? (
        <div className="text-3xl font-bold tracking-tight text-text-disabled">—</div>
      ) : (
        <div className="text-3xl font-bold tracking-tight text-text-primary">{value}</div>
      )}
      {caption && !loading && <div className="mt-1 text-xs text-text-secondary">{caption}</div>}
    </motion.div>
  );
}

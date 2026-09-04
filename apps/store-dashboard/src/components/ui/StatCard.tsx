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
}

export function StatCard({ label, value, icon, tone = "primary", caption, loading = false }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15, ease: "easeInOut" }}
      className="rounded-xl border border-border-default bg-surface-card p-5 shadow-card hover:shadow-card-hover"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</span>
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", toneClass[tone])} aria-hidden="true">
          {icon}
        </span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <div className="text-3xl font-bold tracking-tight text-text-primary">{value}</div>
      )}
      {caption && !loading && <div className="mt-1 text-xs text-text-secondary">{caption}</div>}
    </motion.div>
  );
}

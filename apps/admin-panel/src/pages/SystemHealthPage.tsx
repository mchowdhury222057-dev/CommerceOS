import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, RefreshCw, Server, ShieldCheck } from "lucide-react";
import { getSystemHealth } from "../api/system-health";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { Badge } from "../components/ui/Badge";
import type { BadgeTone } from "../components/ui/Badge";
import type { ServiceStatus } from "../lib/api-types";

const STATUS_TONE: Record<ServiceStatus, BadgeTone> = {
  operational: "success",
  warning: "caution",
  error: "danger",
};

const STATUS_LABEL: Record<ServiceStatus, string> = {
  operational: "Operational",
  warning: "Warning",
  error: "Error / Unavailable",
};

const STATUS_DOT: Record<ServiceStatus, string> = {
  operational: "bg-status-success",
  warning: "bg-status-caution",
  error: "bg-status-danger",
};

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25, delay, ease: "easeOut" as const },
  };
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Admin Panel "System Health" milestone - a lightweight status page (per
// this milestone's own instruction, deliberately not a full DevOps
// monitoring system). Every value here is real: see system-health.service.ts
// for exactly what each check probes and why (API Server/Authentication are
// trivially true by virtue of this request succeeding at all; Database and
// System Logs run real queries; Storefront's status is derived from
// Database's, since it has no independent backend process to probe).
export default function SystemHealthPage() {
  const healthQuery = useQuery({
    queryKey: ["system-health"],
    queryFn: getSystemHealth,
    refetchInterval: 30_000,
  });

  const health = healthQuery.data;

  return (
    <div>
      <motion.div {...fadeUp(0)}>
        <SectionHeader
          title="System Health"
          description="Live status of CommerceOS's core services."
          actions={
            <button
              type="button"
              onClick={() => healthQuery.refetch()}
              disabled={healthQuery.isFetching}
              className="flex items-center gap-1.5 rounded-lg border border-border-default bg-surface-card px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-sunken disabled:opacity-50"
            >
              <RefreshCw size={14} className={healthQuery.isFetching ? "animate-spin" : ""} aria-hidden="true" />
              Refresh
            </button>
          }
        />
      </motion.div>

      {healthQuery.isError && (
        <p role="alert" className="mb-4 rounded-lg bg-status-danger/10 px-3.5 py-2.5 text-sm text-status-danger">
          Could not reach the health check endpoint. The API itself may be down.
        </p>
      )}

      {healthQuery.isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {health && (
        <>
          <motion.div {...fadeUp(0.05)} className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {health.services.map((service) => (
              <div key={service.name} className="rounded-xl border border-border-default bg-surface-card p-5 shadow-card">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-primary">{service.name}</span>
                  <Badge tone={STATUS_TONE[service.status]} size="sm">
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[service.status]}`} aria-hidden="true" />
                    {STATUS_LABEL[service.status]}
                  </Badge>
                </div>
                {service.detail && <p className="text-xs text-text-secondary">{service.detail}</p>}
              </div>
            ))}
          </motion.div>

          <motion.div {...fadeUp(0.1)} className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl border border-border-default bg-surface-card p-5 shadow-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
                <Server size={16} />
              </span>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Uptime</div>
                <div className="text-sm font-semibold text-text-primary">{formatUptime(health.uptimeSeconds)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border-default bg-surface-card p-5 shadow-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
                <ShieldCheck size={16} />
              </span>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Environment</div>
                <div className="text-sm font-semibold capitalize text-text-primary">{health.environment}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border-default bg-surface-card p-5 shadow-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
                <Clock size={16} />
              </span>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Last Checked</div>
                <div className="text-sm font-semibold text-text-primary">{new Date(health.checkedAt).toLocaleTimeString()}</div>
              </div>
            </div>
          </motion.div>

          <motion.div {...fadeUp(0.15)}>
            <Card>
              <CardHeader>
                <CardTitle>Recent System Errors</CardTitle>
                {health.failedEventCount > 0 && (
                  <Badge tone="danger" size="sm">
                    {health.failedEventCount} unresolved
                  </Badge>
                )}
              </CardHeader>
              <CardBody className="p-0">
                {health.recentErrors.length === 0 && (
                  <EmptyState icon={<ShieldCheck size={20} aria-hidden="true" />} title="No unresolved errors" description="Background event failures will appear here." />
                )}
                <ul className="divide-y divide-border-default">
                  {health.recentErrors.map((err) => (
                    <li key={err.id} className="flex items-start gap-3 px-5 py-3">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-status-danger" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-text-primary">{err.eventName}</div>
                        <div className="truncate text-xs text-text-secondary">{err.errorMessage}</div>
                      </div>
                      <div className="shrink-0 text-right text-xs text-text-secondary">
                        <div>{err.attemptCount} attempt{err.attemptCount === 1 ? "" : "s"}</div>
                        <div>{new Date(err.lastAttemptAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}

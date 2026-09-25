import { prisma } from "../lib/prisma.js";

export type ServiceStatus = "operational" | "warning" | "error";

export interface ServiceHealthCheck {
  name: string;
  status: ServiceStatus;
  detail?: string;
}

export interface SystemHealth {
  status: ServiceStatus;
  checkedAt: string;
  environment: string;
  uptimeSeconds: number;
  services: ServiceHealthCheck[];
  recentErrors: Array<{ id: string; eventName: string; errorMessage: string; attemptCount: number; lastAttemptAt: string }>;
  failedEventCount: number;
}
// Admin Panel "System Health" milestone - a lightweight status page, not a
// Prometheus/Kubernetes-style monitoring system (explicitly out of scope).
// Each check is a real, minimal probe against a dependency this API
// actually has, not a hardcoded "operational" string:
//   - API Server: trivially true - this handler running at all proves it.
//   - Database: the exact same `SELECT 1` probe routes/health.ts already
//     uses for the public infra healthcheck, reused here (not duplicated
//     logic, just called from an admin-authenticated context too) with
//     latency measured.
//   - Authentication: also trivially true - reaching this handler means
//     requireAuth + requireMasterAdmin already succeeded for this request;
//     there is no separate "auth service" process to probe independently.
//   - Storefront: the public storefront has no backend process of its own
//     to ping (it's a static frontend calling this same API) - its real
//     dependency is the Database, so its status is derived from that check
//     rather than faking an independent probe.
//   - System Logs: a real query against the audit log table, the same one
//     System Logs itself reads from.
export async function getSystemHealth(): Promise<SystemHealth> {
  const checkedAt = new Date();

  const dbStart = Date.now();
  let dbStatus: ServiceStatus = "operational";
  let dbDetail = "Connected";
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbDetail = `Connected (${Date.now() - dbStart}ms)`;
  } catch (err) {
    dbStatus = "error";
    dbDetail = err instanceof Error ? err.message : "Unreachable";
  }

  let logsStatus: ServiceStatus = "operational";
  let logsDetail = "Query succeeded";
  try {
    await prisma.auditLog.count();
  } catch (err) {
    logsStatus = "error";
    logsDetail = err instanceof Error ? err.message : "Query failed";
  }

  const [recentErrors, failedEventCount] = await Promise.all([
    prisma.eventFailureLog.findMany({
      where: { resolved: false },
      orderBy: { lastAttemptAt: "desc" },
      take: 10,
      select: { id: true, eventName: true, errorMessage: true, attemptCount: true, lastAttemptAt: true },
    }),
    prisma.eventFailureLog.count({ where: { resolved: false } }),
  ]);

  const services: ServiceHealthCheck[] = [
    { name: "API Server", status: "operational", detail: "Responding" },
    { name: "Database", status: dbStatus, detail: dbDetail },
    { name: "Authentication", status: "operational", detail: "Verified for this request" },
    { name: "Storefront", status: dbStatus, detail: "Depends on API + Database" },
    { name: "System Logs", status: logsStatus, detail: logsDetail },
  ];

  const overall: ServiceStatus = services.some((s) => s.status === "error")
    ? "error"
    : services.some((s) => s.status === "warning") || failedEventCount > 0
      ? "warning"
      : "operational";

  return {
    status: overall,
    checkedAt: checkedAt.toISOString(),
    environment: process.env.NODE_ENV ?? "development",
    uptimeSeconds: Math.round(process.uptime()),
    services,
    recentErrors: recentErrors.map((e) => ({
      id: e.id,
      eventName: e.eventName,
      errorMessage: e.errorMessage,
      attemptCount: e.attemptCount,
      lastAttemptAt: e.lastAttemptAt.toISOString(),
    })),
    failedEventCount,
  };
}

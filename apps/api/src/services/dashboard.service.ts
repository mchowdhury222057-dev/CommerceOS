import type { StoreStatus } from "@commerceos/prisma/generated/client";
import { prisma } from "../lib/prisma.js";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface DashboardSummary {
  storesByStatus: Record<StoreStatus, number>;
  totalStores: number;
  totalPlatformOrders: number;
  totalStoreOwners: number;
  recentImpersonationSessionCount: number;
}

// Per SRS Part 18.2 - the Master Admin's landing page, read-only aggregates
// only. Deliberately not cached/materialized (unlike Part L's later
// analytics-snapshot phase, see AnalyticsSnapshotUpdated in events.ts) since
// these are cheap counts/group-bys, not full report queries.
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

  const [storeStatusGroups, totalPlatformOrders, totalStoreOwners, recentImpersonationSessionCount] =
    await Promise.all([
      prisma.store.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.order.count(),
      prisma.user.count({ where: { role: "STORE_OWNER" } }),
      prisma.impersonationSession.count({ where: { startedAt: { gte: sevenDaysAgo } } }),
    ]);

  const storesByStatus: Record<StoreStatus, number> = {
    PENDING_SETUP: 0,
    ACTIVE: 0,
    SUSPENDED: 0,
    ARCHIVED: 0,
  };
  let totalStores = 0;
  for (const group of storeStatusGroups) {
    storesByStatus[group.status] = group._count._all;
    totalStores += group._count._all;
  }

  return { storesByStatus, totalStores, totalPlatformOrders, totalStoreOwners, recentImpersonationSessionCount };
}

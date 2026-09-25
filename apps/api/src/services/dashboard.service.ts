import { Prisma } from "@commerceos/prisma/generated/client";
import type { StoreStatus } from "@commerceos/prisma/generated/client";
import { prisma } from "../lib/prisma.js";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// Local calendar date, matching the same reasoning store-dashboard.service.ts's
// dateKey already documents (Asia/Dhaka target market - a UTC-based key would
// disagree with startOfDay's local midnight).
function dateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface DashboardSummary {
  storesByStatus: Record<StoreStatus, number>;
  totalStores: number;
  totalPlatformOrders: number;
  totalStoreOwners: number;
  recentImpersonationSessionCount: number;
}

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
    PENDING: 0,
    APPROVED: 0,
    SUSPENDED: 0,
    REJECTED: 0,
    ARCHIVED: 0,
  };
  let totalStores = 0;
  for (const group of storeStatusGroups) {
    storesByStatus[group.status] = group._count._all;
    totalStores += group._count._all;
  }

  return { storesByStatus, totalStores, totalPlatformOrders, totalStoreOwners, recentImpersonationSessionCount };
}

export const REVENUE_RANGE_DAYS = [7, 30, 90, 365] as const;
export type RevenueRangeDays = (typeof REVENUE_RANGE_DAYS)[number];

export interface PlatformRevenue {
  rangeDays: RevenueRangeDays;
  totalRevenue: string;
  revenueToday: string;
  revenueThisMonth: string;
  revenueThisYear: string;
  revenueTrend: Array<{ date: string; revenue: string }>;
  revenueByStore: Array<{ storeId: string; storeName: string; orders: number; revenue: string }>;
}

export async function getPlatformRevenue(rangeDays: RevenueRangeDays): Promise<PlatformRevenue> {
  const now = new Date();
  const today = startOfDay(now);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const rangeStart = new Date(today);
  rangeStart.setDate(rangeStart.getDate() - (rangeDays - 1));

  const [allPaidOrders, storeGroups, stores] = await Promise.all([
    prisma.order.findMany({
      where: { isPaid: true },
      select: { total: true, createdAt: true, storeId: true },
    }),
    prisma.order.groupBy({
      by: ["storeId"],
      where: { isPaid: true },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.store.findMany({ select: { id: true, name: true } }),
  ]);

  const sum = (orders: Array<{ total: Prisma.Decimal }>) => orders.reduce((s, o) => s.add(o.total), new Prisma.Decimal(0));

  const totalRevenue = sum(allPaidOrders);
  const revenueToday = sum(allPaidOrders.filter((o) => o.createdAt >= today));
  const revenueThisMonth = sum(allPaidOrders.filter((o) => o.createdAt >= startOfMonth));
  const revenueThisYear = sum(allPaidOrders.filter((o) => o.createdAt >= startOfYear));

  const trendBuckets = new Map<string, Prisma.Decimal>();
  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    trendBuckets.set(dateKey(d), new Prisma.Decimal(0));
  }
  for (const order of allPaidOrders) {
    if (order.createdAt < rangeStart) continue;
    const key = dateKey(order.createdAt);
    if (trendBuckets.has(key)) trendBuckets.set(key, trendBuckets.get(key)!.add(order.total));
  }
  const revenueTrend = Array.from(trendBuckets.entries()).map(([date, revenue]) => ({ date, revenue: revenue.toString() }));

  const storeNameById = new Map(stores.map((s) => [s.id, s.name]));
  const revenueByStore = storeGroups
    .map((g) => ({
      storeId: g.storeId,
      storeName: storeNameById.get(g.storeId) ?? "Unknown store",
      orders: g._count._all,
      revenue: (g._sum.total ?? new Prisma.Decimal(0)).toString(),
    }))
    .sort((a, b) => Number(b.revenue) - Number(a.revenue));

  return {
    rangeDays,
    totalRevenue: totalRevenue.toString(),
    revenueToday: revenueToday.toString(),
    revenueThisMonth: revenueThisMonth.toString(),
    revenueThisYear: revenueThisYear.toString(),
    revenueTrend,
    revenueByStore,
  };
}

export interface StoreGrowth {
  totalStores: number;
  newStoresThisWeek: number;
  newStoresThisMonth: number;
  newStoresThisYear: number;
  growthTrend: Array<{ month: string; totalStores: number }>;
}

// Store Growth - "total stores" here matches getDashboardSummary's own
// totalStores (every status, since growth tracks signups joining the
// platform, not just currently-approved stores); Dashboard's own "Active
// Stores" card already covers the APPROVED-only view.
export async function getStoreGrowth(): Promise<StoreGrowth> {
  const now = new Date();
  const today = startOfDay(now);
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  const stores = await prisma.store.findMany({ select: { createdAt: true } });

  const totalStores = stores.length;
  const newStoresThisWeek = stores.filter((s) => s.createdAt >= startOfWeek).length;
  const newStoresThisMonth = stores.filter((s) => s.createdAt >= startOfMonth).length;
  const newStoresThisYear = stores.filter((s) => s.createdAt >= startOfYear).length;

  const months: Array<{ key: string; label: string; monthEnd: Date }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString(undefined, { month: "short" }), monthEnd });
  }
  const growthTrend = months.map(({ label, monthEnd }) => ({
    month: label,
    totalStores: stores.filter((s) => s.createdAt <= monthEnd).length,
  }));

  return { totalStores, newStoresThisWeek, newStoresThisMonth, newStoresThisYear, growthTrend };
}

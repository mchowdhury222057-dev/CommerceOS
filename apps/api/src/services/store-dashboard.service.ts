import { Prisma } from "@commerceos/prisma/generated/client";
import { prisma } from "../lib/prisma.js";

const TREND_DAYS = 14;

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// Local calendar date (not d.toISOString().slice(0, 10)) - the server runs
// in Asia/Dhaka (UTC+6, this platform's target market per SRS Part 2.3),
// so a UTC-based key would silently disagree with startOfDay's local
// midnight: local-midnight-to-6am orders would fall on the "wrong" UTC
// date and land in a bucket the trend range never pre-created, appearing
// as an extra out-of-range day instead of "today". Matching both
// startOfDay and this function to local time keeps every order's bucket
// key consistent with the range boundary that was generated for it.
function dateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface StoreDashboardSummary {
  ordersToday: number;
  revenueThisMonth: string;
  pendingCodConfirmations: number;
  lowStockProductCount: number;
  salesTrend: Array<{ date: string; orderCount: number }>;
  recentOrders: Array<{
    id: string;
    status: string;
    total: string;
    createdAt: string;
    customer: { id: string; name: string; phone: string; riskLevel: string };
  }>;
}

// Per SRS Part 18.1 - the Store Owner's landing page. Deliberately simple,
// direct Prisma aggregates (this store's data volume never justifies a
// materialized snapshot); revenue is bucketed by order placement date
// (createdAt), matching the "orders today" bucketing, rather than by
// delivery/payment date, which would need a courier-collection timestamp
// this schema doesn't track separately from Order.updatedAt.
export async function getStoreDashboardSummary(storeId: string): Promise<StoreDashboardSummary> {
  const today = startOfDay(new Date());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const trendStart = new Date(today);
  trendStart.setDate(trendStart.getDate() - (TREND_DAYS - 1));

  const [ordersToday, paidOrdersThisMonth, pendingCodConfirmations, activeProducts, trendOrders, recentOrders] =
    await Promise.all([
      prisma.order.count({ where: { storeId, createdAt: { gte: today } } }),
      prisma.order.findMany({
        where: { storeId, isPaid: true, createdAt: { gte: startOfMonth } },
        select: { total: true },
      }),
      prisma.order.count({ where: { storeId, status: "PENDING", codConfirmedByCall: false } }),
      prisma.product.findMany({
        where: { storeId, status: "ACTIVE" },
        select: { lowStockThreshold: true, variants: { select: { stock: true } } },
      }),
      prisma.order.findMany({
        where: { storeId, createdAt: { gte: trendStart } },
        select: { createdAt: true },
      }),
      prisma.order.findMany({
        where: { storeId },
        include: { customer: { select: { id: true, name: true, phone: true, riskLevel: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

  const revenueThisMonth = paidOrdersThisMonth
    .reduce((sum, o) => sum.add(o.total), new Prisma.Decimal(0))
    .toString();

  const lowStockProductCount = activeProducts.filter((p) => p.variants.some((v) => v.stock <= p.lowStockThreshold)).length;

  const trendBuckets = new Map<string, number>();
  for (let i = 0; i < TREND_DAYS; i++) {
    const d = new Date(trendStart);
    d.setDate(d.getDate() + i);
    trendBuckets.set(dateKey(d), 0);
  }
  for (const order of trendOrders) {
    const key = dateKey(order.createdAt);
    trendBuckets.set(key, (trendBuckets.get(key) ?? 0) + 1);
  }
  const salesTrend = Array.from(trendBuckets.entries()).map(([date, orderCount]) => ({ date, orderCount }));

  return {
    ordersToday,
    revenueThisMonth,
    pendingCodConfirmations,
    lowStockProductCount,
    salesTrend,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      status: o.status,
      total: o.total.toString(),
      createdAt: o.createdAt.toISOString(),
      customer: o.customer,
    })),
  };
}

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

export const ANALYTICS_RANGE_DAYS = [7, 30, 90] as const;
export type AnalyticsRangeDays = (typeof ANALYTICS_RANGE_DAYS)[number];

export interface StoreAnalytics {
  rangeDays: AnalyticsRangeDays;
  totalRevenue: string;
  totalOrders: number;
  averageOrderValue: string;
  newCustomers: number;
  revenueTrend: Array<{ date: string; revenue: string }>;
  ordersByStatus: Array<{ status: string; count: number }>;
  topProducts: Array<{ productId: string; name: string; unitsSold: number; revenue: string }>;
}

// Deeper Store Owner analytics beyond the Dashboard's own 14-day
// order-count trend (Part 18.1) - real revenue/product/status aggregates
// over a selectable window, all direct Prisma queries scoped to this
// store like every other aggregate in this file (no new materialized
// snapshot; data volume doesn't justify one, same reasoning as
// getStoreDashboardSummary above). isPaid is used for revenue the same
// way revenueThisMonth already does, so the two pages never disagree on
// what counts as "revenue".
export async function getStoreAnalytics(storeId: string, rangeDays: AnalyticsRangeDays): Promise<StoreAnalytics> {
  const today = startOfDay(new Date());
  const rangeStart = new Date(today);
  rangeStart.setDate(rangeStart.getDate() - (rangeDays - 1));

  const [orders, orderItems, newCustomers] = await Promise.all([
    prisma.order.findMany({
      where: { storeId, createdAt: { gte: rangeStart } },
      select: { status: true, total: true, isPaid: true, createdAt: true },
    }),
    // isPaid: true here too - otherwise a product's "revenue" in the Top
    // Products list could exceed the page's own Total Revenue KPI (caught
    // in testing: an unpaid/undelivered order's items were inflating a
    // product's ranking with revenue that was never actually realized).
    prisma.orderItem.findMany({
      where: { order: { storeId, createdAt: { gte: rangeStart }, isPaid: true } },
      select: { quantity: true, unitPrice: true, product: { select: { id: true, name: true } } },
    }),
    prisma.customer.count({ where: { storeId, createdAt: { gte: rangeStart } } }),
  ]);

  const paidOrders = orders.filter((o) => o.isPaid);
  const totalRevenue = paidOrders.reduce((sum, o) => sum.add(o.total), new Prisma.Decimal(0));
  const totalOrders = orders.length;
  const averageOrderValue = totalOrders === 0 ? new Prisma.Decimal(0) : totalRevenue.div(totalOrders);

  const revenueBuckets = new Map<string, Prisma.Decimal>();
  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    revenueBuckets.set(dateKey(d), new Prisma.Decimal(0));
  }
  for (const order of paidOrders) {
    const key = dateKey(order.createdAt);
    revenueBuckets.set(key, (revenueBuckets.get(key) ?? new Prisma.Decimal(0)).add(order.total));
  }
  const revenueTrend = Array.from(revenueBuckets.entries()).map(([date, revenue]) => ({ date, revenue: revenue.toString() }));

  const statusCounts = new Map<string, number>();
  for (const order of orders) {
    statusCounts.set(order.status, (statusCounts.get(order.status) ?? 0) + 1);
  }
  const ordersByStatus = Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count }));

  const productTotals = new Map<string, { productId: string; name: string; unitsSold: number; revenue: Prisma.Decimal }>();
  for (const item of orderItems) {
    const existing = productTotals.get(item.product.id);
    const lineRevenue = item.unitPrice.mul(item.quantity);
    if (existing) {
      existing.unitsSold += item.quantity;
      existing.revenue = existing.revenue.add(lineRevenue);
    } else {
      productTotals.set(item.product.id, { productId: item.product.id, name: item.product.name, unitsSold: item.quantity, revenue: lineRevenue });
    }
  }
  const topProducts = Array.from(productTotals.values())
    .sort((a, b) => Number(b.revenue) - Number(a.revenue))
    .slice(0, 5)
    .map((p) => ({ productId: p.productId, name: p.name, unitsSold: p.unitsSold, revenue: p.revenue.toString() }));

  return {
    rangeDays,
    totalRevenue: totalRevenue.toString(),
    totalOrders,
    averageOrderValue: averageOrderValue.toString(),
    newCustomers,
    revenueTrend,
    ordersByStatus,
    topProducts,
  };
}

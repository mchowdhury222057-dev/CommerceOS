import type { Prisma, RiskLevel } from "@commerceos/prisma/generated/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";

export interface CustomerListFilters {
  riskLevel?: RiskLevel[];
  search?: string;
  page?: number;
  pageSize?: number;
}

// Per Part B.2.3 - riskLevel is never directly editable from any page; it is
// a computed field (Part 10.2) recalculated only by order-status transitions
// in order.service.ts. This service is read-only with respect to risk.
export async function listCustomers(storeId: string, filters: CustomerListFilters = {}) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 25;

  const where: Prisma.CustomerWhereInput = {
    storeId,
    riskLevel: filters.riskLevel?.length ? { in: filters.riskLevel } : undefined,
    OR: filters.search
      ? [
          { name: { contains: filters.search, mode: "insensitive" } },
          { phone: { contains: filters.search } },
        ]
      : undefined,
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.customer.count({ where }),
  ]);

  return { customers, total, page, pageSize };
}

export async function getCustomer(storeId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, storeId },
    include: {
      addresses: true,
      orders: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!customer) throw AppError.notFound(`Customer ${customerId} not found`);
  return customer;
}

// Per Part B.2.3's summary strip - the risk-level distribution for the
// store's full customer base, feeding both this page and the Analytics
// dashboard (Part 18.1) from the same computed field.
export async function getRiskLevelDistribution(storeId: string) {
  const grouped = await prisma.customer.groupBy({
    by: ["riskLevel"],
    where: { storeId },
    _count: { _all: true },
  });
  const distribution: Record<RiskLevel, number> = { NONE: 0, CAUTION: 0, HIGH_RISK: 0 };
  for (const row of grouped) {
    distribution[row.riskLevel] = row._count._all;
  }
  return distribution;
}

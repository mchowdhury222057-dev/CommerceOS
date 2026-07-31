import { Router } from "express";
import type { RiskLevel } from "@commerceos/prisma/generated/client";
import { requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { getCustomer, getRiskLevelDistribution, listCustomers } from "../services/customer.service.js";

// Per SRS Part 21 - /api/store/:storeId/customers group. riskLevel is always
// read-only here (Part B.2.3) - recalculated only by order.service.ts.
export const customersRouter = Router({ mergeParams: true });

const VIEW_ROLES = ["STORE_OWNER", "STORE_MANAGER", "ORDER_MANAGER", "CUSTOMER_SUPPORT"] as const;

customersRouter.get(
  "/risk-summary",
  requireRole(...VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const distribution = await getRiskLevelDistribution(req.params.storeId);
    res.json({ distribution });
  }),
);

customersRouter.get(
  "/",
  requireRole(...VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const riskLevel = typeof req.query.riskLevel === "string" ? (req.query.riskLevel.split(",") as RiskLevel[]) : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
    const result = await listCustomers(req.params.storeId, { riskLevel, search, page, pageSize });
    res.json(result);
  }),
);

customersRouter.get(
  "/:customerId",
  requireRole(...VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const customer = await getCustomer(req.params.storeId, req.params.customerId);
    res.json({ customer });
  }),
);

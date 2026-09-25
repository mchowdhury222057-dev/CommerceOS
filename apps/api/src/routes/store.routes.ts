import { Router } from "express";
import { requireApprovedStore, requireAuth, requireStoreAccess } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { getStoreById } from "../services/store.service.js";
import { ANALYTICS_RANGE_DAYS, getStoreAnalytics, getStoreDashboardSummary } from "../services/store-dashboard.service.js";
import type { AnalyticsRangeDays } from "../services/store-dashboard.service.js";
import { AppError } from "../lib/errors.js";
import { customersRouter } from "./customers.routes.js";
import { ordersRouter } from "./orders.routes.js";
import { productsRouter } from "./products.routes.js";
import { staffRouter } from "./staff.routes.js";

// Per SRS Part 21 - /api/store/:storeId/* endpoint group aggregator. Every
// sub-router mounted here inherits requireAuth + requireStoreAccess. The
// bare GET /:storeId endpoint deliberately does NOT also require
// requireApprovedStore - it's the one endpoint a PENDING/REJECTED/
// SUSPENDED owner's StoreAccessGate must still be able to call to know
// which status screen to show; everything else (dashboard, orders,
// products, customers, staff) is gated on APPROVED per Section 24.
export const storeRouter = Router({ mergeParams: true });

// Mounted at "/:storeId" (not a bare `.use(mw)`) so Express resolves the
// :storeId param before requireStoreAccess runs - see the correctness note
// on requireStoreAccess in middleware/auth.ts.
storeRouter.use("/:storeId", requireAuth, requireStoreAccess);

// Per Part 6.2 - lets the Store Dashboard read its own store's status (e.g.
// to show a "pending approval" screen) right after login.
storeRouter.get(
  "/:storeId",
  asyncHandler(async (req, res) => {
    const store = await getStoreById(req.params.storeId);
    res.json({ store });
  }),
);

// Per Part 18.1 - the Store Owner's landing page KPI aggregates.
storeRouter.get(
  "/:storeId/dashboard",
  requireApprovedStore,
  asyncHandler(async (req, res) => {
    const summary = await getStoreDashboardSummary(req.params.storeId);
    res.json(summary);
  }),
);

// Deeper analytics beyond the dashboard's own KPI cards - real
// revenue/product/status aggregates over a selectable range.
storeRouter.get(
  "/:storeId/analytics",
  requireApprovedStore,
  asyncHandler(async (req, res) => {
    const rangeParam = Number(req.query.range ?? 30);
    if (!ANALYTICS_RANGE_DAYS.includes(rangeParam as AnalyticsRangeDays)) {
      throw AppError.validation(`range must be one of ${ANALYTICS_RANGE_DAYS.join(", ")}`);
    }
    const analytics = await getStoreAnalytics(req.params.storeId, rangeParam as AnalyticsRangeDays);
    res.json(analytics);
  }),
);

storeRouter.use("/:storeId/orders", requireApprovedStore, ordersRouter);
storeRouter.use("/:storeId/products", requireApprovedStore, productsRouter);
storeRouter.use("/:storeId/customers", requireApprovedStore, customersRouter);
storeRouter.use("/:storeId/staff", requireApprovedStore, staffRouter);

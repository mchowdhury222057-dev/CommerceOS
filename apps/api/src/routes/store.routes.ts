import { Router } from "express";
import { requireAuth, requireStoreAccess } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { getStoreById } from "../services/store.service.js";
import { getStoreDashboardSummary } from "../services/store-dashboard.service.js";
import { customersRouter } from "./customers.routes.js";
import { ordersRouter } from "./orders.routes.js";
import { productsRouter } from "./products.routes.js";
import { staffRouter } from "./staff.routes.js";

// Per SRS Part 21 - /api/store/:storeId/* endpoint group aggregator. Every
// sub-router mounted here inherits requireAuth + requireStoreAccess.
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
  asyncHandler(async (req, res) => {
    const summary = await getStoreDashboardSummary(req.params.storeId);
    res.json(summary);
  }),
);

storeRouter.use("/:storeId/orders", ordersRouter);
storeRouter.use("/:storeId/products", productsRouter);
storeRouter.use("/:storeId/customers", customersRouter);
storeRouter.use("/:storeId/staff", staffRouter);

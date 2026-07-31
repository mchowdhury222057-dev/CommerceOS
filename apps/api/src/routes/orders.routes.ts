import { Router } from "express";
import type { OrderStatus } from "@commerceos/prisma/generated/client";
import {
  confirmCodSchema,
  updateCourierSchema,
  updateOrderStatusSchema,
  type ConfirmCodInput,
  type UpdateCourierInput,
  type UpdateOrderStatusInput,
} from "@commerceos/types";
import { getAuthUser, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { validateBody } from "../middleware/validate.js";
import { getOrder, listOrders, logCodConfirmationCall, updateCourierTracking, updateOrderStatus } from "../services/order.service.js";

// Per SRS Part 21 - /api/store/:storeId/orders group. Mounted under
// store.routes.ts, which has already run requireAuth + requireStoreAccess.
export const ordersRouter = Router({ mergeParams: true });

// Per Part 4.1's role matrix: Order Manager is defined by this capability;
// Customer Support has view-only access; Inventory Manager has none at all
// (enforced by simply never granting it a route in this router).
const VIEW_ROLES = ["STORE_OWNER", "STORE_MANAGER", "ORDER_MANAGER", "CUSTOMER_SUPPORT"] as const;
const MANAGE_ROLES = ["STORE_OWNER", "STORE_MANAGER", "ORDER_MANAGER"] as const;

ordersRouter.get(
  "/",
  requireRole(...VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? (req.query.status.split(",") as OrderStatus[]) : undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
    const result = await listOrders(req.params.storeId, { status, page, pageSize });
    res.json(result);
  }),
);

ordersRouter.get(
  "/:orderId",
  requireRole(...VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const order = await getOrder(req.params.storeId, req.params.orderId);
    res.json({ order });
  }),
);

ordersRouter.patch(
  "/:orderId/status",
  requireRole(...MANAGE_ROLES),
  validateBody(updateOrderStatusSchema),
  asyncHandler(async (req, res) => {
    const { status, note, codConfirmOverrideReason } = req.body as UpdateOrderStatusInput;
    const order = await updateOrderStatus({
      storeId: req.params.storeId,
      orderId: req.params.orderId,
      targetStatus: status as OrderStatus,
      actorId: getAuthUser(req).id,
      note,
      codConfirmOverrideReason,
    });
    res.json({ order });
  }),
);

ordersRouter.patch(
  "/:orderId/courier",
  requireRole(...MANAGE_ROLES),
  validateBody(updateCourierSchema),
  asyncHandler(async (req, res) => {
    const { courierName, courierTrackingId } = req.body as UpdateCourierInput;
    const order = await updateCourierTracking({
      storeId: req.params.storeId,
      orderId: req.params.orderId,
      courierName,
      courierTrackingId,
      actorId: getAuthUser(req).id,
    });
    res.json({ order });
  }),
);

ordersRouter.patch(
  "/:orderId/confirm-cod",
  requireRole(...MANAGE_ROLES),
  validateBody(confirmCodSchema),
  asyncHandler(async (req, res) => {
    const { outcome, note } = req.body as ConfirmCodInput;
    const order = await logCodConfirmationCall({
      storeId: req.params.storeId,
      orderId: req.params.orderId,
      outcome,
      note,
      actorId: getAuthUser(req).id,
    });
    res.json({ order });
  }),
);

import { Router } from "express";
import { createStoreSchema, storeStatusSchema, type StoreStatusInput } from "@commerceos/types";
import { prisma } from "../lib/prisma.js";
import { getAuthUser, requireAuth, requireMasterAdmin } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { validateBody } from "../middleware/validate.js";
import { activateStore, createStore, listStores, suspendStore } from "../services/store.service.js";
import { getDashboardSummary } from "../services/dashboard.service.js";
import { impersonationRouter } from "./impersonation.routes.js";
import { themeRouter } from "./theme.routes.js";
import type { StoreStatus } from "@commerceos/prisma/generated/client";

// Per SRS Part 21 - /api/admin/* endpoint group. Master Administrator only.
export const adminRouter = Router();

adminRouter.use(requireAuth, requireMasterAdmin);

// Per Part 18.2 - the landing page's KPI aggregates.
adminRouter.get(
  "/dashboard",
  asyncHandler(async (_req, res) => {
    const summary = await getDashboardSummary();
    res.json(summary);
  }),
);

adminRouter.get(
  "/stores",
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? (req.query.status.split(",") as StoreStatus[]) : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
    const result = await listStores({ status, search, page, pageSize });
    res.json(result);
  }),
);

adminRouter.post(
  "/stores",
  validateBody(createStoreSchema),
  asyncHandler(async (req, res) => {
    const { name, slug, ownerEmail, ownerName } = req.body as {
      name: string;
      slug: string;
      ownerEmail: string;
      ownerName: string;
    };
    const result = await createStore({ name, slug, ownerEmail, ownerName }, getAuthUser(req));
    res.status(201).json(result);
  }),
);

// Single endpoint per the milestone spec; suspend and reactivate are the
// same operation from the API consumer's point of view (a status change),
// even though they map to two distinct, separately-audited service
// functions underneath (Part D.2.2).
adminRouter.patch(
  "/stores/:storeId/status",
  validateBody(storeStatusSchema),
  asyncHandler(async (req, res) => {
    const { status, reason } = req.body as StoreStatusInput;
    const actor = getAuthUser(req);
    const store =
      status === "SUSPENDED"
        ? await suspendStore(req.params.storeId, reason as string, actor)
        : await activateStore(req.params.storeId, actor);
    res.json({ store });
  }),
);

// Master Admin's own Storefront Builder tool (Part 7.3/B.3.4) - not
// impersonation-gated; see theme.routes.ts's header comment for why.
adminRouter.use("/stores/:storeId/theme", themeRouter);

// Impersonation start/end/active-session check (Part 15.2).
adminRouter.use(impersonationRouter);

adminRouter.get(
  "/audit-logs",
  asyncHandler(async (req, res) => {
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Math.min(Number(req.query.pageSize), 100) : 100;
    const targetStoreId = typeof req.query.storeId === "string" ? req.query.storeId : undefined;
    const actorId = typeof req.query.actorId === "string" ? req.query.actorId : undefined;
    const action = typeof req.query.action === "string" ? req.query.action : undefined;
    const impersonationOnly = req.query.impersonationOnly === "true";
    const dateFrom = typeof req.query.dateFrom === "string" ? new Date(req.query.dateFrom) : undefined;
    const dateTo = typeof req.query.dateTo === "string" ? new Date(req.query.dateTo) : undefined;

    const where = {
      targetStoreId,
      actorId,
      action,
      impersonationSessionId: impersonationOnly ? { not: null } : undefined,
      createdAt: dateFrom || dateTo ? { gte: dateFrom, lte: dateTo } : undefined,
    };

    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ entries, total, page, pageSize });
  }),
);

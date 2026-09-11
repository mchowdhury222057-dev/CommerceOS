import { Router } from "express";
import { createStoreSchema, storeStatusSchema, type StoreStatusInput } from "@commerceos/types";
import { prisma } from "../lib/prisma.js";
import { getAuthUser, requireAuth, requireMasterAdmin } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { validateBody } from "../middleware/validate.js";
import { approveStore, createStore, getStoreById, listStores, rejectStore, suspendStore } from "../services/store.service.js";
import { getDashboardSummary } from "../services/dashboard.service.js";
import { getVerificationDetail, listVerifications, markUnderReview } from "../services/verification.service.js";
import { listStoreThemes } from "../services/theme.service.js";
import { impersonationRouter } from "./impersonation.routes.js";
import { themeRouter } from "./theme.routes.js";
import type { StoreStatus, VerificationStatus } from "@commerceos/prisma/generated/client";

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

adminRouter.get(
  "/stores/:storeId",
  asyncHandler(async (req, res) => {
    const store = await getStoreById(req.params.storeId);
    res.json({ store });
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

// One endpoint for all three status-transition actions (Approve/Reject/
// Suspend) - the API consumer only ever expresses intent as "make this
// store X", even though APPROVED, SUSPENDED, and REJECTED each map to a
// distinct, separately-audited service function underneath. APPROVED
// itself covers both a first-time approval (PENDING) and a reactivation
// (SUSPENDED) via store.service.ts's own unified approveStore - this
// route never needs to know which case applies.
adminRouter.patch(
  "/stores/:storeId/status",
  validateBody(storeStatusSchema),
  asyncHandler(async (req, res) => {
    const { status, reason } = req.body as StoreStatusInput;
    const actor = getAuthUser(req);
    const store =
      status === "SUSPENDED"
        ? await suspendStore(req.params.storeId, reason as string, actor)
        : status === "REJECTED"
          ? await rejectStore(req.params.storeId, reason as string, actor)
          : await approveStore(req.params.storeId, actor);
    res.json({ store });
  }),
);

// Per Section 14 - Verification Center list, with the same
// search/status/date/pagination shape as the other admin list endpoints.
adminRouter.get(
  "/verifications",
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? (req.query.status.split(",") as VerificationStatus[]) : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const dateFrom = typeof req.query.dateFrom === "string" ? new Date(req.query.dateFrom) : undefined;
    const dateTo = typeof req.query.dateTo === "string" ? new Date(req.query.dateTo) : undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
    const result = await listVerifications({ status, search, dateFrom, dateTo, page, pageSize });
    res.json(result);
  }),
);

// Per Section 15 - full review detail, including signed document URLs.
// Opening this page is also what transitions SUBMITTED -> UNDER_REVIEW
// (Section 14's "admin opened application" audit event).
adminRouter.get(
  "/verifications/:verificationId",
  asyncHandler(async (req, res) => {
    await markUnderReview(req.params.verificationId, getAuthUser(req));
    const verification = await getVerificationDetail(req.params.verificationId);
    res.json({ verification });
  }),
);

// Per Theme Editor Section 3 - Theme Management's store list, one row per
// store with its currently-relevant preset name and draft/published status.
adminRouter.get(
  "/themes",
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
    const result = await listStoreThemes({ search, page, pageSize });
    res.json(result);
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
        // Per Part 7.5/18.2 - a raw actorId is not "who did what"; the
        // Store Activity view (and this same endpoint's global viewer) both
        // need a human-readable name, not just an ID to look up.
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ entries, total, page, pageSize });
  }),
);

import { Router } from "express";
import { endImpersonationSchema, startImpersonationSchema, type EndImpersonationInput, type StartImpersonationInput } from "@commerceos/types";
import { AppError } from "../lib/errors.js";
import { getAuthUser } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { validateBody } from "../middleware/validate.js";
import { endImpersonation, getActiveImpersonationSession, startImpersonation } from "../services/impersonation.service.js";

// Per SRS Part 15.2 - Master-Admin-only. Mounted directly on adminRouter,
// which already applies requireAuth + requireMasterAdmin.
export const impersonationRouter = Router();

impersonationRouter.post(
  "/stores/:storeId/impersonate/start",
  validateBody(startImpersonationSchema),
  asyncHandler(async (req, res) => {
    const { reason } = req.body as StartImpersonationInput;
    const result = await startImpersonation({
      masterAdmin: getAuthUser(req),
      storeId: req.params.storeId,
      reason,
    });
    res.status(201).json(result);
  }),
);

// Not store-scoped in the URL: ends whichever session the caller identifies,
// either by an explicit sessionId in the body (using the admin's own login
// token) or implicitly via the impersonation token's own claim.
impersonationRouter.post(
  "/impersonate/end",
  validateBody(endImpersonationSchema),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.body as EndImpersonationInput;
    const user = getAuthUser(req);
    const targetSessionId = sessionId ?? user.impersonationSessionId;
    if (!targetSessionId) {
      throw AppError.validation("No active impersonation session to end", "NO_ACTIVE_SESSION");
    }
    await endImpersonation({ sessionId: targetSessionId, actorId: user.id, endReason: "manual" });
    res.status(204).send();
  }),
);

// Backs the admin-panel's persistent banner - polled on every page load.
impersonationRouter.get(
  "/impersonate/active",
  asyncHandler(async (req, res) => {
    const session = await getActiveImpersonationSession(getAuthUser(req).id);
    res.json({ session });
  }),
);

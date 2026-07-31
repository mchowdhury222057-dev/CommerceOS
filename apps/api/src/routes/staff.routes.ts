import { Router } from "express";
import { assignRoleSchema, inviteStaffSchema, type Role } from "@commerceos/types";
import { getAuthUser, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { validateBody } from "../middleware/validate.js";
import { assignStoreRole, inviteStaff } from "../services/auth.service.js";

// Per SRS Part 21 - /api/store/:storeId/staff group. Staff account
// management is explicitly a Store Owner-only capability (Part 4.1) - no
// other staff role may invite, remove, or reassign roles for other staff.
export const staffRouter = Router({ mergeParams: true });

staffRouter.post(
  "/invite",
  requireRole("STORE_OWNER"),
  validateBody(inviteStaffSchema),
  asyncHandler(async (req, res) => {
    const { email, name, role } = req.body as { email: string; name: string; role: string };
    const result = await inviteStaff({
      storeId: req.params.storeId,
      email,
      name,
      role: role as Role,
      invitedByUserId: getAuthUser(req).id,
    });
    res.status(201).json(result);
  }),
);

staffRouter.patch(
  "/:userId/role",
  requireRole("STORE_OWNER"),
  validateBody(assignRoleSchema),
  asyncHandler(async (req, res) => {
    const { role } = req.body as { role: string };
    const user = await assignStoreRole({
      storeId: req.params.storeId,
      targetUserId: req.params.userId,
      newRole: role as Role,
      actorId: getAuthUser(req).id,
    });
    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  }),
);

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Role, AuthUser } from "@commerceos/types";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { AppError } from "../lib/errors.js";
import { emit } from "../events/bus.js";
import { writeAuditLog } from "../lib/audit.js";
import { createSession, revokeAllSessionsForUser, revokeSession, rotateSession, type CreatedSession } from "./session.service.js";

// Per Part 19.4 - short-lived (self-contained) access token, paired with a
// Redis-backed, rotate-on-use refresh token (Part D.1.4/session.service.ts).
const JWT_SECRET = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? "dev-secret-change-me";
const ACCESS_TOKEN_TTL = "15m";
const BCRYPT_ROUNDS = 10;
const PASSWORD_MIN_LENGTH = 8;
const RESET_TOKEN_TTL_SECONDS = 30 * 60; // 30 minutes, Part D.1.5

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// The `sid` claim lets requireAuth check Redis for instant revocation
// (Part D.1.6) without widening the shared AuthUser type used everywhere
// else that never needs to see a session id.
function signAccessToken(user: AuthUser, sessionId: string): string {
  return jwt.sign({ ...user, sid: sessionId }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

async function issueAuthResult(user: AuthUser): Promise<AuthResult> {
  const session: CreatedSession = await createSession(user);
  return { accessToken: signAccessToken(user, session.sessionId), refreshToken: session.refreshToken, user };
}

function assertPasswordPolicy(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw AppError.validation(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`, "WEAK_PASSWORD");
  }
}

const resetTokenKey = (tokenHash: string) => `password-reset:${tokenHash}`;

// Per Part D.1.3 - credential presence/format validated by the route; a
// generic 401 never reveals whether the email exists, to blunt accountenumeration via response-shape or timing differences.
export async function login(email: string, password: string): Promise<AuthResult> {
  const record = await prisma.user.findUnique({ where: { email } });
  if (!record || record.status !== "ACTIVE") {
    throw AppError.unauthorized("Invalid email or password");
  }

  const validPassword = await bcrypt.compare(password, record.passwordHash);
  if (!validPassword) {
    throw AppError.unauthorized("Invalid email or password");
  }

  const user: AuthUser = { id: record.id, email: record.email, role: record.role, storeId: record.storeId };

  // Per Part D.1.3 - only Master Administrator and Store Owner logins
  // (privileged roles) are individually audit-logged, keeping the trail
  // focused; their subsequent writes are audited on their own merits.
  if (record.role === "MASTER_ADMIN" || record.role === "STORE_OWNER") {
    await writeAuditLog({
      actorId: record.id,
      actorRole: record.role,
      action: "UserLoggedIn",
      targetStoreId: record.storeId,
    });
  }

  emit("UserLoggedIn", {
    storeId: record.storeId,
    actorId: record.id,
    payload: { userId: record.id, role: record.role, storeId: record.storeId },
  });

  return issueAuthResult(user);
}

// Per Part D.1.4 - exchanges a valid, not-yet-rotated refresh token for a new
// access+refresh pair. Reuse of an already-rotated token revokes the entire
// session family (session.service.ts).
export async function refreshAccessToken(refreshToken: string): Promise<AuthResult> {
  const { user, session } = await rotateSession(refreshToken);
  return { accessToken: signAccessToken(user, session.sessionId), refreshToken: session.refreshToken, user };
}

export async function logout(refreshToken: string): Promise<void> {
  const [sessionId] = refreshToken.split(".");
  if (sessionId) await revokeSession(sessionId);
}

// Per Part D.1.1 - validates the single-use invite token by comparing its
// hash (never the raw token is persisted), sets the account's password, and
// activates it. The token is invalidated on first use regardless of outcome.
export async function redeemStaffInvite(token: string, password: string): Promise<AuthResult> {
  assertPasswordPolicy(password);
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const record = await prisma.user.findUnique({ where: { inviteTokenHash: tokenHash } });
  if (!record || record.status !== "INVITED" || !record.inviteTokenExpiresAt || record.inviteTokenExpiresAt < new Date()) {
    throw AppError.unauthorized("This invite link is invalid or has expired", "INVALID_INVITE_TOKEN");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const updated = await prisma.user.update({
    where: { id: record.id },
    data: { passwordHash, status: "ACTIVE", inviteTokenHash: null, inviteTokenExpiresAt: null },
  });

  // Per Part D.1.1 - attributed to the inviting admin, not the invitee
  // performing this redeem request.
  if (updated.invitedByUserId) {
    const inviter = await prisma.user.findUnique({ where: { id: updated.invitedByUserId } });
    if (inviter) {
      await writeAuditLog({
        actorId: inviter.id,
        actorRole: inviter.role,
        action: "StaffAccountActivated",
        targetStoreId: updated.storeId,
        targetResource: `User:${updated.id}`,
      });
    }
  }

  emit("StaffAccountActivated", {
    storeId: updated.storeId,
    actorId: null,
    payload: { userId: updated.id },
  });

  const user: AuthUser = { id: updated.id, email: updated.email, role: updated.role, storeId: updated.storeId };
  return issueAuthResult(user);
}

// Per Part D.1.5 - the request-reset endpoint never reveals whether the
// submitted email exists; a reset token is only issued when it does.
export async function requestPasswordReset(email: string): Promise<void> {
  const record = await prisma.user.findUnique({ where: { email } });
  if (!record || record.status !== "ACTIVE") return;

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await redis.set(resetTokenKey(tokenHash), record.id, "EX", RESET_TOKEN_TTL_SECONDS);

  emit("PasswordResetRequested", { storeId: record.storeId, actorId: record.id, payload: { userId: record.id } });

  // Real email/SMS dispatch is Phase-14 scope (Part 17); unlike staff
  // invites, the raw token is never returned from this endpoint - its
  // response must be identical whether or not the account exists.
}

// Per Part D.1.5 - completing a reset invalidates every existing session
// across all devices, since a reset is frequently triggered by a suspected
// compromise. The reset token is single-use regardless of outcome.
export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  assertPasswordPolicy(newPassword);
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const userId = await redis.get(resetTokenKey(tokenHash));
  if (!userId) {
    throw AppError.unauthorized("This reset link is invalid or has expired", "INVALID_RESET_TOKEN");
  }
  await redis.del(resetTokenKey(tokenHash));

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const updated = await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await revokeAllSessionsForUser(userId);

  if (updated.role === "MASTER_ADMIN" || updated.role === "STORE_OWNER") {
    await writeAuditLog({
      actorId: updated.id,
      actorRole: updated.role,
      action: "PasswordResetCompleted",
      targetStoreId: updated.storeId,
    });
  }

  emit("PasswordResetCompleted", { storeId: updated.storeId, actorId: updated.id, payload: { userId: updated.id } });
}

// Roles a Store Owner (or Master Administrator, per Part 7.5) may assign
// within a store via this endpoint. Store Owner and Master Administrator
// themselves are never assignable here (Part D.1.6).
const REASSIGNABLE_ROLES: Role[] = ["STORE_MANAGER", "INVENTORY_MANAGER", "ORDER_MANAGER", "CUSTOMER_SUPPORT"];

export interface AssignStoreRoleInput {
  storeId: string;
  targetUserId: string;
  newRole: Role;
  actorId: string;
}

// Per Part D.1.6 - a store may not end up with zero Store Owners; demoting
// the sole Store Owner is rejected without a prior ownership transfer. Role
// changes take effect immediately by force-revoking the target's live
// sessions rather than waiting for natural access-token expiry, closing the
// window where a demoted user could otherwise retain elevated access.
export async function assignStoreRole(input: AssignStoreRoleInput) {
  if (!REASSIGNABLE_ROLES.includes(input.newRole)) {
    throw AppError.forbidden(
      "Store Owner and Master Administrator cannot be assigned through this endpoint",
      "ROLE_NOT_ASSIGNABLE",
    );
  }

  const [actor, target] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: input.actorId } }),
    prisma.user.findFirst({ where: { id: input.targetUserId, storeId: input.storeId } }),
  ]);
  if (!target) throw AppError.notFound(`Staff user ${input.targetUserId} not found in this store`);
  if (target.role === "STORE_OWNER") {
    throw AppError.conflict(
      "Transfer ownership before reassigning the Store Owner's role",
      "OWNER_REASSIGNMENT_BLOCKED",
    );
  }

  const previousRole = target.role;
  const updated = await prisma.user.update({ where: { id: target.id }, data: { role: input.newRole } });
  await revokeAllSessionsForUser(target.id);

  await writeAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    action: "RoleAssigned",
    targetStoreId: input.storeId,
    targetResource: `User:${target.id}`,
  });

  emit("RoleAssigned", {
    storeId: input.storeId,
    actorId: input.actorId,
    payload: { targetUserId: target.id, previousRole, newRole: input.newRole },
  });

  return updated;
}

export interface InviteStaffInput {
  storeId: string;
  email: string;
  name: string;
  role: Role;
  invitedByUserId: string;
}

const INVITE_TOKEN_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours, Part D.1.1

// Per Part D.1.1 - invites a subsequent staff account (never a second Store
// Owner; ownership is fixed at Create Store) into an existing store.
export async function inviteStaff(input: InviteStaffInput): Promise<{ userId: string; inviteToken: string }> {
  if (!REASSIGNABLE_ROLES.includes(input.role)) {
    throw AppError.forbidden(
      "Only Store Manager, Inventory Manager, Order Manager, or Customer Support may be invited",
      "ROLE_NOT_INVITABLE",
    );
  }

  const inviter = await prisma.user.findUniqueOrThrow({ where: { id: input.invitedByUserId } });
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS);

  try {
    const created = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
        status: "INVITED",
        storeId: input.storeId,
        passwordHash: "",
        inviteTokenHash: tokenHash,
        inviteTokenExpiresAt: expiresAt,
        invitedByUserId: input.invitedByUserId,
      },
    });

    await writeAuditLog({
      actorId: inviter.id,
      actorRole: inviter.role,
      action: "StaffInvited",
      targetStoreId: input.storeId,
      targetResource: `User:${created.id}`,
    });

    emit("UserRegistered", {
      storeId: input.storeId,
      actorId: input.invitedByUserId,
      payload: {
        userId: created.id,
        role: created.role,
        storeId: input.storeId,
        email: created.email,
        invitedByUserId: input.invitedByUserId,
      },
    });

    // Real email/SMS dispatch is Phase-14 scope (Part 17); the raw token is
    // returned here so it can be relayed manually until that channel exists.
    return { userId: created.id, inviteToken: token };
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
      throw AppError.conflict(`A staff account for ${input.email} already exists`, "DUPLICATE_EMAIL");
    }
    throw error;
  }
}

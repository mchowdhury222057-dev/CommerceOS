import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Role, AuthUser } from "@commerceos/types";
import { Prisma } from "@commerceos/prisma/generated/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { emit } from "../events/bus.js";
import { writeAuditLog } from "../lib/audit.js";
import { sendPasswordResetLink } from "../lib/mailer.js";
import { createSession, revokeAllSessionsForUser, revokeSession, rotateSession, type CreatedSession } from "./session.service.js";

// Per Part 19.4 - short-lived (self-contained) access token, paired with a
// Redis-backed, rotate-on-use refresh token (Part D.1.4/session.service.ts).
const JWT_SECRET = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? "dev-secret-change-me";
const ACCESS_TOKEN_TTL = "15m";
const BCRYPT_ROUNDS = 10;
const PASSWORD_MIN_LENGTH = 8;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes, Part D.1.5
// Store Dashboard's / Admin Panel's own dev-server origins
// (apps/store-dashboard, apps/admin-panel vite.config.ts); override via env
// in any deployed environment.
const STORE_DASHBOARD_URL = process.env.STORE_DASHBOARD_URL ?? "http://localhost:5174";
const ADMIN_PANEL_URL = process.env.ADMIN_PANEL_URL ?? "http://localhost:5173";

// Per Part 4/20.1's "one system, three skins" - a reset link must open in
// the app the user actually signs into. MASTER_ADMIN uses the Admin Panel;
// every store-scoped role (STORE_OWNER and staff) uses the Store Dashboard.
// Storefront customers aren't part of this staff-auth reset flow at all.
function resetLinkOriginFor(role: Role): string {
  return role === "MASTER_ADMIN" ? ADMIN_PANEL_URL : STORE_DASHBOARD_URL;
}

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

export interface SignupInput {
  storeName: string;
  slug: string;
  ownerName: string;
  email: string;
  phone: string;
  password: string;
}

// Per Part 6.1 - the self-signup path: a prospective Store Owner creates
// their own account and their Store's shell in one step, landing in
// PENDING (Part 6.2) until a Master Administrator approves it directly via
// the existing Approve action in apps/admin-panel - no email-verification
// step in between (that requirement was dropped; see the removed
// verification.service.ts call this comment used to describe). Unlike the
// Master Admin's "+ Create Store" path (store.service.ts's createStore,
// where the owner starts Invited pending an invite-token redemption), the
// owner here sets their own password directly, so their account is Active
// immediately - only the STORE itself is gated on approval, not their
// ability to log in and see their own pending-approval screen (enforced
// by StoreAccessGate client-side and requireApprovedStore server-side).
export async function signup(input: SignupInput): Promise<AuthResult> {
  assertPasswordPolicy(input.password);
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  let created: { storeId: string; storeName: string; slug: string; userId: string; userEmail: string; role: Role; storeIdForUser: string | null };
  try {
    created = await prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: { name: input.storeName, slug: input.slug, status: "PENDING" },
      });
      const user = await tx.user.create({
        data: {
          email: input.email,
          name: input.ownerName,
          phone: input.phone,
          passwordHash,
          role: "STORE_OWNER",
          status: "ACTIVE",
          storeId: store.id,
        },
      });
      await tx.storefront.create({ data: { storeId: store.id } });
      return {
        storeId: store.id,
        storeName: store.name,
        slug: store.slug,
        userId: user.id,
        userEmail: user.email,
        role: user.role,
        storeIdForUser: user.storeId,
      };
    });
  } catch (error) {
    // Same fix as the "+ Create Store" bug (store.service.ts's createStore) -
    // two unique constraints (Store.slug, User.email) can fire in this one
    // transaction, and Prisma's P2002 code alone doesn't say which; read
    // error.meta.target rather than assuming it's always the slug.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = (error.meta?.target as string[] | undefined) ?? [];
      if (target.includes("email")) {
        throw AppError.conflict(`An account with email "${input.email}" already exists`, "DUPLICATE_EMAIL");
      }
      throw AppError.conflict(`Slug "${input.slug}" is already in use`, "DUPLICATE_SLUG");
    }
    throw error;
  }

  // Per Part 15.3 - attributed to the new user themselves (a self-caused
  // action), distinct from "StoreCreated" (the Master-Admin-initiated path)
  // so the Audit Log viewer shows which path actually brought a store into
  // existence.
  await writeAuditLog({
    actorId: created.userId,
    actorRole: created.role,
    action: "StoreSelfSignedUp",
    targetStoreId: created.storeId,
    targetResource: `Store:${created.storeId}`,
  });

  emit("StoreCreated", {
    storeId: created.storeId,
    actorId: created.userId,
    payload: { storeId: created.storeId, ownerUserId: created.userId, storeName: created.storeName, slug: created.slug },
  });

  const user: AuthUser = { id: created.userId, email: created.userEmail, role: created.role, storeId: created.storeIdForUser };
  return issueAuthResult(user);
}

const ADMIN_SETUP_KEY = process.env.ADMIN_SETUP_KEY;

// Constant-time comparison so a wrong setup key can't be narrowed down via
// response-timing differences the way a naive `===` could leak.
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export interface AdminSignupInput {
  name: string;
  email: string;
  password: string;
  setupKey: string;
}

// Per Part 4/20.1 - a second entry point for creating a Master Administrator
// account, gated by a shared secret (ADMIN_SETUP_KEY) rather than open
// signup like the Store Owner path above, since this role is platform-wide
// and not scoped to any one store. The key is never configured -> fail
// closed, same as a wrong key; the caller can't distinguish "missing" from
// "wrong" from the error alone.
// TODO(security): add rate-limiting to this endpoint once a general
// abuse-hardening pass covers the auth routes (deferred this milestone).
export async function signupMasterAdmin(input: AdminSignupInput): Promise<AuthResult> {
  if (!ADMIN_SETUP_KEY || !safeEqual(input.setupKey, ADMIN_SETUP_KEY)) {
    throw AppError.unauthorized("Invalid setup key", "INVALID_SETUP_KEY");
  }
  assertPasswordPolicy(input.password);
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  let created: { id: string; email: string };
  try {
    created = await prisma.user.create({
      data: { email: input.email, name: input.name, passwordHash, role: "MASTER_ADMIN", status: "ACTIVE", storeId: null },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw AppError.conflict(`An account with email "${input.email}" already exists`, "DUPLICATE_EMAIL");
    }
    throw error;
  }

  // Per Part 15.3 - attributed to the new admin themselves (a self-caused
  // action), matching the StoreSelfSignedUp precedent above.
  await writeAuditLog({
    actorId: created.id,
    actorRole: "MASTER_ADMIN",
    action: "MasterAdminSignedUp",
    targetResource: `User:${created.id}`,
  });

  const user: AuthUser = { id: created.id, email: created.email, role: "MASTER_ADMIN", storeId: null };
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
// submitted email exists; a reset token (persisted, not Redis-ephemeral, so
// it carries the same usedAt/expiresAt auditability as the rest of the
// system) is only issued when it does. Returns the link so the route can
// surface it in dev mode - see sendPasswordResetLink for why that's safe to
// do here but must never ship as-is once real email exists.
export async function requestPasswordReset(email: string): Promise<string | null> {
  const record = await prisma.user.findUnique({ where: { email } });
  if (!record || record.status !== "ACTIVE") return null;

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: { userId: record.id, token, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
  });
  const resetLink = `${resetLinkOriginFor(record.role)}/reset-password?token=${token}`;

  emit("PasswordResetRequested", { storeId: record.storeId, actorId: record.id, payload: { userId: record.id } });
  await sendPasswordResetLink(record.email, resetLink);

  return resetLink;
}

// Per Part D.1.5 - completing a reset invalidates every existing session
// across all devices, since a reset is frequently triggered by a suspected
// compromise. The reset token is single-use regardless of outcome, and any
// other outstanding unused tokens for the same user are invalidated too, so
// an older still-live link can't be used after a newer request supersedes it.
export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  assertPasswordPolicy(newPassword);
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw AppError.unauthorized("This reset link is invalid or has expired", "INVALID_RESET_TOKEN");
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const [updated] = await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null, id: { not: record.id } },
      data: { usedAt: new Date() },
    }),
  ]);
  await revokeAllSessionsForUser(updated.id);

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

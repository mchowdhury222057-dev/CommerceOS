import jwt from "jsonwebtoken";
import type { ImpersonationSession } from "@commerceos/prisma/generated/client";
import type { AuthUser } from "@commerceos/types";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { AppError } from "../lib/errors.js";
import { emit } from "../events/bus.js";
import { writeAuditLog } from "../lib/audit.js";

// Per SRS Part 15.2 - impersonation is a time-boxed, explicitly-started and
// -ended session, never an implicit or permanent grant. A Master
// Administrator's own login token does NOT carry store access (Part B.2.1:
// "full access to any store's page only through an active impersonation
// session") - this service is what actually grants that access, scoped to
// exactly one store and expiring on its own even if never explicitly ended.
const JWT_SECRET = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? "dev-secret-change-me";
const SESSION_TTL_SECONDS = 2 * 60 * 60; // 2 hours - time-boxed per Part 15.2
const TOKEN_TTL = "2h";

export interface ImpersonationClaims extends AuthUser {
  impersonationSessionId: string;
}

const activeSessionKey = (sessionId: string) => `impersonation:${sessionId}`;

export interface StartImpersonationInput {
  masterAdmin: AuthUser;
  storeId: string;
  reason: string;
}

export interface StartImpersonationResult {
  session: ImpersonationSession;
  impersonationToken: string;
  expiresAt: string;
}

// Impersonation targets the store's Store Owner (a store has at most one,
// by construction - the same invariant store.service.ts's listStores
// relies on). Every check here is enforced server-side regardless of what
// the Admin Panel UI already filters client-side, per the "never trust the
// frontend alone" rule that governs every other authorization boundary in
// this codebase.
export async function startImpersonation(input: StartImpersonationInput): Promise<StartImpersonationResult> {
  const store = await prisma.store.findUnique({ where: { id: input.storeId } });
  if (!store) throw AppError.notFound(`Store ${input.storeId} not found`);

  const owner = await prisma.user.findFirst({ where: { storeId: input.storeId, role: "STORE_OWNER" } });
  if (!owner) throw AppError.conflict("This store has no Store Owner to impersonate", "NO_STORE_OWNER");
  if (owner.status !== "ACTIVE") {
    throw AppError.conflict("This user cannot be impersonated", "STORE_OWNER_NOT_ACTIVE");
  }

  if (store.status !== "APPROVED") {
    throw AppError.conflict(
      `Cannot impersonate this Store Owner because the store is ${store.status.toLowerCase()}, not approved`,
      `STORE_${store.status}`,
    );
  }

  const session = await prisma.impersonationSession.create({
    data: { masterAdminId: input.masterAdmin.id, targetStoreId: input.storeId, reason: input.reason },
  });

  await redis.set(activeSessionKey(session.id), "1", "EX", SESSION_TTL_SECONDS);

  const claims: ImpersonationClaims = {
    id: input.masterAdmin.id,
    email: input.masterAdmin.email,
    role: "MASTER_ADMIN",
    storeId: input.storeId,
    impersonationSessionId: session.id,
  };
  const impersonationToken = jwt.sign(claims, JWT_SECRET, { expiresIn: TOKEN_TTL });

  await writeAuditLog({
    actorId: input.masterAdmin.id,
    actorRole: "MASTER_ADMIN",
    action: "ImpersonationSessionStarted",
    targetStoreId: input.storeId,
    targetResource: `Store:${input.storeId}`,
    impersonationSessionId: session.id,
    metadata: { reason: input.reason },
  });

  emit("ImpersonationSessionStarted", {
    storeId: input.storeId,
    actorId: input.masterAdmin.id,
    payload: { sessionId: session.id },
  });

  return {
    session,
    impersonationToken,
    expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString(),
  };
}

export interface EndImpersonationInput {
  sessionId: string;
  actorId: string;
  endReason?: "manual" | "expired";
}

// Idempotent: ending an already-ended session is a no-op, never an error -
// a "Session already ended" 409 would just be noise for a double-click.
export async function endImpersonation(input: EndImpersonationInput): Promise<void> {
  const session = await prisma.impersonationSession.findUnique({ where: { id: input.sessionId } });
  if (!session) throw AppError.notFound("Impersonation session not found");
  if (session.endedAt) return;

  const endReason = input.endReason ?? "manual";
  const durationSeconds = Math.round((Date.now() - session.startedAt.getTime()) / 1000);

  await prisma.impersonationSession.update({
    where: { id: session.id },
    data: { endedAt: new Date(), endReason },
  });
  await redis.del(activeSessionKey(session.id));

  await writeAuditLog({
    actorId: input.actorId,
    actorRole: "MASTER_ADMIN",
    action: "ImpersonationSessionEnded",
    targetStoreId: session.targetStoreId,
    targetResource: `Store:${session.targetStoreId}`,
    impersonationSessionId: session.id,
    metadata: { endReason, durationSeconds },
  });

  emit("ImpersonationSessionEnded", {
    storeId: session.targetStoreId,
    actorId: input.actorId,
    payload: { sessionId: session.id, durationSeconds, endReason },
  });
}

// Checked by requireStoreAccess (Part B.2.1's access gate) on every
// impersonated request - O(1), no database round-trip, and naturally
// expires with the Redis key even if End Session is never clicked.
export async function isImpersonationSessionActive(sessionId: string): Promise<boolean> {
  return (await redis.get(activeSessionKey(sessionId))) === "1";
}

// Backs the admin-panel's persistent banner: "is there a currently active
// session for me, and which store" - polled on every page load.
export async function getActiveImpersonationSession(masterAdminId: string) {
  const session = await prisma.impersonationSession.findFirst({
    where: { masterAdminId, endedAt: null },
    orderBy: { startedAt: "desc" },
    include: { targetStore: { select: { id: true, name: true, slug: true } } },
  });
  if (!session) return null;

  // The DB row can outlive the Redis TTL (e.g. the process restarted or the
  // 2-hour window elapsed without an explicit End Session call) - treat that
  // as an implicit expiry rather than showing a banner for a dead session.
  const active = await isImpersonationSessionActive(session.id);
  if (!active) {
    await endImpersonation({ sessionId: session.id, actorId: masterAdminId, endReason: "expired" });
    return null;
  }
  return session;
}

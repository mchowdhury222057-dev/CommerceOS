import crypto from "node:crypto";
import type { AuthUser } from "@commerceos/types";
import { redis } from "../lib/redis.js";
import { AppError } from "../lib/errors.js";

// Per Part D.1.4/F.5.1 - Redis is the sole source of truth for session
// state; refresh tokens are single-use (rotation-on-use) with reuse
// detection, since a compromised store-owner session has real business
// consequences. PostgreSQL is never touched by this service.

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const REFRESH_SECRET_PEPPER = process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me";

type SessionStatus = "active" | "rotated" | "revoked";

interface SessionRecord {
  userId: string;
  email: string;
  role: AuthUser["role"];
  storeId: string | null;
  /** Shared across every rotation descended from the same original login. */
  familyId: string;
  secretHash: string;
  status: SessionStatus;
  createdAt: string;
}

const sessionKey = (sessionId: string) => `session:${sessionId}`;
const familyKey = (familyId: string) => `family:${familyId}`;
const userSessionsKey = (userId: string) => `user-sessions:${userId}`;

function hashSecret(secret: string): string {
  return crypto.createHmac("sha256", REFRESH_SECRET_PEPPER).update(secret).digest("hex");
}

function encodeRefreshToken(sessionId: string, secret: string): string {
  return `${sessionId}.${secret}`;
}

function decodeRefreshToken(token: string): { sessionId: string; secret: string } {
  const [sessionId, secret] = token.split(".");
  if (!sessionId || !secret) throw AppError.unauthorized("Malformed refresh token");
  return { sessionId, secret };
}

async function persistSession(sessionId: string, record: SessionRecord): Promise<void> {
  await redis.set(sessionKey(sessionId), JSON.stringify(record), "EX", REFRESH_TOKEN_TTL_SECONDS);
  await redis.sadd(familyKey(record.familyId), sessionId);
  await redis.expire(familyKey(record.familyId), REFRESH_TOKEN_TTL_SECONDS);
  await redis.sadd(userSessionsKey(record.userId), sessionId);
  await redis.expire(userSessionsKey(record.userId), REFRESH_TOKEN_TTL_SECONDS);
}

async function readSession(sessionId: string): Promise<SessionRecord | null> {
  const raw = await redis.get(sessionKey(sessionId));
  return raw ? (JSON.parse(raw) as SessionRecord) : null;
}

async function writeSessionStatus(sessionId: string, record: SessionRecord, status: SessionStatus): Promise<void> {
  record.status = status;
  await redis.set(sessionKey(sessionId), JSON.stringify(record), "EX", REFRESH_TOKEN_TTL_SECONDS);
}

async function revokeFamily(familyId: string): Promise<void> {
  const sessionIds = await redis.smembers(familyKey(familyId));
  await Promise.all(
    sessionIds.map(async (id) => {
      const record = await readSession(id);
      if (record) await writeSessionStatus(id, record, "revoked");
    }),
  );
}

export interface CreatedSession {
  sessionId: string;
  refreshToken: string;
}

// Per Part D.1.3 - a new login starts a fresh rotation family.
export async function createSession(user: AuthUser): Promise<CreatedSession> {
  const sessionId = crypto.randomUUID();
  const secret = crypto.randomBytes(32).toString("hex");
  const record: SessionRecord = {
    userId: user.id,
    email: user.email,
    role: user.role,
    storeId: user.storeId,
    familyId: sessionId, // the first session in a family is its own family id
    secretHash: hashSecret(secret),
    status: "active",
    createdAt: new Date().toISOString(),
  };
  await persistSession(sessionId, record);
  return { sessionId, refreshToken: encodeRefreshToken(sessionId, secret) };
}

// Per Part D.1.4 - rotation-on-use with reuse detection. Presenting an
// already-rotated refresh token is treated as theft: the entire session
// family is revoked, forcing re-login across every device.
export async function rotateSession(refreshToken: string): Promise<{ user: AuthUser; session: CreatedSession }> {
  const { sessionId, secret } = decodeRefreshToken(refreshToken);
  const record = await readSession(sessionId);
  if (!record) throw AppError.unauthorized("Session expired or not found", "SESSION_NOT_FOUND");

  if (record.status === "rotated") {
    await revokeFamily(record.familyId);
    throw AppError.unauthorized("Refresh token reuse detected - all sessions revoked", "TOKEN_REUSE_DETECTED");
  }
  if (record.status === "revoked") {
    throw AppError.unauthorized("Session has been revoked", "SESSION_REVOKED");
  }
  if (record.secretHash !== hashSecret(secret)) {
    throw AppError.unauthorized("Invalid refresh token");
  }

  // Mark the presented session as rotated (never deleted) so a later replay
  // is recognised as reuse rather than merely "not found".
  await writeSessionStatus(sessionId, record, "rotated");

  const newSessionId = crypto.randomUUID();
  const newSecret = crypto.randomBytes(32).toString("hex");
  const newRecord: SessionRecord = {
    userId: record.userId,
    email: record.email,
    role: record.role,
    storeId: record.storeId,
    familyId: record.familyId,
    secretHash: hashSecret(newSecret),
    status: "active",
    createdAt: new Date().toISOString(),
  };
  await persistSession(newSessionId, newRecord);

  const user: AuthUser = { id: record.userId, email: record.email, role: record.role, storeId: record.storeId };
  return { user, session: { sessionId: newSessionId, refreshToken: encodeRefreshToken(newSessionId, newSecret) } };
}

// Ends only the current device's rotation chain (logout) - other devices'
// sessions for the same user are untouched.
export async function revokeSession(sessionId: string): Promise<void> {
  const record = await readSession(sessionId);
  if (!record) return;
  await revokeFamily(record.familyId);
}

// Per Part D.1.5/D.1.6 - forces re-authentication across every device: used
// on password reset completion and on a role change taking effect.
export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  const sessionIds = await redis.smembers(userSessionsKey(userId));
  await Promise.all(
    sessionIds.map(async (id) => {
      const record = await readSession(id);
      if (record) await writeSessionStatus(id, record, "revoked");
    }),
  );
}

// Per Part D.1's O(1) session-validation design - an access token's `sid`
// claim is checked here on every authenticated request. "rotated" still
// counts as active: the access token issued alongside a since-rotated
// refresh token remains valid until its own short natural expiry; only a
// replay of that specific refresh token is rejected (rotateSession, above).
export async function isSessionActive(sessionId: string): Promise<boolean> {
  const record = await readSession(sessionId);
  return record?.status === "active" || record?.status === "rotated";
}

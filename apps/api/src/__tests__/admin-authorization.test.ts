// apps/api/src/__tests__/admin-authorization.test.ts
//
// CMOS-12: Route-level authorization tests for Admin Panel and Store routes.
// Verifies that authentication and role-based access control enforced by
// requireAuth / requireMasterAdmin / requireStoreAccess middleware prevent
// unauthorized access at the HTTP boundary.
//
// Follows the project's established mocking pattern (see auth.test.ts,
// audit-coverage.test.ts): infrastructure (Redis, Prisma, session/impersonation
// services) is mocked so these tests exercise pure authorization logic without
// requiring a running database or Redis instance.

import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import request from "supertest";
import type { AuthUser } from "@commerceos/types";

const JWT_SECRET = "dev-secret-change-me";

// ── Mock infrastructure ──────────────────────────────────────────────

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    store: { findUnique: vi.fn(), create: vi.fn(), upsert: vi.fn() },
    user: { create: vi.fn(), upsert: vi.fn() },
    auditLog: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    notification: { create: vi.fn() },
    $disconnect: vi.fn(),
  },
}));

vi.mock("../lib/redis.js", () => ({
  redis: { get: vi.fn().mockResolvedValue(null), set: vi.fn(), del: vi.fn(), sadd: vi.fn(), smembers: vi.fn().mockResolvedValue([]), expire: vi.fn() },
}));

vi.mock("../services/session.service.js", () => ({
  isSessionActive: vi.fn().mockResolvedValue(true),
  createSession: vi.fn(),
  rotateSession: vi.fn(),
  revokeSession: vi.fn(),
}));

vi.mock("../services/impersonation.service.js", () => ({
  isImpersonationSessionActive: vi.fn().mockResolvedValue(true),
  startImpersonation: vi.fn(),
  endImpersonation: vi.fn(),
}));

vi.mock("../services/notification.service.js", () => ({
  registerNotificationSubscribers: vi.fn(),
}));

vi.mock("../lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}));

vi.mock("../lib/audit.js", () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock("../events/bus.js", () => ({
  emit: vi.fn(),
  on: vi.fn(),
}));

vi.mock("../middleware/request-logger.js", () => ({
  requestLogger: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock("../middleware/rate-limit.js", () => ({
  loginRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  inviteRedeemRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  passwordResetRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  signupRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock("../middleware/error-handler.js", () => ({
  asyncHandler: (fn: (...args: unknown[]) => Promise<unknown>) => (req: unknown, res: unknown, next: (...args: unknown[]) => void) =>
    Promise.resolve(fn(req, res, next)).catch(next),
  errorHandler: (err: unknown, _req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }, _next: unknown) => {
    const status = (err as { status?: number })?.status ?? 500;
    const message = (err as { message?: string })?.message ?? "Internal Server Error";
    res.status(status).json({ error: message });
  },
}));

// ── Import app AFTER mocks are registered ─────────────────────────────

const { app } = await import("../app.js");

// ── Helpers ──────────────────────────────────────────────────────────

function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "1h" });
}

const storeOwner: AuthUser = { id: "u-owner", email: "owner@store.com", role: "STORE_OWNER", storeId: "store-1" };
const storeManager: AuthUser = { id: "u-manager", email: "manager@store.com", role: "STORE_MANAGER", storeId: "store-1" };
const masterAdmin: AuthUser = { id: "u-admin", email: "admin@platform.com", role: "MASTER_ADMIN", storeId: null };

// ── Tests ────────────────────────────────────────────────────────────

describe("Admin route authorization (CMOS-12)", () => {
  const storeOwnerToken = signToken(storeOwner);
  const masterAdminToken = signToken(masterAdmin);

  describe("GET /api/admin/stores", () => {
    it("rejects request with no token (401)", async () => {
      const res = await request(app).get("/api/admin/stores");
      expect(res.status).toBe(401);
    });

    it("rejects Store Owner token with 403", async () => {
      const res = await request(app)
        .get("/api/admin/stores")
        .set("Authorization", `Bearer ${storeOwnerToken}`);
      expect([401, 403]).toContain(res.status);
    });

    it("allows Master Admin token through", async () => {
      const res = await request(app)
        .get("/api/admin/stores")
        .set("Authorization", `Bearer ${masterAdminToken}`);
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  describe("GET /api/admin/dashboard", () => {
    it("rejects Store Owner token", async () => {
      const res = await request(app)
        .get("/api/admin/dashboard")
        .set("Authorization", `Bearer ${storeOwnerToken}`);
      expect([401, 403]).toContain(res.status);
    });

    it("allows Master Admin token", async () => {
      const res = await request(app)
        .get("/api/admin/dashboard")
        .set("Authorization", `Bearer ${masterAdminToken}`);
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  describe("GET /api/admin/audit-logs", () => {
    it("rejects Store Owner token", async () => {
      const res = await request(app)
        .get("/api/admin/audit-logs")
        .set("Authorization", `Bearer ${storeOwnerToken}`);
      expect([401, 403]).toContain(res.status);
    });

    it("rejects Store Manager token", async () => {
      const res = await request(app)
        .get("/api/admin/audit-logs")
        .set("Authorization", `Bearer ${signToken(storeManager)}`);
      expect([401, 403]).toContain(res.status);
    });

    it("allows Master Admin token", async () => {
      const res = await request(app)
        .get("/api/admin/audit-logs")
        .set("Authorization", `Bearer ${masterAdminToken}`);
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  describe("PATCH /api/admin/stores/:storeId/status", () => {
    it("rejects Store Owner token", async () => {
      const res = await request(app)
        .patch("/api/admin/stores/fake-store-id/status")
        .set("Authorization", `Bearer ${storeOwnerToken}`)
        .send({ status: "SUSPENDED", reason: "test" });
      expect([401, 403]).toContain(res.status);
    });

    it("allows Master Admin token", async () => {
      const res = await request(app)
        .patch("/api/admin/stores/fake-store-id/status")
        .set("Authorization", `Bearer ${masterAdminToken}`)
        .send({ status: "ACTIVE" });
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });
});

describe("Store route authorization (CMOS-12)", () => {
  const storeOwnerToken = signToken(storeOwner);
  const masterAdminToken = signToken(masterAdmin);

  describe("GET /api/store/:storeId", () => {
    it("rejects unauthenticated request", async () => {
      const res = await request(app).get("/api/store/store-1");
      expect(res.status).toBe(401);
    });

    it("allows Store Owner to access their own store", async () => {
      const res = await request(app)
        .get("/api/store/store-1")
        .set("Authorization", `Bearer ${storeOwnerToken}`);
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it("rejects Store Owner accessing a different store (cross-tenant)", async () => {
      const res = await request(app)
        .get("/api/store/store-999")
        .set("Authorization", `Bearer ${storeOwnerToken}`);
      expect([401, 403]).toContain(res.status);
    });

    it("rejects Master Admin without impersonation session", async () => {
      const res = await request(app)
        .get("/api/store/store-1")
        .set("Authorization", `Bearer ${masterAdminToken}`);
      expect([401, 403]).toContain(res.status);
    });
  });

  describe("GET /api/store/:storeId/dashboard", () => {
    it("rejects unauthenticated request", async () => {
      const res = await request(app).get("/api/store/store-1/dashboard");
      expect(res.status).toBe(401);
    });

    it("allows Store Owner to access their own dashboard", async () => {
      const res = await request(app)
        .get("/api/store/store-1/dashboard")
        .set("Authorization", `Bearer ${storeOwnerToken}`);
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });
});

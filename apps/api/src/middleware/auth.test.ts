import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import type { RequestUser } from "./auth.js";

// requireStoreAccess/requireAuth hit Redis-backed session checks - mocked
// here so this suite exercises pure authorization logic, not infrastructure.
vi.mock("../services/session.service.js", () => ({
  isSessionActive: vi.fn().mockResolvedValue(true),
}));
vi.mock("../services/impersonation.service.js", () => ({
  isImpersonationSessionActive: vi.fn(),
}));

const { isImpersonationSessionActive } = await import("../services/impersonation.service.js");
const { requireMasterAdmin, requireStoreAccess, requireRole } = await import("./auth.js");

function makeReq(user: RequestUser | undefined, storeId?: string): Request {
  return { user, params: { storeId } } as unknown as Request;
}

function makeNext(): { next: NextFunction; result: () => unknown } {
  const calls: unknown[] = [];
  const next = ((err?: unknown) => {
    calls.push(err);
  }) as NextFunction;
  return { next, result: () => calls[0] };
}

const storeOwner: RequestUser = { id: "u1", email: "owner@store.com", role: "STORE_OWNER", storeId: "store-a" };
const masterAdmin: RequestUser = { id: "admin1", email: "admin@platform.com", role: "MASTER_ADMIN", storeId: null };

describe("requireMasterAdmin", () => {
  it("rejects a Store Owner token with 403", () => {
    const req = makeReq(storeOwner);
    const { next, result } = makeNext();
    expect(() => requireMasterAdmin(req, {} as Response, next)).toThrow(AppError);
  });

  it("allows a Master Administrator token through", () => {
    const req = makeReq(masterAdmin);
    const { next } = makeNext();
    expect(() => requireMasterAdmin(req, {} as Response, next)).not.toThrow();
  });
});

describe("requireStoreAccess", () => {
  beforeEach(() => {
    vi.mocked(isImpersonationSessionActive).mockReset();
  });

  it("rejects a store-scoped user requesting a different store (cross-tenant access)", async () => {
    const req = makeReq(storeOwner, "store-b"); // storeOwner belongs to store-a
    const { next, result } = makeNext();
    await requireStoreAccess(req, {} as Response, next);
    const err = result() as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(403);
  });

  it("allows a store-scoped user requesting their own store", async () => {
    const req = makeReq(storeOwner, "store-a");
    const { next, result } = makeNext();
    await requireStoreAccess(req, {} as Response, next);
    expect(result()).toBeUndefined();
  });

  it("rejects a Master Administrator with no impersonation session at all (tightened per Part B.2.1)", async () => {
    const req = makeReq(masterAdmin, "store-a");
    const { next, result } = makeNext();
    await requireStoreAccess(req, {} as Response, next);
    const err = result() as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe("IMPERSONATION_REQUIRED");
  });

  it("rejects an impersonation token scoped to a different store than requested", async () => {
    const req = makeReq(
      { ...masterAdmin, storeId: "store-a", impersonationSessionId: "sess-1" },
      "store-b",
    );
    const { next, result } = makeNext();
    await requireStoreAccess(req, {} as Response, next);
    const err = result() as AppError;
    expect(err.status).toBe(403);
  });

  it("rejects an impersonation token whose session has ended/expired in Redis", async () => {
    vi.mocked(isImpersonationSessionActive).mockResolvedValue(false);
    const req = makeReq({ ...masterAdmin, storeId: "store-a", impersonationSessionId: "sess-1" }, "store-a");
    const { next, result } = makeNext();
    await requireStoreAccess(req, {} as Response, next);
    const err = result() as AppError;
    expect(err.code).toBe("IMPERSONATION_SESSION_ENDED");
  });

  it("allows a Master Administrator carrying a valid, matching, active impersonation session", async () => {
    vi.mocked(isImpersonationSessionActive).mockResolvedValue(true);
    const req = makeReq({ ...masterAdmin, storeId: "store-a", impersonationSessionId: "sess-1" }, "store-a");
    const { next, result } = makeNext();
    await requireStoreAccess(req, {} as Response, next);
    expect(result()).toBeUndefined();
  });
});

describe("requireRole", () => {
  it("rejects a role outside the allow-list", () => {
    const req = makeReq(storeOwner);
    const middleware = requireRole("ORDER_MANAGER", "CUSTOMER_SUPPORT");
    expect(() => middleware(req, {} as Response, makeNext().next)).toThrow(AppError);
  });

  it("allows a role inside the allow-list", () => {
    const req = makeReq(storeOwner);
    const middleware = requireRole("STORE_OWNER");
    expect(() => middleware(req, {} as Response, makeNext().next)).not.toThrow();
  });

  it("always allows Master Administrator regardless of the allow-list", () => {
    const req = makeReq(masterAdmin);
    const middleware = requireRole("ORDER_MANAGER");
    expect(() => middleware(req, {} as Response, makeNext().next)).not.toThrow();
  });
});

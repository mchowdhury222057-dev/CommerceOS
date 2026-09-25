import { beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

const mockWriteAuditLog = vi.fn().mockResolvedValue(undefined);
vi.mock("../lib/audit.js", () => ({ writeAuditLog: mockWriteAuditLog }));

const mockEmit = vi.fn();
vi.mock("../events/bus.js", () => ({ emit: mockEmit, on: vi.fn() }));

const mockRedis = {
  set: vi.fn().mockResolvedValue("OK"),
  get: vi.fn().mockResolvedValue(null),
  del: vi.fn().mockResolvedValue(1),
};
vi.mock("../lib/redis.js", () => ({ redis: mockRedis }));

const mockPrisma = {
  store: { findUnique: vi.fn() },
  user: { findFirst: vi.fn() },
  impersonationSession: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
};
vi.mock("../lib/prisma.js", () => ({ prisma: mockPrisma }));

const { startImpersonation, endImpersonation, isImpersonationSessionActive } = await import("./impersonation.service.js");

const JWT_SECRET = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? "dev-secret-change-me";
const masterAdmin = { id: "admin-1", email: "admin@platform.test", role: "MASTER_ADMIN" as const, storeId: null };
const activeOwner = { id: "owner-1", role: "STORE_OWNER", status: "ACTIVE" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("startImpersonation", () => {
  it("mints a usable impersonation token for an APPROVED store with an ACTIVE Store Owner", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", status: "APPROVED" });
    mockPrisma.user.findFirst.mockResolvedValue(activeOwner);
    mockPrisma.impersonationSession.create.mockResolvedValue({ id: "sess-1", targetStoreId: "store-1", startedAt: new Date() });

    const result = await startImpersonation({ masterAdmin, storeId: "store-1", reason: "customer support request" });

    expect(result.impersonationToken).toEqual(expect.any(String));
    const claims = jwt.verify(result.impersonationToken, JWT_SECRET) as Record<string, unknown>;
    expect(claims).toMatchObject({ id: masterAdmin.id, role: "MASTER_ADMIN", storeId: "store-1", impersonationSessionId: "sess-1" });
    expect(mockRedis.set).toHaveBeenCalledWith("impersonation:sess-1", "1", "EX", expect.any(Number));
  });

  it("rejects a store that does not exist", async () => {
    mockPrisma.store.findUnique.mockResolvedValue(null);
    await expect(startImpersonation({ masterAdmin, storeId: "ghost", reason: "x" })).rejects.toMatchObject({ status: 404 });
    expect(mockPrisma.impersonationSession.create).not.toHaveBeenCalled();
  });

  it("rejects a store with no Store Owner at all", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", status: "APPROVED" });
    mockPrisma.user.findFirst.mockResolvedValue(null);

    await expect(startImpersonation({ masterAdmin, storeId: "store-1", reason: "x" })).rejects.toMatchObject({ code: "NO_STORE_OWNER" });
    expect(mockPrisma.impersonationSession.create).not.toHaveBeenCalled();
  });

  it("rejects a Store Owner who has not activated their account yet (still INVITED)", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", status: "APPROVED" });
    mockPrisma.user.findFirst.mockResolvedValue({ id: "owner-1", role: "STORE_OWNER", status: "INVITED" });

    await expect(startImpersonation({ masterAdmin, storeId: "store-1", reason: "x" })).rejects.toMatchObject({ code: "STORE_OWNER_NOT_ACTIVE" });
    expect(mockPrisma.impersonationSession.create).not.toHaveBeenCalled();
  });

  it.each(["PENDING", "SUSPENDED", "REJECTED"] as const)("rejects a %s store", async (status) => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", status });
    mockPrisma.user.findFirst.mockResolvedValue(activeOwner);

    const error = await startImpersonation({ masterAdmin, storeId: "store-1", reason: "x" }).catch((e) => e);
    expect(error).toMatchObject({ status: 409, code: `STORE_${status}` });
    expect(mockPrisma.impersonationSession.create).not.toHaveBeenCalled();
  });
});

describe("isImpersonationSessionActive", () => {
  it("reflects whatever Redis currently holds for that session", async () => {
    mockRedis.get.mockResolvedValueOnce("1");
    await expect(isImpersonationSessionActive("sess-1")).resolves.toBe(true);

    mockRedis.get.mockResolvedValueOnce(null);
    await expect(isImpersonationSessionActive("sess-1")).resolves.toBe(false);
  });
});

describe("endImpersonation", () => {
  it("clears the Redis key so requireStoreAccess starts rejecting the token immediately", async () => {
    mockPrisma.impersonationSession.findUnique.mockResolvedValue({
      id: "sess-1",
      targetStoreId: "store-1",
      startedAt: new Date(),
      endedAt: null,
    });
    mockPrisma.impersonationSession.update.mockResolvedValue({});

    await endImpersonation({ sessionId: "sess-1", actorId: "admin-1" });

    expect(mockRedis.del).toHaveBeenCalledWith("impersonation:sess-1");
  });
});

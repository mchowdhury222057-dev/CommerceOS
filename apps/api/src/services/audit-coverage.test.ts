import { beforeEach, describe, expect, it, vi } from "vitest";

// Per the "keep explicit service-layer calls + add a CI safeguard" decision:
// this suite is the safeguard. It is a representative sample covering this
// milestone's new sensitive actions (Store Management, Theme Editor,
// Impersonation) - not an exhaustive re-test of every service function in
// the codebase, which is Part I's full testing phase. Each test calls the
// real service function (mocking only Prisma/Redis/the event bus) and
// asserts writeAuditLog was invoked with the expected action name, so a
// future refactor that accidentally drops an audit call fails CI here
// instead of being discovered in production.

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

interface FakeTx {
  store: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  storefront: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  storefrontVersion: {
    findUnique: ReturnType<typeof vi.fn>;
    findUniqueOrThrow: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  impersonationSession: { create: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
}

const mockPrisma: FakeTx & { $transaction: ReturnType<typeof vi.fn> } = {
  store: { findUnique: vi.fn(), update: vi.fn() },
  storefront: { findUnique: vi.fn(), update: vi.fn() },
  storefrontVersion: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  impersonationSession: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(),
};
vi.mock("../lib/prisma.js", () => ({ prisma: mockPrisma }));

const { suspendStore } = await import("./store.service.js");
const { publishTheme } = await import("./theme.service.js");
const { startImpersonation, endImpersonation } = await import("./impersonation.service.js");

const masterAdmin = { id: "admin-1", email: "admin@platform.test", role: "MASTER_ADMIN" as const, storeId: null };

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(async (fn: (tx: FakeTx) => unknown) => fn(mockPrisma));
});

describe("audit coverage - Store Management (Part D.2.2)", () => {
  it("suspendStore writes a StoreSuspended audit entry", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", status: "ACTIVE" });
    mockPrisma.store.update.mockResolvedValue({ id: "store-1", status: "SUSPENDED" });

    await suspendStore("store-1", "policy violation", masterAdmin);

    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "StoreSuspended", targetStoreId: "store-1" }),
    );
  });
});

describe("audit coverage - Theme Editor (Part D.6/7.3)", () => {
  it("publishTheme writes a StoreThemePublished audit entry", async () => {
    mockPrisma.storefront.findUnique.mockResolvedValue({
      id: "sf-1",
      storeId: "store-1",
      draftVersionId: "v-draft",
      publishedVersionId: "v-pub",
    });
    mockPrisma.storefrontVersion.update.mockImplementation(
      async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
        id: where.id,
        versionNumber: 2,
        ...data,
      }),
    );
    mockPrisma.storefront.update.mockResolvedValue({});

    await publishTheme("store-1", masterAdmin);

    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "StoreThemePublished", targetStoreId: "store-1" }),
    );
    // The demote-then-promote transaction touches both rows, never just one.
    expect(mockPrisma.storefrontVersion.update).toHaveBeenCalledTimes(2);
  });
});

describe("audit coverage - Impersonation (Part 15.2)", () => {
  it("startImpersonation writes an ImpersonationSessionStarted audit entry", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1" });
    mockPrisma.impersonationSession.create.mockResolvedValue({
      id: "sess-1",
      targetStoreId: "store-1",
      startedAt: new Date(),
    });

    await startImpersonation({ masterAdmin, storeId: "store-1", reason: "customer support request" });

    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ImpersonationSessionStarted", targetStoreId: "store-1" }),
    );
    expect(mockRedis.set).toHaveBeenCalled();
  });

  it("endImpersonation writes an ImpersonationSessionEnded audit entry", async () => {
    mockPrisma.impersonationSession.findUnique.mockResolvedValue({
      id: "sess-1",
      targetStoreId: "store-1",
      startedAt: new Date(Date.now() - 5000),
      endedAt: null,
    });
    mockPrisma.impersonationSession.update.mockResolvedValue({});

    await endImpersonation({ sessionId: "sess-1", actorId: masterAdmin.id });

    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ImpersonationSessionEnded", targetStoreId: "store-1" }),
    );
    expect(mockRedis.del).toHaveBeenCalled();
  });

  it("endImpersonation is idempotent - already-ended sessions are a no-op, not a second audit entry", async () => {
    mockPrisma.impersonationSession.findUnique.mockResolvedValue({
      id: "sess-1",
      targetStoreId: "store-1",
      startedAt: new Date(Date.now() - 5000),
      endedAt: new Date(),
    });

    await endImpersonation({ sessionId: "sess-1", actorId: masterAdmin.id });

    expect(mockWriteAuditLog).not.toHaveBeenCalled();
  });
});

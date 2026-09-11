import { beforeEach, describe, expect, it, vi } from "vitest";

// Per the "remove Store Owner email verification" milestone - the
// self-signup path lands a brand-new store in PENDING (never auto-active)
// and does NOT initiate any email verification (that step was removed
// entirely). session.service.js is mocked as a collaborator (it has its
// own dedicated test coverage already); this suite only asserts signup()'s
// own contract.

const mockWriteAuditLog = vi.fn().mockResolvedValue(undefined);
vi.mock("../lib/audit.js", () => ({ writeAuditLog: mockWriteAuditLog }));

const mockEmit = vi.fn();
vi.mock("../events/bus.js", () => ({ emit: mockEmit, on: vi.fn() }));

const mockCreateSession = vi.fn().mockResolvedValue({ sessionId: "sess-1", refreshToken: "refresh-token" });
vi.mock("./session.service.js", () => ({
  createSession: mockCreateSession,
  revokeAllSessionsForUser: vi.fn(),
  revokeSession: vi.fn(),
  rotateSession: vi.fn(),
}));

interface FakeTx {
  store: { create: ReturnType<typeof vi.fn> };
  user: { create: ReturnType<typeof vi.fn> };
  storefront: { create: ReturnType<typeof vi.fn> };
}

const mockTx: FakeTx = {
  store: { create: vi.fn() },
  user: { create: vi.fn() },
  storefront: { create: vi.fn() },
};
const mockPrisma = { $transaction: vi.fn((fn: (tx: FakeTx) => unknown) => fn(mockTx)) };
vi.mock("../lib/prisma.js", () => ({ prisma: mockPrisma }));

const { signup } = await import("./auth.service.js");

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation((fn: (tx: FakeTx) => unknown) => fn(mockTx));
});

describe("signup", () => {
  it("creates the store as PENDING (never auto-active) and does not require email verification", async () => {
    mockTx.store.create.mockResolvedValue({ id: "store-1", name: "New Store", slug: "new-store" });
    mockTx.user.create.mockResolvedValue({ id: "owner-1", email: "owner@test.dev", role: "STORE_OWNER", storeId: "store-1" });
    mockTx.storefront.create.mockResolvedValue({ id: "sf-1" });

    const result = await signup({ storeName: "New Store", slug: "new-store", ownerName: "Owner", email: "owner@test.dev", phone: "+8801700000000", password: "TestPass123!" });

    expect(mockTx.store.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "PENDING" }) }));
    // No verification row is created and no email provider is touched -
    // signup succeeds purely from the DB transaction + session issuance.
    expect(result.accessToken).toEqual(expect.any(String));
  });

  it("issues a real session so the owner is auto-logged-in straight to the Pending Approval screen", async () => {
    mockTx.store.create.mockResolvedValue({ id: "store-1", name: "New Store", slug: "new-store" });
    mockTx.user.create.mockResolvedValue({ id: "owner-1", email: "owner@test.dev", role: "STORE_OWNER", storeId: "store-1" });
    mockTx.storefront.create.mockResolvedValue({ id: "sf-1" });

    const result = await signup({ storeName: "New Store", slug: "new-store", ownerName: "Owner", email: "owner@test.dev", phone: "+8801700000000", password: "TestPass123!" });

    expect(mockCreateSession).toHaveBeenCalledWith(expect.objectContaining({ id: "owner-1", role: "STORE_OWNER", storeId: "store-1" }));
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.user.storeId).toBe("store-1");
  });

  it("records the phone number on the new owner account (Section 3)", async () => {
    mockTx.store.create.mockResolvedValue({ id: "store-1", name: "New Store", slug: "new-store" });
    mockTx.user.create.mockResolvedValue({ id: "owner-1", email: "owner@test.dev", role: "STORE_OWNER", storeId: "store-1" });
    mockTx.storefront.create.mockResolvedValue({ id: "sf-1" });

    await signup({ storeName: "New Store", slug: "new-store", ownerName: "Owner", email: "owner@test.dev", phone: "+8801700000000", password: "TestPass123!" });

    expect(mockTx.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ phone: "+8801700000000" }) }));
  });
});

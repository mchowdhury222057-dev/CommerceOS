import { beforeEach, describe, expect, it, vi } from "vitest";

// Per Section 36 - the store-status state machine: Approve (from both
// PENDING and SUSPENDED, per the amendment's "one button, one code path"),
// Reject, and Suspend. audit-coverage.test.ts already has one focused
// suspendStore test asserting the audit call; this suite covers the fuller
// state-machine behavior (verification updates, invalid-state guards,
// email dispatch) that this milestone added.

const mockWriteAuditLog = vi.fn().mockResolvedValue(undefined);
vi.mock("../lib/audit.js", () => ({ writeAuditLog: mockWriteAuditLog }));

const mockEmit = vi.fn();
vi.mock("../events/bus.js", () => ({ emit: mockEmit, on: vi.fn() }));

const mockSendStoreApprovalEmail = vi.fn().mockResolvedValue(undefined);
const mockSendStoreReactivationEmail = vi.fn().mockResolvedValue(undefined);
const mockSendStoreRejectionEmail = vi.fn().mockResolvedValue(undefined);
const mockSendStoreSuspensionEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("./email.service.js", () => ({
  sendStoreApprovalEmail: mockSendStoreApprovalEmail,
  sendStoreReactivationEmail: mockSendStoreReactivationEmail,
  sendStoreRejectionEmail: mockSendStoreRejectionEmail,
  sendStoreSuspensionEmail: mockSendStoreSuspensionEmail,
}));

const mockPrisma = {
  store: { findUnique: vi.fn(), update: vi.fn() },
  verification: { updateMany: vi.fn() },
  user: { findFirst: vi.fn() },
};
vi.mock("../lib/prisma.js", () => ({ prisma: mockPrisma }));

const { approveStore, rejectStore, suspendStore } = await import("./store.service.js");

const masterAdmin = { id: "admin-1", email: "admin@platform.test", role: "MASTER_ADMIN" as const, storeId: null };

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.user.findFirst.mockResolvedValue({ email: "owner@store.test" });
  mockPrisma.verification.updateMany.mockResolvedValue({ count: 1 });
});

describe("approveStore", () => {
  it("approves a PENDING store, marks its Verification VERIFIED with the reviewer recorded, and sends the approval email", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", status: "PENDING" });
    mockPrisma.store.update.mockResolvedValue({ id: "store-1", status: "APPROVED", name: "Test Store", slug: "test-store" });

    await approveStore("store-1", masterAdmin);

    expect(mockPrisma.store.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "APPROVED", approvedByUserId: "admin-1" }) }),
    );
    expect(mockPrisma.verification.updateMany).toHaveBeenCalledWith({
      where: { storeId: "store-1" },
      data: { status: "VERIFIED", reviewedAt: expect.any(Date), reviewedByUserId: "admin-1" },
    });
    expect(mockWriteAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "StoreApproved", targetStoreId: "store-1" }));
    expect(mockSendStoreApprovalEmail).toHaveBeenCalled();
    expect(mockSendStoreReactivationEmail).not.toHaveBeenCalled();
  });

  it("reactivates a SUSPENDED store via the same action, without touching Verification, and sends the reactivation email instead", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", status: "SUSPENDED" });
    mockPrisma.store.update.mockResolvedValue({ id: "store-1", status: "APPROVED", name: "Test Store", slug: "test-store" });

    await approveStore("store-1", masterAdmin);

    expect(mockPrisma.verification.updateMany).not.toHaveBeenCalled();
    expect(mockWriteAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "StoreReactivated", targetStoreId: "store-1" }));
    expect(mockSendStoreReactivationEmail).toHaveBeenCalled();
    expect(mockSendStoreApprovalEmail).not.toHaveBeenCalled();
  });

  it("refuses to approve a store that is already APPROVED", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", status: "APPROVED" });
    await expect(approveStore("store-1", masterAdmin)).rejects.toMatchObject({ code: "INVALID_STATE" });
    expect(mockPrisma.store.update).not.toHaveBeenCalled();
  });

  it("refuses to approve a REJECTED store (rejection is a terminal state via this action)", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", status: "REJECTED" });
    await expect(approveStore("store-1", masterAdmin)).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("throws NOT_FOUND for a nonexistent store", async () => {
    mockPrisma.store.findUnique.mockResolvedValue(null);
    await expect(approveStore("ghost", masterAdmin)).rejects.toMatchObject({ status: 404 });
  });
});

describe("rejectStore", () => {
  it("rejects a PENDING application, records the reason/reviewer, and sends the rejection email", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", status: "PENDING" });
    mockPrisma.store.update.mockResolvedValue({ id: "store-1", status: "REJECTED", name: "Test Store" });

    await rejectStore("store-1", "Incomplete documents", masterAdmin);

    expect(mockPrisma.store.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "REJECTED", rejectedReason: "Incomplete documents", rejectedByUserId: "admin-1" }) }),
    );
    expect(mockPrisma.verification.updateMany).toHaveBeenCalledWith({
      where: { storeId: "store-1" },
      data: { status: "REJECTED", rejectionReason: "Incomplete documents", reviewedAt: expect.any(Date), reviewedByUserId: "admin-1" },
    });
    expect(mockWriteAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "StoreRejected", targetStoreId: "store-1" }));
    expect(mockSendStoreRejectionEmail).toHaveBeenCalledWith("owner@store.test", "Test Store", "Incomplete documents");
  });

  it("refuses to reject a store that is already APPROVED (rejection only applies to still-pending applications, Section 20)", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", status: "APPROVED" });
    await expect(rejectStore("store-1", "reason", masterAdmin)).rejects.toMatchObject({ code: "INVALID_STATE" });
    expect(mockPrisma.store.update).not.toHaveBeenCalled();
  });
});

describe("suspendStore", () => {
  it("suspends an APPROVED store, records the reason/actor, and sends the suspension email", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", status: "APPROVED" });
    mockPrisma.store.update.mockResolvedValue({ id: "store-1", status: "SUSPENDED", name: "Test Store" });

    await suspendStore("store-1", "Policy violation", masterAdmin);

    expect(mockPrisma.store.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "SUSPENDED", suspendedReason: "Policy violation", suspendedByUserId: "admin-1" }) }),
    );
    expect(mockWriteAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "StoreSuspended", targetStoreId: "store-1" }));
    expect(mockSendStoreSuspensionEmail).toHaveBeenCalledWith("owner@store.test", "Test Store", "Policy violation");
  });

  it("refuses to suspend a store that is still PENDING (only an already-approved store can be suspended, Section 21)", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", status: "PENDING" });
    await expect(suspendStore("store-1", "reason", masterAdmin)).rejects.toMatchObject({ code: "INVALID_STATE" });
    expect(mockPrisma.store.update).not.toHaveBeenCalled();
  });
});

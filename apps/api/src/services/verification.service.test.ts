import { beforeEach, describe, expect, it, vi } from "vitest";

// Per the "remove Store Owner email verification" milestone -
// initiateVerification()/resendVerificationEmail() no longer exist (their
// tests were removed with them, not left to bit-rot against a deleted
// export). getVerificationByToken/submitVerification/markUnderReview/
// listVerifications/getVerificationDetail are kept as-is (dormant but
// intact - see verification.service.ts's own header comment), so their
// tests are unchanged.

const mockWriteAuditLog = vi.fn().mockResolvedValue(undefined);
vi.mock("../lib/audit.js", () => ({ writeAuditLog: mockWriteAuditLog }));

const mockEmit = vi.fn();
vi.mock("../events/bus.js", () => ({ emit: mockEmit, on: vi.fn() }));

const mockUploadPrivateDocumentBuffer = vi.fn();
const mockGetSignedDocumentUrl = vi.fn();
vi.mock("../lib/cloudinary.js", () => ({
  uploadPrivateDocumentBuffer: mockUploadPrivateDocumentBuffer,
  getSignedDocumentUrl: mockGetSignedDocumentUrl,
}));

const mockSendAdminVerificationSubmittedEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("./email.service.js", () => ({
  sendAdminVerificationSubmittedEmail: mockSendAdminVerificationSubmittedEmail,
}));

const mockPrisma = {
  verification: {
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  user: { update: vi.fn() },
};
vi.mock("../lib/prisma.js", () => ({ prisma: mockPrisma }));

const { getVerificationByToken, submitVerification, markUnderReview, listVerifications, getVerificationDetail } = await import(
  "./verification.service.js"
);

const masterAdmin = { id: "admin-1", email: "admin@platform.test", role: "MASTER_ADMIN" as const, storeId: null };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getVerificationByToken", () => {
  it("rejects an unknown token", async () => {
    mockPrisma.verification.findUnique.mockResolvedValue(null);
    await expect(getVerificationByToken("bad-token")).rejects.toMatchObject({ code: "INVALID_VERIFICATION_TOKEN" });
  });

  it("rejects an expired token", async () => {
    mockPrisma.verification.findUnique.mockResolvedValue({
      id: "ver-1",
      status: "NOT_STARTED",
      tokenUsedAt: null,
      tokenExpiresAt: new Date(Date.now() - 1000),
      store: { name: "Test Store" },
      owner: { name: "Owner", email: "owner@store.test" },
    });
    await expect(getVerificationByToken("expired-token")).rejects.toMatchObject({ code: "INVALID_VERIFICATION_TOKEN" });
  });

  it("rejects a token that has already been used (one-time-use, Section 7)", async () => {
    mockPrisma.verification.findUnique.mockResolvedValue({
      id: "ver-1",
      status: "SUBMITTED",
      tokenUsedAt: new Date(),
      tokenExpiresAt: new Date(Date.now() + 1000 * 60),
      store: { name: "Test Store" },
      owner: { name: "Owner", email: "owner@store.test" },
    });
    await expect(getVerificationByToken("used-token")).rejects.toMatchObject({ code: "INVALID_VERIFICATION_TOKEN" });
  });

  it("transitions NOT_STARTED to IN_PROGRESS on first open and returns the updated status", async () => {
    mockPrisma.verification.findUnique.mockResolvedValue({
      id: "ver-1",
      status: "NOT_STARTED",
      tokenUsedAt: null,
      tokenExpiresAt: new Date(Date.now() + 1000 * 60),
      store: { name: "Test Store" },
      owner: { name: "Owner", email: "owner@store.test" },
    });
    mockPrisma.verification.update.mockResolvedValue({ status: "IN_PROGRESS" });

    const result = await getVerificationByToken("fresh-token");

    expect(mockPrisma.verification.update).toHaveBeenCalledWith({ where: { id: "ver-1" }, data: { status: "IN_PROGRESS" } });
    expect(result.status).toBe("IN_PROGRESS");
  });

  it("does not re-trigger the NOT_STARTED transition on a second open (already IN_PROGRESS)", async () => {
    mockPrisma.verification.findUnique.mockResolvedValue({
      id: "ver-1",
      status: "IN_PROGRESS",
      tokenUsedAt: null,
      tokenExpiresAt: new Date(Date.now() + 1000 * 60),
      store: { name: "Test Store" },
      owner: { name: "Owner", email: "owner@store.test" },
    });

    const result = await getVerificationByToken("in-progress-token");

    expect(mockPrisma.verification.update).not.toHaveBeenCalled();
    expect(result.status).toBe("IN_PROGRESS");
  });
});

describe("submitVerification", () => {
  const baseRecord = {
    id: "ver-1",
    storeId: "store-1",
    ownerId: "owner-1",
    tokenUsedAt: null,
    tokenExpiresAt: new Date(Date.now() + 1000 * 60),
    nidDocumentId: null,
    store: { id: "store-1", name: "Test Store" },
    owner: { id: "owner-1", name: "Owner", email: "owner@store.test", role: "STORE_OWNER" },
  };

  it("rejects submission with no NID document attached and none already on file", async () => {
    mockPrisma.verification.findUnique.mockResolvedValue(baseRecord);

    await expect(
      submitVerification("tok", { fullName: "Owner", phone: "+8801700000000", nidNumber: "123" }, {}),
    ).rejects.toMatchObject({ code: "NID_DOCUMENT_REQUIRED" });
    expect(mockPrisma.verification.update).not.toHaveBeenCalled();
  });

  it("uploads documents privately, marks SUBMITTED, invalidates the token, and notifies the admin", async () => {
    mockPrisma.verification.findUnique.mockResolvedValue(baseRecord);
    mockUploadPrivateDocumentBuffer.mockResolvedValue({ public_id: "commerceos/store-1/verification/abc123" });
    mockPrisma.verification.update.mockResolvedValue({});
    mockPrisma.user.update.mockResolvedValue({});

    await submitVerification(
      "tok",
      { fullName: "Owner", phone: "+8801700000000", nidNumber: "123456789" },
      { nidDocument: Buffer.from("fake-image-bytes") },
    );

    expect(mockPrisma.verification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ver-1" },
        data: expect.objectContaining({ status: "SUBMITTED", tokenUsedAt: expect.any(Date), nidDocumentId: "commerceos/store-1/verification/abc123" }),
      }),
    );
    expect(mockWriteAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "VerificationSubmitted", targetStoreId: "store-1" }));
    expect(mockSendAdminVerificationSubmittedEmail).toHaveBeenCalledWith(expect.objectContaining({ storeName: "Test Store", ownerEmail: "owner@store.test" }));
  });

  it("rejects a submission attempt against an already-used token (no replay)", async () => {
    mockPrisma.verification.findUnique.mockResolvedValue({ ...baseRecord, tokenUsedAt: new Date() });

    await expect(
      submitVerification("tok", { fullName: "Owner", phone: "+8801700000000", nidNumber: "123" }, { nidDocument: Buffer.from("x") }),
    ).rejects.toMatchObject({ code: "INVALID_VERIFICATION_TOKEN" });
  });
});

describe("markUnderReview", () => {
  it("transitions SUBMITTED to UNDER_REVIEW and writes a VerificationReviewOpened audit entry", async () => {
    mockPrisma.verification.findUnique.mockResolvedValue({
      id: "ver-1",
      storeId: "store-1",
      status: "SUBMITTED",
      store: { id: "store-1", name: "Test Store", slug: "test-store", status: "PENDING", createdAt: new Date() },
      owner: { id: "owner-1", name: "Owner", email: "owner@store.test", phone: null },
      reviewedByUser: null,
    });
    mockPrisma.verification.update.mockResolvedValue({});

    await markUnderReview("ver-1", masterAdmin);

    expect(mockPrisma.verification.update).toHaveBeenCalledWith({ where: { id: "ver-1" }, data: { status: "UNDER_REVIEW" } });
    expect(mockWriteAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "VerificationReviewOpened", targetStoreId: "store-1" }));
  });

  it("is idempotent - opening an already UNDER_REVIEW application a second time is a no-op", async () => {
    mockPrisma.verification.findUnique.mockResolvedValue({
      id: "ver-1",
      storeId: "store-1",
      status: "UNDER_REVIEW",
      store: { id: "store-1", name: "Test Store", slug: "test-store", status: "PENDING", createdAt: new Date() },
      owner: { id: "owner-1", name: "Owner", email: "owner@store.test", phone: null },
      reviewedByUser: null,
    });

    await markUnderReview("ver-1", masterAdmin);

    expect(mockPrisma.verification.update).not.toHaveBeenCalled();
    expect(mockWriteAuditLog).not.toHaveBeenCalled();
  });
});

describe("listVerifications", () => {
  it("returns per-status counts alongside the paginated rows", async () => {
    mockPrisma.verification.findMany.mockResolvedValue([]);
    mockPrisma.verification.count.mockResolvedValue(0);
    mockPrisma.verification.groupBy.mockResolvedValue([
      { status: "SUBMITTED", _count: { _all: 2 } },
      { status: "VERIFIED", _count: { _all: 5 } },
    ]);

    const result = await listVerifications({});

    expect(result.counts).toEqual({ NOT_STARTED: 0, IN_PROGRESS: 0, SUBMITTED: 2, UNDER_REVIEW: 0, VERIFIED: 5, REJECTED: 0 });
  });
});

describe("getVerificationDetail", () => {
  it("returns null document URLs for documents that were never uploaded, and a signed URL for one that was", async () => {
    mockPrisma.verification.findUnique.mockResolvedValue({
      id: "ver-1",
      nidDocumentId: "commerceos/store-1/verification/nid123",
      tradeLicenseDocumentId: null,
      supportingDocumentId: null,
      store: { id: "store-1", name: "Test Store", slug: "test-store", status: "PENDING", createdAt: new Date() },
      owner: { id: "owner-1", name: "Owner", email: "owner@store.test", phone: null },
      reviewedByUser: null,
    });
    mockGetSignedDocumentUrl.mockReturnValue("https://api.cloudinary.com/signed-url");

    const detail = await getVerificationDetail("ver-1");

    expect(detail.nidDocumentUrl).toBe("https://api.cloudinary.com/signed-url");
    expect(detail.tradeLicenseDocumentUrl).toBeNull();
    expect(detail.supportingDocumentUrl).toBeNull();
  });
});

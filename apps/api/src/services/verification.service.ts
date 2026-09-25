import crypto from "node:crypto";
import type { AuthUser } from "@commerceos/types";
import type { Prisma, VerificationStatus } from "@commerceos/prisma/generated/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { emit } from "../events/bus.js";
import { writeAuditLog } from "../lib/audit.js";
import { logger } from "../lib/logger.js";
import { getSignedDocumentUrl, uploadPrivateDocumentBuffer } from "../lib/cloudinary.js";
import { sendAdminVerificationSubmittedEmail } from "./email.service.js";

const ADMIN_PANEL_URL = process.env.ADMIN_PANEL_URL ?? "http://localhost:5173";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// initiateVerification()/resendVerificationEmail() (email-based signup
// verification: token issuance + sendVerificationRequiredEmail) were
// removed - email verification is no longer part of the Store Owner
// signup flow. getVerificationByToken/submitVerification below are kept
// (not wired to anything reachable from signup) so the Verification model,
// Admin Verification Center, and approveStore/rejectStore's existing
// Verification updates keep working unchanged; no new Verification row is
// ever created for a self-signup anymore, so these are effectively dormant.

export interface VerificationTokenView {
  storeName: string;
  ownerName: string;
  ownerEmail: string;
  status: VerificationStatus;
}

// Per Section 10 - loads prefill data for the multi-step form. Marks
// IN_PROGRESS the first time the link is actually opened (still
// NOT_STARTED), a one-way transition that's purely informational (lets
// an admin later see "they opened it but never finished").
export async function getVerificationByToken(token: string): Promise<VerificationTokenView> {
  const tokenHash = hashToken(token);
  const record = await prisma.verification.findUnique({
    where: { tokenHash },
    include: { store: { select: { name: true } }, owner: { select: { name: true, email: true } } },
  });
  if (!record || record.tokenUsedAt || !record.tokenExpiresAt || record.tokenExpiresAt < new Date()) {
    throw AppError.unauthorized("This verification link is invalid or has expired", "INVALID_VERIFICATION_TOKEN");
  }

  let status = record.status;
  if (status === "NOT_STARTED") {
    const updated = await prisma.verification.update({ where: { id: record.id }, data: { status: "IN_PROGRESS" } });
    status = updated.status;
  }

  return { storeName: record.store.name, ownerName: record.owner.name, ownerEmail: record.owner.email, status };
}

export interface SubmitVerificationInput {
  fullName: string;
  phone: string;
  businessType?: string;
  businessAddress?: string;
  description?: string;
  nidNumber: string;
  tradeLicenseNumber?: string;
}

export interface SubmitVerificationFiles {
  nidDocument?: Buffer;
  tradeLicenseDocument?: Buffer;
  supportingDocument?: Buffer;
}

// Per Section 12 - on submit: status -> SUBMITTED (then UNDER_REVIEW once
// an admin actually opens it, see markUnderReview), Store.status stays
// PENDING, token is invalidated so the link can't be replayed. Documents
// upload to Cloudinary's authenticated/private delivery mode (Section 29) -
// never the same public flow product images use.
export async function submitVerification(token: string, input: SubmitVerificationInput, files: SubmitVerificationFiles): Promise<void> {
  const tokenHash = hashToken(token);
  const record = await prisma.verification.findUnique({
    where: { tokenHash },
    include: { store: { select: { id: true, name: true } }, owner: { select: { id: true, name: true, email: true, role: true } } },
  });
  if (!record || record.tokenUsedAt || !record.tokenExpiresAt || record.tokenExpiresAt < new Date()) {
    throw AppError.unauthorized("This verification link is invalid or has expired", "INVALID_VERIFICATION_TOKEN");
  }
  if (!files.nidDocument && !record.nidDocumentId) {
    throw AppError.validation("An NID document is required", "NID_DOCUMENT_REQUIRED");
  }

  const folder = `commerceos/${record.storeId}/verification`;
  const [nidUpload, tradeLicenseUpload, supportingUpload] = await Promise.all([
    files.nidDocument ? uploadPrivateDocumentBuffer(files.nidDocument, folder) : null,
    files.tradeLicenseDocument ? uploadPrivateDocumentBuffer(files.tradeLicenseDocument, folder) : null,
    files.supportingDocument ? uploadPrivateDocumentBuffer(files.supportingDocument, folder) : null,
  ]);

  const data: Prisma.VerificationUpdateInput = {
    status: "SUBMITTED",
    submittedAt: new Date(),
    tokenUsedAt: new Date(),
    fullName: input.fullName,
    phone: input.phone,
    businessType: input.businessType || null,
    businessAddress: input.businessAddress || null,
    description: input.description || null,
    nidNumber: input.nidNumber,
    tradeLicenseNumber: input.tradeLicenseNumber || null,
  };
  if (nidUpload) data.nidDocumentId = nidUpload.public_id;
  if (tradeLicenseUpload) data.tradeLicenseDocumentId = tradeLicenseUpload.public_id;
  if (supportingUpload) data.supportingDocumentId = supportingUpload.public_id;

  await prisma.verification.update({ where: { id: record.id }, data });

  // Also keep the owner's own phone in sync (Section 3 collected it at
  // signup already for STORE_OWNER self-signup, but staff-invited owners
  // or a corrected number here should still end up on the User record).
  await prisma.user.update({ where: { id: record.ownerId }, data: { phone: input.phone } });

  await writeAuditLog({
    actorId: record.ownerId,
    actorRole: record.owner.role,
    action: "VerificationSubmitted",
    targetStoreId: record.storeId,
    targetResource: `Verification:${record.id}`,
  });

  const reviewLink = `${ADMIN_PANEL_URL}/verifications/${record.id}`;
  try {
    await sendAdminVerificationSubmittedEmail({
      storeName: record.store.name,
      ownerName: record.owner.name,
      ownerEmail: record.owner.email,
      submittedAt: new Date(),
      reviewLink,
    });
  } catch (error) {
    logger.error({ msg: "Failed to send admin verification-submitted email", err: error, storeId: record.storeId });
  }
}

export interface VerificationListFilters {
  status?: VerificationStatus[];
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
}

// Per Section 14 - the Verification Center's table. Search matches store
// name or owner email/name.
export async function listVerifications(filters: VerificationListFilters = {}) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 25;

  const where: Prisma.VerificationWhereInput = {
    status: filters.status?.length ? { in: filters.status } : undefined,
    submittedAt: filters.dateFrom || filters.dateTo ? { gte: filters.dateFrom, lte: filters.dateTo } : undefined,
    OR: filters.search
      ? [
          { store: { name: { contains: filters.search, mode: "insensitive" } } },
          { owner: { email: { contains: filters.search, mode: "insensitive" } } },
          { owner: { name: { contains: filters.search, mode: "insensitive" } } },
        ]
      : undefined,
  };

  const [verifications, total, statusCounts] = await Promise.all([
    prisma.verification.findMany({
      where,
      include: { store: { select: { id: true, name: true, slug: true, status: true } }, owner: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.verification.count({ where }),
    prisma.verification.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const counts: Record<VerificationStatus, number> = {
    NOT_STARTED: 0,
    IN_PROGRESS: 0,
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    VERIFIED: 0,
    REJECTED: 0,
  };
  for (const group of statusCounts) counts[group.status] = group._count._all;

  return { verifications, total, page, pageSize, counts };
}

async function getVerificationOrThrow(verificationId: string) {
  const record = await prisma.verification.findUnique({
    where: { id: verificationId },
    include: {
      store: { select: { id: true, name: true, slug: true, status: true, createdAt: true } },
      owner: { select: { id: true, name: true, email: true, phone: true } },
      reviewedByUser: { select: { name: true } },
    },
  });
  if (!record) throw AppError.notFound(`Verification ${verificationId} not found`);
  return record;
}

// Per Section 15 - full detail for the admin review page, including
// freshly-signed (5-minute) document URLs generated on demand - never a
// persisted/public link (Section 29).
export async function getVerificationDetail(verificationId: string) {
  const record = await getVerificationOrThrow(verificationId);
  return {
    ...record,
    nidDocumentUrl: record.nidDocumentId ? getSignedDocumentUrl(record.nidDocumentId) : null,
    tradeLicenseDocumentUrl: record.tradeLicenseDocumentId ? getSignedDocumentUrl(record.tradeLicenseDocumentId) : null,
    supportingDocumentUrl: record.supportingDocumentId ? getSignedDocumentUrl(record.supportingDocumentId) : null,
  };
}

// Per Section 14/30 - "admin opened application" is its own audited
// event, distinct from submission; idempotent (only fires the first time).
export async function markUnderReview(verificationId: string, actor: AuthUser): Promise<void> {
  const record = await getVerificationOrThrow(verificationId);
  if (record.status !== "SUBMITTED") return;

  await prisma.verification.update({ where: { id: verificationId }, data: { status: "UNDER_REVIEW" } });

  await writeAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    action: "VerificationReviewOpened",
    targetStoreId: record.storeId,
    targetResource: `Verification:${verificationId}`,
  });

  emit("VerificationReviewOpened", { storeId: record.storeId, actorId: actor.id, payload: { verificationId } });
}

import crypto from "node:crypto";
import type { Store, StoreStatus } from "@commerceos/prisma/generated/client";
import { Prisma } from "@commerceos/prisma/generated/client";
import type { AuthUser } from "@commerceos/types";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { emit } from "../events/bus.js";
import { writeAuditLog } from "../lib/audit.js";
import { logger } from "../lib/logger.js";
import { sendStoreApprovalEmail, sendStoreReactivationEmail, sendStoreRejectionEmail, sendStoreSuspensionEmail } from "./email.service.js";

const INVITE_TOKEN_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours, per Part D.1.1
const STORE_DASHBOARD_URL = process.env.STORE_DASHBOARD_URL ?? "http://localhost:5174";
const STOREFRONT_URL = process.env.STOREFRONT_URL ?? "http://localhost:5175";

async function getStoreOwnerEmail(storeId: string): Promise<string | null> {
  const owner = await prisma.user.findFirst({ where: { storeId, role: "STORE_OWNER" }, select: { email: true } });
  return owner?.email ?? null;
}

// Email failures must never roll back or block a status change the admin
// already committed to - the store IS approved/rejected/suspended in the
// database regardless of whether the notification email goes out, same
// as every other best-effort side effect in this codebase (emit()).
// Logged loudly so a broken email config is still visible, not swallowed.
async function sendNotificationSafely(send: () => Promise<void>, context: string): Promise<void> {
  try {
    await send();
  } catch (error) {
    logger.error({ msg: `Failed to send ${context} email`, err: error });
  }
}

function issueInviteToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, tokenHash, expiresAt: new Date(Date.now() + INVITE_TOKEN_TTL_MS) };
}

export interface StoreListFilters {
  status?: StoreStatus[];
  search?: string;
  page?: number;
  pageSize?: number;
}

// Per Part 6.2 - lets an already-authenticated store-scoped user (or an
// active impersonation session) read their own store's basic profile,
// notably its status, without needing Master Admin's cross-store listing
// endpoint. Access is already gated by requireStoreAccess at the route level.
//
// Includes a MINIMAL verification projection (status/submittedAt only) -
// the Store Dashboard's Pending Approval screen needs this to know
// whether to show "check your email" vs. "under review", but must never
// receive NID numbers or document references through this general-purpose
// endpoint; those stay behind the token-gated/admin-only verification
// endpoints (verification.routes.ts).
//
// Owner name/email (minimal, same projection listStores already exposes)
// is what the Store Dashboard's Impersonation Banner shows - "Impersonating:
// owner@store.com" - since the impersonation JWT's own `email` claim is the
// Master Admin's email, not the Store Owner's (Part 15.2).
export async function getStoreById(
  storeId: string,
): Promise<Store & { verification: { status: string; submittedAt: Date | null } | null; owner: { name: string; email: string } | null }> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      verification: { select: { status: true, submittedAt: true } },
      users: { where: { role: "STORE_OWNER" }, select: { name: true, email: true }, take: 1 },
    },
  });
  if (!store) throw AppError.notFound(`Store ${storeId} not found`);
  const { users, ...rest } = store;
  return { ...rest, owner: users[0] ?? null };
}

// Per Part 6/D.2.1 - the Store Management table needs to show which owner a
// store belongs to (previously invisible - the create-store form captured
// an owner email/name, but nothing displayed it back afterward). A store
// has at most one STORE_OWNER user by construction (createStore and the
// self-signup path each create exactly one), so `take: 1` is safe, not a
// guess at "the first one."
export async function listStores(filters: StoreListFilters = {}) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 25;

  const where: Prisma.StoreWhereInput = {
    status: filters.status?.length ? { in: filters.status } : undefined,
    name: filters.search ? { contains: filters.search, mode: "insensitive" } : undefined,
  };

  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      where,
      include: { users: { where: { role: "STORE_OWNER" }, select: { name: true, email: true }, take: 1 } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.store.count({ where }),
  ]);

  return {
    stores: stores.map(({ users, ...store }) => ({ ...store, owner: users[0] ?? null })),
    total,
    page,
    pageSize,
  };
}

export interface CreateStoreInput {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerName: string;
}

// Per Part D.2.1 - provisions a new tenant, its first Store Owner account
// (Invited, per Part D.1.1's invite mechanism), and its Storefront container
// in one atomic operation. Template cloning (Part 7.4) is a later phase; V1
// creates a blank Storefront with no versions. Master-Admin-only, and always
// audit-logged per Part 15.3 - a platform-defining action.
export async function createStore(input: CreateStoreInput, actor: AuthUser): Promise<{ store: Store; inviteToken: string }> {
  const { tokenHash, expiresAt, token } = issueInviteToken();

  try {
    const { store, ownerUserId } = await prisma.$transaction(async (tx) => {
      const createdStore = await tx.store.create({
        data: { name: input.name, slug: input.slug, status: "PENDING" },
      });
      const owner = await tx.user.create({
        data: {
          email: input.ownerEmail,
          name: input.ownerName,
          role: "STORE_OWNER",
          status: "INVITED",
          storeId: createdStore.id,
          passwordHash: "", // set only on invite redemption (Part D.1.1)
          inviteTokenHash: tokenHash,
          inviteTokenExpiresAt: expiresAt,
        },
      });
      await tx.storefront.create({ data: { storeId: createdStore.id } });
      return { store: createdStore, ownerUserId: owner.id };
    });

    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "StoreCreated",
      targetStoreId: store.id,
      targetResource: `Store:${store.id}`,
    });

    emit("StoreCreated", {
      storeId: store.id,
      actorId: actor.id,
      payload: { storeId: store.id, ownerUserId, storeName: store.name, slug: store.slug },
    });

    // Real email/SMS dispatch is Phase-14 (Notifications) scope; the raw
    // token is returned here so the Master Admin can relay it manually until
    // that channel exists - never logged or persisted anywhere but the hash.
    return { store, inviteToken: token };
  } catch (error) {
    // Two unique constraints can fire inside this one transaction - Store.slug
    // and the owner User.email - and Prisma's P2002 code alone doesn't say
    // which. error.meta.target does (Prisma includes the actual conflicting
    // column names), so it must be checked rather than assuming "P2002 during
    // store creation" always means the slug.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = (error.meta?.target as string[] | undefined) ?? [];
      if (target.includes("email")) {
        throw AppError.conflict(`A user with email "${input.ownerEmail}" already exists`, "DUPLICATE_EMAIL");
      }
      throw AppError.conflict(`Slug "${input.slug}" is already in use`, "DUPLICATE_SLUG");
    }
    throw error;
  }
}

// Per Part D.2.2 - the storefront serves a maintenance page while the admin
// dashboard remains reachable for the owner to resolve the issue; data is
// never deleted or hidden. Only ever applies to an already-approved store
// (Section 21) - a still-pending or already-rejected store is suspended by
// simply not approving/rejecting it, not by this action. Always
// audit-logged (Part 4.2's explicit example of a Master Admin action
// audited even without an active impersonation session).
export async function suspendStore(storeId: string, reason: string, actor: AuthUser): Promise<Store> {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw AppError.notFound(`Store ${storeId} not found`);
  if (store.status !== "APPROVED") {
    throw AppError.conflict(`Cannot suspend a store in ${store.status} status`, "INVALID_STATE");
  }

  const updated = await prisma.store.update({
    where: { id: storeId },
    data: { status: "SUSPENDED", suspendedAt: new Date(), suspendedReason: reason, suspendedByUserId: actor.id },
  });

  await writeAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    action: "StoreSuspended",
    targetStoreId: storeId,
    targetResource: `Store:${storeId}`,
  });

  emit("StoreSuspended", { storeId, actorId: actor.id, payload: { storeId, reason } });

  const ownerEmail = await getStoreOwnerEmail(storeId);
  if (ownerEmail) {
    await sendNotificationSafely(() => sendStoreSuspensionEmail(ownerEmail, updated.name, reason), "store suspension");
  }

  return updated;
}

// Per this milestone's amendment - APPROVE is a single action/code path
// that works from BOTH PENDING (a brand-new application) and SUSPENDED
// (restoring a previously-approved store), always landing on APPROVED.
// The two cases still get distinct audit actions (StoreApproved vs
// StoreReactivated) and distinct emails, since they're different
// real-world events worth telling apart in the trail, even though the
// caller-facing action and endpoint are unified.
export async function approveStore(storeId: string, actor: AuthUser): Promise<Store> {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw AppError.notFound(`Store ${storeId} not found`);
  if (store.status !== "PENDING" && store.status !== "SUSPENDED") {
    throw AppError.conflict(`Cannot approve a store in ${store.status} status`, "INVALID_STATE");
  }
  const wasSuspended = store.status === "SUSPENDED";

  const updated = await prisma.store.update({
    where: { id: storeId },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      approvedByUserId: actor.id,
      suspendedAt: null,
      suspendedReason: null,
      suspendedByUserId: null,
    },
  });

  // Only meaningful the first time (PENDING -> APPROVED); a reactivation
  // from SUSPENDED doesn't touch verification, since it was already
  // VERIFIED before the suspension.
  if (!wasSuspended) {
    await prisma.verification.updateMany({
      where: { storeId },
      data: { status: "VERIFIED", reviewedAt: new Date(), reviewedByUserId: actor.id },
    });
  }

  await writeAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    action: wasSuspended ? "StoreReactivated" : "StoreApproved",
    targetStoreId: storeId,
    targetResource: `Store:${storeId}`,
  });

  emit(wasSuspended ? "StoreReactivated" : "StoreApproved", { storeId, actorId: actor.id, payload: { storeId } });

  const ownerEmail = await getStoreOwnerEmail(storeId);
  if (ownerEmail) {
    const storefrontUrl = `${STOREFRONT_URL}/${updated.slug}`;
    if (wasSuspended) {
      await sendNotificationSafely(
        () => sendStoreReactivationEmail(ownerEmail, updated.name, storefrontUrl, STORE_DASHBOARD_URL),
        "store reactivation",
      );
    } else {
      await sendNotificationSafely(
        () => sendStoreApprovalEmail(ownerEmail, updated.name, storefrontUrl, STORE_DASHBOARD_URL),
        "store approval",
      );
    }
  }

  return updated;
}

// Per Section 20 - only a still-pending application can be rejected (an
// already-approved store is suspended, not rejected - those are different
// real-world actions with different messaging to the owner).
export async function rejectStore(storeId: string, reason: string, actor: AuthUser): Promise<Store> {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw AppError.notFound(`Store ${storeId} not found`);
  if (store.status !== "PENDING") {
    throw AppError.conflict(`Cannot reject a store in ${store.status} status`, "INVALID_STATE");
  }

  const updated = await prisma.store.update({
    where: { id: storeId },
    data: { status: "REJECTED", rejectedAt: new Date(), rejectedReason: reason, rejectedByUserId: actor.id },
  });

  await prisma.verification.updateMany({
    where: { storeId },
    data: { status: "REJECTED", rejectionReason: reason, reviewedAt: new Date(), reviewedByUserId: actor.id },
  });

  await writeAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    action: "StoreRejected",
    targetStoreId: storeId,
    targetResource: `Store:${storeId}`,
  });

  emit("StoreRejected", { storeId, actorId: actor.id, payload: { storeId, reason } });

  const ownerEmail = await getStoreOwnerEmail(storeId);
  if (ownerEmail) {
    await sendNotificationSafely(() => sendStoreRejectionEmail(ownerEmail, updated.name, reason), "store rejection");
  }

  return updated;
}

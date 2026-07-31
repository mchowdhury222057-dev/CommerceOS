import crypto from "node:crypto";
import type { Store, StoreStatus } from "@commerceos/prisma/generated/client";
import { Prisma } from "@commerceos/prisma/generated/client";
import type { AuthUser } from "@commerceos/types";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { emit } from "../events/bus.js";
import { writeAuditLog } from "../lib/audit.js";

const INVITE_TOKEN_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours, per Part D.1.1

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
export async function getStoreById(storeId: string): Promise<Store> {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw AppError.notFound(`Store ${storeId} not found`);
  return store;
}

export async function listStores(filters: StoreListFilters = {}) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 25;

  const where: Prisma.StoreWhereInput = {
    status: filters.status?.length ? { in: filters.status } : undefined,
    name: filters.search ? { contains: filters.search, mode: "insensitive" } : undefined,
  };

  const [stores, total] = await Promise.all([
    prisma.store.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.store.count({ where }),
  ]);

  return { stores, total, page, pageSize };
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
        data: { name: input.name, slug: input.slug, status: "PENDING_SETUP" },
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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw AppError.conflict(`Slug "${input.slug}" is already in use`, "DUPLICATE_SLUG");
    }
    throw error;
  }
}

// Per Part D.2.2 - the storefront serves a maintenance page while the admin
// dashboard remains reachable for the owner to resolve the issue; data is
// never deleted or hidden. Always audit-logged (Part 4.2's explicit example
// of a Master Admin action audited even without an active impersonation
// session).
export async function suspendStore(storeId: string, reason: string, actor: AuthUser): Promise<Store> {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw AppError.notFound(`Store ${storeId} not found`);
  if (store.status !== "ACTIVE") {
    throw AppError.conflict(`Cannot suspend a store in ${store.status} status`, "INVALID_STATE");
  }

  const updated = await prisma.store.update({
    where: { id: storeId },
    data: { status: "SUSPENDED", suspendedAt: new Date(), suspendedReason: reason },
  });

  await writeAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    action: "StoreSuspended",
    targetStoreId: storeId,
    targetResource: `Store:${storeId}`,
  });

  emit("StoreSuspended", { storeId, actorId: actor.id, payload: { storeId, reason } });
  return updated;
}

export async function reactivateStore(storeId: string, actor: AuthUser): Promise<Store> {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw AppError.notFound(`Store ${storeId} not found`);
  if (store.status !== "SUSPENDED") {
    throw AppError.conflict(`Cannot reactivate a store in ${store.status} status`, "INVALID_STATE");
  }
  const updated = await prisma.store.update({
    where: { id: storeId },
    data: { status: "ACTIVE", suspendedAt: null, suspendedReason: null },
  });

  await writeAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    action: "StoreReactivated",
    targetStoreId: storeId,
    targetResource: `Store:${storeId}`,
  });

  return updated;
}

// Per Part 6.2 - the one-time go-live gate for a brand-new store: distinct
// from reactivateStore (which only ever applies to a previously-Suspended
// store) even though both land on ACTIVE, because they are different
// real-world events worth telling apart in the audit trail.
export async function approveStore(storeId: string, actor: AuthUser): Promise<Store> {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw AppError.notFound(`Store ${storeId} not found`);
  if (store.status !== "PENDING_SETUP") {
    throw AppError.conflict(`Cannot approve a store in ${store.status} status`, "INVALID_STATE");
  }

  const updated = await prisma.store.update({ where: { id: storeId }, data: { status: "ACTIVE" } });

  await writeAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    action: "StoreApproved",
    targetStoreId: storeId,
    targetResource: `Store:${storeId}`,
  });

  return updated;
}

// Per Part 6.2 - the API consumer only ever expresses intent as "make this
// store Active"; the existing PATCH .../status endpoint already merges
// suspend/reactivate into one consumer-facing operation (see admin.routes.ts),
// and this extends the same idea to a third real transition (approving a new
// store) without the route itself needing to know a store's current status.
export async function activateStore(storeId: string, actor: AuthUser): Promise<Store> {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw AppError.notFound(`Store ${storeId} not found`);
  if (store.status === "PENDING_SETUP") return approveStore(storeId, actor);
  if (store.status === "SUSPENDED") return reactivateStore(storeId, actor);
  throw AppError.conflict(`Cannot activate a store in ${store.status} status`, "INVALID_STATE");
}

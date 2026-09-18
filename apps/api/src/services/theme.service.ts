import type { StorefrontVersion } from "@commerceos/prisma/generated/client";
import {
  DEFAULT_STOREFRONT_LAYOUT,
  DEFAULT_THEME_SETTINGS,
  normalizeStorefrontLayout,
  normalizeThemeSettings,
  type SimplifiedStorefrontLayout,
  type ThemeSettings,
} from "@commerceos/types";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { emit } from "../events/bus.js";
import { writeAuditLog } from "../lib/audit.js";
import type { RequestUser } from "../middleware/auth.js";

// Per SRS Part 7.3/Part D.6 - the Storefront Builder's draft/publish/
// rollback workflow. Three invariants hold at every point in this file:
//   1. A Storefront has at most one DRAFT and at most one PUBLISHED version
//      at any time (enforced via Storefront.draftVersionId/publishedVersionId
//      pointers, never by scanning for "the most recent" row).
//   2. The public Storefront (not built this milestone) would only ever
//      render the PUBLISHED version - Draft is never reachable outside this
//      editor.
//   3. Publish is the one operation in this file that spans multiple writes
//      and MUST be atomic (Part D.6): demote current Published -> Obsolete,
//      promote Draft -> Published, repoint the Storefront record. A failure
//      partway through must never leave two Published versions, or none.

// Every function in this file returns this shape, not the raw Prisma
// StorefrontVersion (whose layout/themeSettings are untyped Json) - see
// normalizeVersion below.
export type NormalizedStorefrontVersion = Omit<StorefrontVersion, "layout" | "themeSettings"> & {
  layout: SimplifiedStorefrontLayout;
  themeSettings: ThemeSettings;
};

async function getStorefrontOrThrow(storeId: string) {
  const storefront = await prisma.storefront.findUnique({ where: { storeId } });
  if (!storefront) throw AppError.notFound(`Store ${storeId} has no Storefront record`);
  return storefront;
}

// Per the Theme Editor milestone (Sections 24/29) - old rows (pre-dating
// the section-based layout) are coerced to the current shape on every
// read, so a store customized before this milestone keeps rendering
// correctly with zero data migration. See normalizeStorefrontLayout's own
// comment in @commerceos/types for why this lives at the read boundary
// rather than a one-off backfill script.
function normalizeVersion(version: StorefrontVersion): NormalizedStorefrontVersion {
  return { ...version, layout: normalizeStorefrontLayout(version.layout), themeSettings: normalizeThemeSettings(version.themeSettings) };
}

// Per Part D.6 "Save Draft" - if none exists yet, opening the editor creates
// one from the current Published version (or, for a brand-new store with
// nothing published yet, a blank default) - the Master Admin is never left
// editing a null/blank state with no way to save.
export async function getOrCreateDraftTheme(storeId: string, actorId: string): Promise<NormalizedStorefrontVersion> {
  const storefront = await getStorefrontOrThrow(storeId);

  if (storefront.draftVersionId) {
    return normalizeVersion(await prisma.storefrontVersion.findUniqueOrThrow({ where: { id: storefront.draftVersionId } }));
  }

  const published = storefront.publishedVersionId
    ? await prisma.storefrontVersion.findUnique({ where: { id: storefront.publishedVersionId } })
    : null;

  const nextVersionNumber = (published?.versionNumber ?? 0) + 1;
  const draft = await prisma.$transaction(async (tx) => {
    const created = await tx.storefrontVersion.create({
      data: {
        storefrontId: storefront.id,
        versionNumber: nextVersionNumber,
        status: "DRAFT",
        layout: (published?.layout as object) ?? (DEFAULT_STOREFRONT_LAYOUT as object),
        themeSettings: (published?.themeSettings as object) ?? (DEFAULT_THEME_SETTINGS as object),
        createdById: actorId,
      },
    });
    await tx.storefront.update({ where: { id: storefront.id }, data: { draftVersionId: created.id } });
    return created;
  });

  return normalizeVersion(draft);
}

export interface UpdateDraftThemeInput {
  layout?: Partial<SimplifiedStorefrontLayout>;
  themeSettings?: Partial<ThemeSettings>;
}

// Per Part D.6 - continuous autosave of the draft only; the Published
// version is never touched by this function under any circumstance.
export async function updateDraftTheme(storeId: string, input: UpdateDraftThemeInput): Promise<NormalizedStorefrontVersion> {
  const storefront = await getStorefrontOrThrow(storeId);
  if (!storefront.draftVersionId) {
    throw AppError.conflict("No draft exists yet - open the Theme Editor first", "NO_DRAFT");
  }
  const raw = await prisma.storefrontVersion.findUniqueOrThrow({ where: { id: storefront.draftVersionId } });
  // Normalized BEFORE merging (not just on the way out) - merging a partial
  // update into a still-legacy-shaped current.layout would otherwise leave
  // stale old-shape keys (heroHeading, ...) sitting alongside the new
  // sections[] key in what gets written back.
  const current = normalizeVersion(raw);

  const updated = await prisma.storefrontVersion.update({
    where: { id: current.id },
    data: {
      layout: (input.layout ? { ...current.layout, ...input.layout } : current.layout) as object,
      themeSettings: (input.themeSettings ? { ...current.themeSettings, ...input.themeSettings } : current.themeSettings) as object,
    },
  });
  return normalizeVersion(updated);
}

// Per Part D.6/7.3 - THE critical transactional operation: demote current
// Published to Obsolete, promote Draft to Published (reusing the same row -
// "promote," not "copy"), repoint the Storefront's pointers, all in one
// transaction. A thrown error at any point rolls back completely, leaving
// the store's prior Published version still serving (Part 19.2's gracefuldegradation guarantee) rather than a store with two Published versions or
// none.
export async function publishTheme(storeId: string, actor: RequestUser): Promise<NormalizedStorefrontVersion> {
  const result = await prisma.$transaction(async (tx) => {
    const storefront = await tx.storefront.findUnique({ where: { storeId } });
    if (!storefront) throw AppError.notFound(`Store ${storeId} has no Storefront record`);
    if (!storefront.draftVersionId) {
      throw AppError.conflict("There is no draft to publish", "NO_DRAFT");
    }

    const previousPublishedVersionId = storefront.publishedVersionId;
    if (previousPublishedVersionId) {
      await tx.storefrontVersion.update({
        where: { id: previousPublishedVersionId },
        data: { status: "OBSOLETE" },
      });
    }

    const published = await tx.storefrontVersion.update({
      where: { id: storefront.draftVersionId },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });

    await tx.storefront.update({
      where: { id: storefront.id },
      data: { publishedVersionId: published.id, draftVersionId: null },
    });

    return { published, previousPublishedVersionId };
  });

  await writeAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    action: "StoreThemePublished",
    targetStoreId: storeId,
    targetResource: `StorefrontVersion:${result.published.id}`,
    impersonationSessionId: actor.impersonationSessionId ?? null,
    metadata: { previousPublishedVersionId: result.previousPublishedVersionId, versionNumber: result.published.versionNumber },
  });

  emit("StoreThemePublished", {
    storeId,
    actorId: actor.id,
    payload: {
      storeId,
      storefrontVersionId: result.published.id,
      previousVersionId: result.previousPublishedVersionId,
    },
  });

  return normalizeVersion(result.published);
}

export async function listThemeVersions(storeId: string): Promise<NormalizedStorefrontVersion[]> {
  const storefront = await getStorefrontOrThrow(storeId);
  const versions = await prisma.storefrontVersion.findMany({
    where: { storefrontId: storefront.id },
    orderBy: { versionNumber: "desc" },
  });
  return versions.map(normalizeVersion);
}

// Per Part D.6 - "Restore creates a new draft pre-filled from the selected
// historical version; it never publishes directly from history," so a
// restored version still passes through preview and an explicit Publish.
// If a draft already exists, its content is replaced (still the same
// invariant: at most one draft) rather than blocked.
export async function restoreThemeVersion(storeId: string, versionId: string, actorId: string): Promise<NormalizedStorefrontVersion> {
  const storefront = await getStorefrontOrThrow(storeId);
  const historicalRaw = await prisma.storefrontVersion.findFirst({
    where: { id: versionId, storefrontId: storefront.id },
  });
  if (!historicalRaw) throw AppError.notFound(`Version ${versionId} not found for this store`);
  const historical = normalizeVersion(historicalRaw);

  const draft = await prisma.$transaction(async (tx) => {
    if (storefront.draftVersionId) {
      return tx.storefrontVersion.update({
        where: { id: storefront.draftVersionId },
        data: { layout: historical.layout as object, themeSettings: historical.themeSettings as object },
      });
    }
    const latest = await tx.storefrontVersion.findFirst({
      where: { storefrontId: storefront.id },
      orderBy: { versionNumber: "desc" },
    });
    const created = await tx.storefrontVersion.create({
      data: {
        storefrontId: storefront.id,
        versionNumber: (latest?.versionNumber ?? 0) + 1,
        status: "DRAFT",
        layout: historical.layout as object,
        themeSettings: historical.themeSettings as object,
        createdById: actorId,
      },
    });
    await tx.storefront.update({ where: { id: storefront.id }, data: { draftVersionId: created.id } });
    return created;
  });

  await writeAuditLog({
    actorId,
    actorRole: "MASTER_ADMIN",
    action: "StoreThemeRolledBack",
    targetStoreId: storeId,
    targetResource: `StorefrontVersion:${draft.id}`,
    metadata: { restoredFromVersionId: versionId },
  });

  emit("StoreThemeRolledBack", {
    storeId,
    actorId,
    payload: { storeId, restoredFromVersionId: versionId, newDraftVersionId: draft.id },
  });

  return normalizeVersion(draft);
}

export interface StoreThemeSummary {
  storeId: string;
  storeName: string;
  storeSlug: string;
  presetName: string;
  status: "PUBLISHED" | "DRAFT_ONLY" | "DEFAULT";
}

// Per Section 3 - the Theme Management list's Store/Theme/Status table.
// "Theme" is the preset label off whichever version is most relevant to
// show (published if one exists - that's what's actually live - otherwise
// the draft, otherwise there's nothing customized at all yet).
export async function listStoreThemes(filters: { search?: string; page?: number; pageSize?: number } = {}) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 25;

  const where = filters.search ? { name: { contains: filters.search, mode: "insensitive" as const } } : {};

  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      where,
      include: { storefront: { include: { publishedVersion: true, draftVersion: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.store.count({ where }),
  ]);

  const summaries: StoreThemeSummary[] = stores.map((store) => {
    const published = store.storefront?.publishedVersion;
    const draft = store.storefront?.draftVersion;
    const active = published ?? draft;
    const themeSettings = active ? normalizeThemeSettings(active.themeSettings) : DEFAULT_THEME_SETTINGS;
    return {
      storeId: store.id,
      storeName: store.name,
      storeSlug: store.slug,
      presetName: themeSettings.preset,
      status: published ? "PUBLISHED" : draft ? "DRAFT_ONLY" : "DEFAULT",
    };
  });

  return { themes: summaries, total, page, pageSize };
}

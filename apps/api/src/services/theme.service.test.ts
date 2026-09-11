import { beforeEach, describe, expect, it, vi } from "vitest";

// Per the Theme Editor milestone's Section 35 - covers the draft/publish
// separation (Part D.6's invariant, unchanged by this milestone), legacy
// data normalization (Section 24), and the Theme Management list's
// per-store status summary. Mocks Prisma/audit/event-bus the same way
// audit-coverage.test.ts does, so this suite exercises real service logic
// without a live DB.

const mockWriteAuditLog = vi.fn().mockResolvedValue(undefined);
vi.mock("../lib/audit.js", () => ({ writeAuditLog: mockWriteAuditLog }));

const mockEmit = vi.fn();
vi.mock("../events/bus.js", () => ({ emit: mockEmit, on: vi.fn() }));

const mockPrisma = {
  storefront: { findUnique: vi.fn(), update: vi.fn() },
  storefrontVersion: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn(), findMany: vi.fn() },
  store: { findMany: vi.fn(), count: vi.fn() },
  $transaction: vi.fn(),
};
vi.mock("../lib/prisma.js", () => ({ prisma: mockPrisma }));

const { getOrCreateDraftTheme, updateDraftTheme, publishTheme, listStoreThemes } = await import("./theme.service.js");

const masterAdmin = { id: "admin-1", email: "admin@platform.test", role: "MASTER_ADMIN" as const, storeId: null };

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => unknown) => fn(mockPrisma));
});

// A pre-milestone row - the flat hero-only shape every store had before
// the section-based layout existed.
const legacyLayout = { heroHeading: "Old Hero", heroSubheading: "Old sub", heroImageUrl: null, showFeaturedProducts: false };
const legacyThemeSettings = { colorPrimary: "#123456", colorSecondary: "#000000", colorAccent: "#ffffff", colorBackground: "#ffffff", fontHeading: "Inter", fontBody: "Inter", logoUrl: null, faviconUrl: null, cornerRadius: 6 };

describe("getOrCreateDraftTheme", () => {
  it("returns the default theme when the store has no Storefront rows at all (Section 29)", async () => {
    mockPrisma.storefront.findUnique.mockResolvedValue({ id: "sf-1", storeId: "store-1", draftVersionId: null, publishedVersionId: null });
    mockPrisma.storefrontVersion.create.mockResolvedValue({
      id: "v-1",
      storefrontId: "sf-1",
      versionNumber: 1,
      status: "DRAFT",
      layout: {},
      themeSettings: {},
      createdById: "admin-1",
      publishedAt: null,
      createdAt: new Date(),
    });

    const draft = await getOrCreateDraftTheme("store-1", "admin-1");

    expect(draft.themeSettings.colorPrimary).toBe("#4F46E5");
    expect(draft.layout.sections.some((s) => s.type === "hero")).toBe(true);
  });

  it("normalizes a legacy-shape existing draft on read, without losing its customization", async () => {
    mockPrisma.storefront.findUnique.mockResolvedValue({ id: "sf-1", storeId: "store-1", draftVersionId: "v-1", publishedVersionId: null });
    mockPrisma.storefrontVersion.findUniqueOrThrow.mockResolvedValue({
      id: "v-1",
      layout: legacyLayout,
      themeSettings: legacyThemeSettings,
    });

    const draft = await getOrCreateDraftTheme("store-1", "admin-1");

    const hero = draft.layout.sections.find((s) => s.type === "hero");
    expect((hero!.settings as { heading: string }).heading).toBe("Old Hero");
    expect(draft.layout.sections.find((s) => s.type === "featured-products")!.enabled).toBe(false);
    expect(draft.themeSettings.colorPrimary).toBe("#123456");
    // New fields not present on the legacy row fall back to defaults.
    expect(draft.themeSettings.buttonStyle).toBe("rounded");
  });
});

describe("updateDraftTheme", () => {
  it("throws NO_DRAFT when the store has no draft to update", async () => {
    mockPrisma.storefront.findUnique.mockResolvedValue({ id: "sf-1", storeId: "store-1", draftVersionId: null, publishedVersionId: null });
    await expect(updateDraftTheme("store-1", { themeSettings: { colorPrimary: "#000000" } })).rejects.toMatchObject({ code: "NO_DRAFT" });
  });

  it("shallow-merges a themeSettings patch into the current draft and only writes THAT store's draft row", async () => {
    mockPrisma.storefront.findUnique.mockResolvedValue({ id: "sf-store-a", storeId: "store-a", draftVersionId: "v-a", publishedVersionId: null });
    mockPrisma.storefrontVersion.findUniqueOrThrow.mockResolvedValue({ id: "v-a", layout: {}, themeSettings: legacyThemeSettings });
    mockPrisma.storefrontVersion.update.mockResolvedValue({ id: "v-a", layout: {}, themeSettings: { ...legacyThemeSettings, colorPrimary: "#E11D48" } });

    const updated = await updateDraftTheme("store-a", { themeSettings: { colorPrimary: "#E11D48" } });

    expect(mockPrisma.storefrontVersion.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "v-a" } }),
    );
    expect(updated.themeSettings.colorPrimary).toBe("#E11D48");
    // Untouched fields survive the patch (shallow merge, not a full replace).
    expect(updated.themeSettings.colorSecondary).toBe(legacyThemeSettings.colorSecondary);
  });

  it("normalizes legacy layout BEFORE merging, so a partial sections[] patch doesn't produce a hybrid old+new shape", async () => {
    mockPrisma.storefront.findUnique.mockResolvedValue({ id: "sf-1", storeId: "store-1", draftVersionId: "v-1", publishedVersionId: null });
    mockPrisma.storefrontVersion.findUniqueOrThrow.mockResolvedValue({ id: "v-1", layout: legacyLayout, themeSettings: legacyThemeSettings });
    mockPrisma.storefrontVersion.update.mockImplementation(async ({ data }: { data: { layout: object; themeSettings: object } }) => ({
      id: "v-1",
      layout: data.layout,
      themeSettings: data.themeSettings,
    }));

    const newSections = [{ id: "hero", type: "hero" as const, enabled: true, settings: { heading: "New" } }];
    const updated = await updateDraftTheme("store-1", { layout: { sections: newSections } });

    expect(updated.layout.sections).toEqual(newSections);
    expect(updated.layout).not.toHaveProperty("heroHeading");
  });
});

describe("publishTheme", () => {
  it("throws NO_DRAFT when there is nothing to publish", async () => {
    mockPrisma.storefront.findUnique.mockResolvedValue({ id: "sf-1", storeId: "store-1", draftVersionId: null, publishedVersionId: null });
    await expect(publishTheme("store-1", masterAdmin)).rejects.toMatchObject({ code: "NO_DRAFT" });
  });

  it("promotes the draft to PUBLISHED, demotes the previous PUBLISHED to OBSOLETE, and keeps them as distinct rows", async () => {
    mockPrisma.storefront.findUnique.mockResolvedValue({ id: "sf-1", storeId: "store-1", draftVersionId: "v-2", publishedVersionId: "v-1" });
    mockPrisma.storefrontVersion.update.mockImplementation(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
      id: where.id,
      versionNumber: where.id === "v-2" ? 2 : 1,
      layout: {},
      themeSettings: {},
      ...data,
    }));
    mockPrisma.storefront.update.mockResolvedValue({});

    const published = await publishTheme("store-1", masterAdmin);

    expect(published.status).toBe("PUBLISHED");
    expect(mockPrisma.storefrontVersion.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "v-1" }, data: { status: "OBSOLETE" } }));
    expect(mockPrisma.storefront.update).toHaveBeenCalledWith({ where: { id: "sf-1" }, data: { publishedVersionId: "v-2", draftVersionId: null } });
    expect(mockWriteAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "StoreThemePublished", targetStoreId: "store-1" }));
  });
});

describe("listStoreThemes", () => {
  it("reports each store's own status independently - one store's PUBLISHED theme never leaks onto another's row", async () => {
    mockPrisma.store.findMany.mockResolvedValue([
      {
        id: "store-a",
        name: "Store A",
        slug: "store-a",
        storefront: { publishedVersion: { themeSettings: { ...legacyThemeSettings, preset: "bold" } }, draftVersion: null },
      },
      {
        id: "store-b",
        name: "Store B",
        slug: "store-b",
        storefront: { publishedVersion: null, draftVersion: { themeSettings: { ...legacyThemeSettings, preset: "minimal" } } },
      },
      { id: "store-c", name: "Store C", slug: "store-c", storefront: null },
    ]);
    mockPrisma.store.count.mockResolvedValue(3);

    const result = await listStoreThemes({});

    expect(result.themes).toEqual([
      { storeId: "store-a", storeName: "Store A", storeSlug: "store-a", presetName: "bold", status: "PUBLISHED" },
      { storeId: "store-b", storeName: "Store B", storeSlug: "store-b", presetName: "minimal", status: "DRAFT_ONLY" },
      { storeId: "store-c", storeName: "Store C", storeSlug: "store-c", presetName: "modern", status: "DEFAULT" },
    ]);
  });
});

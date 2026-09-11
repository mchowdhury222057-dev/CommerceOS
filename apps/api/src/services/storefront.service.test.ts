import { beforeEach, describe, expect, it, vi } from "vitest";

// Per Theme Editor Section 35 - the public storefront read path
// (getPublicStoreInfo) is the actual "does the theme editor do anything"
// test: whatever a store's PUBLISHED version holds is exactly what a
// visitor's request returns, normalized for legacy rows, defaulted when
// nothing has ever been published.

const mockPrisma = {
  store: { findUnique: vi.fn() },
  storefront: { findUnique: vi.fn() },
};
vi.mock("../lib/prisma.js", () => ({ prisma: mockPrisma }));

const { getPublicStoreInfo } = await import("./storefront.service.js");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPublicStoreInfo", () => {
  it("returns the default theme/layout when the store has never published one (Section 29)", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", slug: "no-theme-yet", status: "APPROVED", name: "No Theme Yet" });
    mockPrisma.storefront.findUnique.mockResolvedValue({ id: "sf-1", storeId: "store-1", publishedVersion: null });

    const info = await getPublicStoreInfo("no-theme-yet");

    expect(info.theme.colorPrimary).toBe("#4F46E5");
    expect(info.layout.sections.length).toBeGreaterThan(0);
  });

  it("returns exactly the PUBLISHED version's theme/layout, never the draft (Part D.6's invariant)", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", slug: "my-store", status: "APPROVED", name: "My Store" });
    mockPrisma.storefront.findUnique.mockResolvedValue({
      id: "sf-1",
      storeId: "store-1",
      publishedVersion: {
        themeSettings: { colorPrimary: "#E11D48", colorSecondary: "#18181B", colorAccent: "#FACC15", colorBackground: "#FFFFFF" },
        layout: { sections: [{ id: "hero", type: "hero", enabled: true, settings: { heading: "Published Heading" } }] },
      },
    });

    const info = await getPublicStoreInfo("my-store");

    expect(info.theme.colorPrimary).toBe("#E11D48");
    expect((info.layout.sections[0].settings as { heading: string }).heading).toBe("Published Heading");
  });

  it("404s for a store that isn't APPROVED - never leaks a suspended/pending store's theme", async () => {
    mockPrisma.store.findUnique.mockResolvedValue({ id: "store-1", slug: "suspended-store", status: "SUSPENDED", name: "Suspended Store" });
    await expect(getPublicStoreInfo("suspended-store")).rejects.toMatchObject({ status: 404 });
  });
});

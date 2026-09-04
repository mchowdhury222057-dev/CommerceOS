// Per SRS Part 6.2, renamed in place for the merchant verification/approval
// milestone (PENDING_SETUP -> PENDING, ACTIVE -> APPROVED, REJECTED added).
// ARCHIVED is unchanged - reserved, no code path sets it yet.
export type StoreStatus = "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED" | "ARCHIVED";

export interface Store {
  id: string;
  name: string;
  slug: string;
  status: StoreStatus;
  ownerUserId: string;
  createdAt: string;
}

// Per SRS Part 7.2 / Part 20.2
export type StorefrontVersionStatus = "DRAFT" | "PUBLISHED" | "OBSOLETE";

// Per SRS Part 22.2/A.5 branding tokens, extended per this milestone's
// Theme Editor spec (primary/secondary/accent/background swatches).
export interface ThemeSettings {
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorBackground: string;
  fontHeading: string;
  fontBody: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  cornerRadius: number; // 0-24px, per Part A.6.1
}

// Reserved shape for Part 7.2's full arbitrary section/block layout tree -
// NOT used by StorefrontVersion.layout in this milestone. See
// SimplifiedStorefrontLayout below for what is actually implemented now.
export interface LayoutSection {
  id: string;
  type: string;
  settings: Record<string, unknown>;
  blocks: Array<Record<string, unknown>>;
}

// Simplified placeholder for this milestone only, standing in for Part
// 7.2's full drag-and-drop section/block builder (explicitly out of scope
// per this milestone's brief). A future milestone replaces this with
// LayoutSection[] without changing anything else in the publish/draft/
// restore workflow, since that workflow only ever treats `layout` as an
// opaque JSON blob it copies between versions.
export interface SimplifiedStorefrontLayout {
  heroHeading: string;
  heroSubheading: string;
  heroImageUrl: string | null;
  showFeaturedProducts: boolean;
}

export interface StorefrontVersion {
  id: string;
  storefrontId: string;
  versionNumber: number;
  status: StorefrontVersionStatus;
  layout: SimplifiedStorefrontLayout;
  themeSettings: ThemeSettings;
  createdByUserId: string;
  publishedAt: string | null;
  createdAt: string;
}

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  colorPrimary: "#4F46E5",
  colorSecondary: "#0F172A",
  colorAccent: "#F59E0B",
  colorBackground: "#FFFFFF",
  fontHeading: "Inter",
  fontBody: "Inter",
  logoUrl: null,
  faviconUrl: null,
  cornerRadius: 8,
};

export const DEFAULT_STOREFRONT_LAYOUT: SimplifiedStorefrontLayout = {
  heroHeading: "Welcome to our store",
  heroSubheading: "",
  heroImageUrl: null,
  showFeaturedProducts: true,
};

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

// Per SRS Part 22.2/A.5 branding tokens, extended per the Theme Editor
// milestone (Shopify/WooCommerce-inspired: presets, color system, layout
// controls, button styles) - still one flat JSON object, no new Prisma
// model, since StorefrontVersion.themeSettings was already Json.
export type ButtonStyle = "rounded" | "square" | "pill";
export type SectionSpacing = "compact" | "comfortable" | "spacious";
export type ProductCardStyle = "minimal" | "bordered" | "shadow";

export interface ThemeSettings {
  // Identifies which built-in preset (if any) this was last applied from -
  // "custom" once the admin edits past what the preset set. Presets
  // themselves are code, not persisted data (Section 6) - this field is
  // just a label for the Theme Management list's "Theme" column.
  preset: string;

  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorBackground: string;
  // New per the Theme Editor milestone - the full color system Section 8
  // asks for (Header/Hero/Product cards/Buttons/Banners/Footer all read
  // from these same tokens, not per-section overrides).
  colorSurface: string;
  colorText: string;
  colorTextMuted: string;

  fontHeading: string;
  fontBody: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  cornerRadius: number; // 0-24px, per Part A.6.1

  buttonStyle: ButtonStyle;
  containerWidth: number; // px, e.g. 1120-1440
  sectionSpacing: SectionSpacing;
  productCardStyle: ProductCardStyle;
}

// Reserved shape for Part 7.2's full arbitrary section/block layout tree -
// deliberately NOT adopted verbatim (no per-section "blocks" sub-tree,
// no free-form block library - Section 33 rules that out for this
// project). ThemeSection below is the smaller, achievable version: a
// flat, reorderable list of typed sections, each with its own settings
// bag, which is everything Sections 9-19 actually ask for.
export type ThemeSectionType =
  | "hero"
  | "featured-categories"
  | "featured-products"
  | "product-grid"
  | "promo-banner"
  | "trust"
  | "newsletter";

export interface ThemeSection {
  id: string;
  type: ThemeSectionType;
  enabled: boolean;
  settings: Record<string, unknown>;
}

export interface HeroSectionSettings {
  heading: string;
  subheading: string;
  imageUrl: string | null;
  buttonText: string;
  buttonLink: string;
  alignment: "left" | "center" | "right";
  overlay: boolean;
  height: "small" | "medium" | "large";
}

export interface FeaturedCategoriesSectionSettings {
  title: string;
  limit: number;
}

export interface FeaturedProductsSectionSettings {
  title: string;
  limit: number;
  columns: 2 | 3 | 4;
  showPrice: boolean;
  showAddToCart: boolean;
}

export interface ProductGridSectionSettings {
  title: string;
  columns: 2 | 3 | 4;
  showPrice: boolean;
  showAddToCart: boolean;
}

export interface PromoBannerSectionSettings {
  heading: string;
  description: string;
  imageUrl: string | null;
  buttonText: string;
  buttonLink: string;
  alignment: "left" | "center" | "right";
}

export interface TrustSectionSettings {
  title: string;
  items: Array<{ text: string }>;
}

export interface NewsletterSectionSettings {
  heading: string;
  subheading: string;
}

// Announcement bar and footer are storefront-wide chrome (shown on every
// page, like the header), not reorderable body content - real theme
// editors (Shopify included) keep these out of the reorderable section
// list too, so this isn't a corner cut. Header customization (Section 11)
// is covered by the global brand colors/logo above plus `header` here;
// there's no separate per-page header content to configure since the
// existing Nav component's structure (logo, store name, cart, search)
// stays as-is per Section 11's "extend, don't replace."
export interface AnnouncementBarSettings {
  enabled: boolean;
  text: string;
  backgroundColor: string;
  textColor: string;
  link: string | null;
  linkText: string | null;
}

export interface HeaderSettings {
  showSearch: boolean;
}

export interface FooterSettings {
  description: string;
  contactEmail: string;
  showSocialLinks: boolean;
}

export interface SimplifiedStorefrontLayout {
  announcementBar: AnnouncementBarSettings;
  header: HeaderSettings;
  sections: ThemeSection[];
  footer: FooterSettings;
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
  preset: "modern",
  colorPrimary: "#4F46E5",
  colorSecondary: "#0F172A",
  colorAccent: "#F59E0B",
  colorBackground: "#FFFFFF",
  colorSurface: "#FFFFFF",
  colorText: "#0F172A",
  colorTextMuted: "#64748B",
  fontHeading: "Inter",
  fontBody: "Inter",
  logoUrl: null,
  faviconUrl: null,
  cornerRadius: 8,
  buttonStyle: "rounded",
  containerWidth: 1200,
  sectionSpacing: "comfortable",
  productCardStyle: "bordered",
};

function section<T extends ThemeSectionType>(id: string, type: T, settings: Record<string, unknown>): ThemeSection {
  return { id, type, enabled: true, settings };
}

// Per Section 34 - the shape every store (including the existing demo
// store) falls back to before its first customization; Section 29
// requires this to always render a complete, attractive homepage, never a
// blank one.
export const DEFAULT_STOREFRONT_LAYOUT: SimplifiedStorefrontLayout = {
  announcementBar: {
    enabled: true,
    text: "Free delivery on orders over ৳2,000",
    backgroundColor: "#0F172A",
    textColor: "#FFFFFF",
    link: null,
    linkText: null,
  },
  header: { showSearch: true },
  sections: [
    section("hero", "hero", {
      heading: "Welcome to our store",
      subheading: "Discover our latest products.",
      imageUrl: null,
      buttonText: "Shop Now",
      buttonLink: "#products",
      alignment: "center",
      overlay: true,
      height: "medium",
    } satisfies HeroSectionSettings),
    section("featured-categories", "featured-categories", { title: "Shop by Category", limit: 4 } satisfies FeaturedCategoriesSectionSettings),
    section("featured-products", "featured-products", {
      title: "Featured Products",
      limit: 8,
      columns: 4,
      showPrice: true,
      showAddToCart: true,
    } satisfies FeaturedProductsSectionSettings),
    section("promo-banner", "promo-banner", {
      heading: "New Season Collection",
      description: "Explore fresh arrivals picked for you.",
      imageUrl: null,
      buttonText: "Shop the Collection",
      buttonLink: "#products",
      alignment: "left",
    } satisfies PromoBannerSectionSettings),
    section("trust", "trust", {
      title: "Why Shop With Us",
      items: [{ text: "Secure Payment" }, { text: "Fast Delivery" }, { text: "Easy Returns" }, { text: "Customer Support" }],
    } satisfies TrustSectionSettings),
    section("product-grid", "product-grid", { title: "All Products", columns: 4, showPrice: true, showAddToCart: true } satisfies ProductGridSectionSettings),
    section("newsletter", "newsletter", { heading: "Subscribe to our newsletter", subheading: "Get updates on new arrivals and offers." } satisfies NewsletterSectionSettings),
  ],
  footer: { description: "", contactEmail: "", showSocialLinks: false },
};

// Per Sections 24/29 - old rows (pre-dating this milestone) only ever had
// { heroHeading, heroSubheading, heroImageUrl, showFeaturedProducts } for
// layout, and themeSettings without the new color/layout/button fields.
// Rather than a destructive one-off migration script touching every
// existing store's data, every read path normalizes on the way out:
// already-new-shape data passes through untouched, old-shape data is
// coerced into the new shape (best-effort carrying over whatever hero
// copy/toggle the store had already customized), and anything
// unrecognized falls back to the default. This keeps every existing
// StorefrontVersion row readable forever without a backfill.
export function normalizeThemeSettings(raw: unknown): ThemeSettings {
  const input = (raw && typeof raw === "object" ? raw : {}) as Partial<ThemeSettings>;
  return { ...DEFAULT_THEME_SETTINGS, ...input };
}

interface LegacyStorefrontLayout {
  heroHeading?: string;
  heroSubheading?: string;
  heroImageUrl?: string | null;
  showFeaturedProducts?: boolean;
}

export function normalizeStorefrontLayout(raw: unknown): SimplifiedStorefrontLayout {
  const input = (raw && typeof raw === "object" ? raw : {}) as Partial<SimplifiedStorefrontLayout> & LegacyStorefrontLayout;

  if (Array.isArray(input.sections)) {
    return {
      announcementBar: { ...DEFAULT_STOREFRONT_LAYOUT.announcementBar, ...input.announcementBar },
      header: { ...DEFAULT_STOREFRONT_LAYOUT.header, ...input.header },
      sections: input.sections,
      footer: { ...DEFAULT_STOREFRONT_LAYOUT.footer, ...input.footer },
    };
  }

  // Legacy (pre-sections) shape - carry over whatever hero copy/toggle the
  // store already had into the new default section list.
  const fallback = structuredClone(DEFAULT_STOREFRONT_LAYOUT);
  if (input.heroHeading || input.heroSubheading || input.heroImageUrl) {
    const hero = fallback.sections.find((s) => s.type === "hero");
    if (hero) {
      const heroSettings = hero.settings as unknown as HeroSectionSettings;
      Object.assign(hero.settings, {
        heading: input.heroHeading ?? heroSettings.heading,
        subheading: input.heroSubheading ?? heroSettings.subheading,
        imageUrl: input.heroImageUrl ?? heroSettings.imageUrl,
      });
    }
  }
  if (input.showFeaturedProducts === false) {
    const featured = fallback.sections.find((s) => s.type === "featured-products");
    if (featured) featured.enabled = false;
  }
  return fallback;
}

import type { HeroSectionSettings, SimplifiedLayout, ThemeSection, ThemeSettings } from "./api-types";

// Local mirror of @commerceos/types' DEFAULT_THEME_SETTINGS/
// DEFAULT_STOREFRONT_LAYOUT, matching this app's existing convention
// (api-types.ts already mirrors the wire shapes rather than importing
// them - see that file's own header comment). Used by "Reset Theme"
// (Section 30) and as the editor's own fallback shape.

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

function section<T extends ThemeSection["type"]>(id: string, type: T, settings: Record<string, unknown>): ThemeSection {
  return { id, type, enabled: true, settings };
}

export const DEFAULT_STOREFRONT_LAYOUT: SimplifiedLayout = {
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
    section("featured-categories", "featured-categories", { title: "Shop by Category", limit: 4 }),
    section("featured-products", "featured-products", { title: "Featured Products", limit: 8, columns: 4, showPrice: true, showAddToCart: true }),
    section("promo-banner", "promo-banner", {
      heading: "New Season Collection",
      description: "Explore fresh arrivals picked for you.",
      imageUrl: null,
      buttonText: "Shop the Collection",
      buttonLink: "#products",
      alignment: "left",
    }),
    section("trust", "trust", {
      title: "Why Shop With Us",
      items: [{ text: "Secure Payment" }, { text: "Fast Delivery" }, { text: "Easy Returns" }, { text: "Customer Support" }],
    }),
    section("product-grid", "product-grid", { title: "All Products", columns: 4, showPrice: true, showAddToCart: true }),
    section("newsletter", "newsletter", { heading: "Subscribe to our newsletter", subheading: "Get updates on new arrivals and offers." }),
  ],
  footer: { description: "", contactEmail: "", showSocialLinks: false },
};

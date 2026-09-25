export type ButtonStyle = "rounded" | "square" | "pill";
export type SectionSpacing = "compact" | "comfortable" | "spacious";
export type ProductCardStyle = "minimal" | "bordered" | "shadow";

export interface ThemeSettings {
  preset: string;
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorBackground: string;
  colorSurface: string;
  colorText: string;
  colorTextMuted: string;
  fontHeading: string;
  fontBody: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  cornerRadius: number;
  buttonStyle: ButtonStyle;
  containerWidth: number;
  sectionSpacing: SectionSpacing;
  productCardStyle: ProductCardStyle;
}

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

export interface StorefrontLayout {
  announcementBar: AnnouncementBarSettings;
  header: HeaderSettings;
  sections: ThemeSection[];
  footer: FooterSettings;
}

export interface PublicStore {
  id: string;
  name: string;
  slug: string;
  theme: ThemeSettings;
  layout: StorefrontLayout;
}

export interface ProductVariant {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  stock: number;
  priceOverride: string | null;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  displayOrder: number;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string;
  basePrice: string;
  images: ProductImage[];
  slug: string;
  variants: ProductVariant[];
  category: { id: string; name: string } | null;
}

export type OrderStatus = "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "RETURNED" | "CANCELLED";

export interface OrderItemView {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: string;
  product: { id: string; name: string };
  variant: { id: string; sku: string; attributes: Record<string, string> };
}

export interface OrderView {
  id: string;
  status: OrderStatus;
  total: string;
  deliveryAddress: string;
  customerNote: string | null;
  courierName: string | null;
  courierTrackingId: string | null;
  createdAt: string;
  items: OrderItemView[];
}

export interface CustomerAccount {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
}

export interface CustomerAuthResult {
  token: string;
  customer: CustomerAccount;
}

export interface AppErrorBody {
  error: { code: string; message: string; details?: unknown };
}

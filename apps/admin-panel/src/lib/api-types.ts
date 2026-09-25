// Types mirroring the ACTUAL JSON the API returns (Prisma model shapes
// serialized over HTTP - Decimal -> string, DateTime -> ISO string), rather
// than the idealized domain types in @commerceos/types, since those two can
// legitimately differ at the wire boundary.

// Renamed in place for the merchant verification/approval milestone
// (PENDING_SETUP -> PENDING, ACTIVE -> APPROVED, REJECTED added).
export type StoreStatus = "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED" | "ARCHIVED";

export interface AdminStore {
  id: string;
  name: string;
  slug: string;
  status: StoreStatus;
  suspendedAt: string | null;
  suspendedReason: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectedReason: string | null;
  planTier: string | null;
  createdAt: string;
  updatedAt: string;
  owner: { name: string; email: string } | null;
}

export type VerificationStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED";

// Per Section 14's Verification Center table row shape - the list
// endpoint's minimal per-row projection, not the full review detail.
export interface AdminVerificationListItem {
  id: string;
  storeId: string;
  ownerId: string;
  status: VerificationStatus;
  submittedAt: string | null;
  createdAt: string;
  store: { id: string; name: string; slug: string; status: StoreStatus };
  owner: { name: string; email: string };
}

// Per Section 15's review page - the full record plus freshly-signed
// (short-lived) document URLs, never a persisted/public link.
export interface AdminVerificationDetail {
  id: string;
  storeId: string;
  ownerId: string;
  status: VerificationStatus;
  fullName: string | null;
  phone: string | null;
  businessType: string | null;
  businessAddress: string | null;
  description: string | null;
  nidNumber: string | null;
  tradeLicenseNumber: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  store: { id: string; name: string; slug: string; status: StoreStatus; createdAt: string };
  owner: { id: string; name: string; email: string; phone: string | null };
  reviewedByUser: { name: string } | null;
  nidDocumentUrl: string | null;
  tradeLicenseDocumentUrl: string | null;
  supportingDocumentUrl: string | null;
}

export type StorefrontVersionStatus = "DRAFT" | "PUBLISHED" | "OBSOLETE";

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

export interface SimplifiedLayout {
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
  layout: SimplifiedLayout;
  themeSettings: ThemeSettings;
  createdById: string;
  publishedAt: string | null;
  createdAt: string;
}

export type StoreThemeStatus = "PUBLISHED" | "DRAFT_ONLY" | "DEFAULT";

export interface StoreThemeSummary {
  storeId: string;
  storeName: string;
  storeSlug: string;
  presetName: string;
  status: StoreThemeStatus;
}

// Minimal mirror of apps/api's Product shape - only what the Theme
// Editor's live preview needs (Section 20), not a full product-management
// type (admin-panel doesn't manage products directly - Section 14/27).
export interface PreviewProduct {
  id: string;
  name: string;
  basePrice: string;
  images: Array<{ url: string; altText: string | null }>;
  variants: Array<{ id: string; stock: number; priceOverride: string | null }>;
  category: { id: string; name: string } | null;
}

export interface ImpersonationSession {
  id: string;
  masterAdminId: string;
  targetStoreId: string;
  reason: string | null;
  startedAt: string;
  endedAt: string | null;
  endReason: string | null;
  targetStore?: { id: string; name: string; slug: string };
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorRole: string;
  actor: { name: string; email: string };
  action: string;
  targetStoreId: string | null;
  targetResource: string | null;
  impersonationSessionId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export type Role =
  | "MASTER_ADMIN"
  | "STORE_OWNER"
  | "STORE_MANAGER"
  | "INVENTORY_MANAGER"
  | "ORDER_MANAGER"
  | "CUSTOMER_SUPPORT";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  storeId: string | null;
}

export interface AppErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export interface DashboardSummary {
  storesByStatus: Record<StoreStatus, number>;
  totalStores: number;
  totalPlatformOrders: number;
  totalStoreOwners: number;
  recentImpersonationSessionCount: number;
}

export type RevenueRangeDays = 7 | 30 | 90 | 365;

export interface PlatformRevenue {
  rangeDays: RevenueRangeDays;
  totalRevenue: string;
  revenueToday: string;
  revenueThisMonth: string;
  revenueThisYear: string;
  revenueTrend: Array<{ date: string; revenue: string }>;
  revenueByStore: Array<{ storeId: string; storeName: string; orders: number; revenue: string }>;
}

export interface StoreGrowth {
  totalStores: number;
  newStoresThisWeek: number;
  newStoresThisMonth: number;
  newStoresThisYear: number;
  growthTrend: Array<{ month: string; totalStores: number }>;
}

export type ServiceStatus = "operational" | "warning" | "error";

export interface ServiceHealthCheck {
  name: string;
  status: ServiceStatus;
  detail?: string;
}

export interface SystemHealth {
  status: ServiceStatus;
  checkedAt: string;
  environment: string;
  uptimeSeconds: number;
  services: ServiceHealthCheck[];
  recentErrors: Array<{ id: string; eventName: string; errorMessage: string; attemptCount: number; lastAttemptAt: string }>;
  failedEventCount: number;
}

export interface PlatformSettings {
  platformName: string;
  platformLogoUrl: string | null;
  platformDescription: string | null;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  updatedAt: string;
}

export interface UpdatePlatformSettingsInput {
  platformName?: string;
  platformLogoUrl?: string | null;
  platformDescription?: string | null;
  maintenanceMode?: boolean;
  maintenanceMessage?: string | null;
}

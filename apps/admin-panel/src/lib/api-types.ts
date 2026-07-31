// Types mirroring the ACTUAL JSON the API returns (Prisma model shapes
// serialized over HTTP - Decimal -> string, DateTime -> ISO string), rather
// than the idealized domain types in @commerceos/types, since those two can
// legitimately differ at the wire boundary.

export type StoreStatus = "PENDING_SETUP" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export interface AdminStore {
  id: string;
  name: string;
  slug: string;
  status: StoreStatus;
  suspendedAt: string | null;
  suspendedReason: string | null;
  planTier: string | null;
  createdAt: string;
  updatedAt: string;
}

export type StorefrontVersionStatus = "DRAFT" | "PUBLISHED" | "OBSOLETE";

export interface SimplifiedLayout {
  heroHeading: string;
  heroSubheading: string;
  heroImageUrl: string | null;
  showFeaturedProducts: boolean;
}

export interface ThemeSettings {
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorBackground: string;
  fontHeading: string;
  fontBody: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  cornerRadius: number;
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

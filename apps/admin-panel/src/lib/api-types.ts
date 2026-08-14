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

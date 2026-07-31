// Domain event catalog per SRS Addendum Part M.2. Every event name is
// PascalCase, past-tense (Part M — "a fact, not a command"), and every event
// is wrapped in the single standard envelope defined in Part M.4. Publishers
// live in apps/api/src/services/*.service.ts only (Part M.3/O.4) and always
// emit post-commit; this file is the single shared vocabulary that Part D
// (publishers) and Part L (future plugin subscribers) both reference by name.
//
// A cataloged event with no current subscriber is still emitted (Part M.2) -
// this file is not pruned down to only what has a listener today.

export interface DomainEvent<TName extends string, TPayload> {
  eventName: TName;
  /** ISO 8601, set once at emit time - never reset by a later retry (Part M.4). */
  occurredAt: string;
  /** null only for platform-scoped events (e.g. UserRegistered for a Master Admin). */
  storeId: string | null;
  /** The authenticated user who caused this; null for system-triggered events. */
  actorId: string | null;
  payload: TPayload;
}

export interface UserRegisteredPayload {
  userId: string;
  role: string;
  storeId: string | null;
  email: string;
  invitedByUserId: string | null;
}

export interface UserLoggedInPayload {
  userId: string;
  role: string;
  storeId: string | null;
}

export interface StoreCreatedPayload {
  storeId: string;
  ownerUserId: string;
  storeName: string;
  slug: string;
}

export interface StoreSuspendedPayload {
  storeId: string;
  reason: string;
}

export interface StoreThemePublishedPayload {
  storeId: string;
  storefrontVersionId: string;
  previousVersionId: string | null;
}

export interface StoreThemeRolledBackPayload {
  storeId: string;
  restoredFromVersionId: string;
  newDraftVersionId: string;
}

export interface ProductCreatedPayload {
  productId: string;
  status: string;
}

export interface ProductStockLowPayload {
  productId: string;
  variantId: string;
  currentStock: number;
  threshold: number;
}

export interface OrderPlacedPayload {
  orderId: string;
  customerId: string;
  total: string;
  paymentMethod: string;
  riskLevelAtPlacement: string;
}

export interface OrderConfirmedPayload {
  orderId: string;
  confirmedByUserId: string;
}

export interface CodConfirmationCallLoggedPayload {
  orderId: string;
  outcome: "CONFIRMED" | "NO_ANSWER" | "DECLINED";
  callAttempts: number;
}

export interface OrderStatusChangedPayload {
  orderId: string;
  fromStatus: string;
  toStatus: string;
}

export interface OrderDeliveredPayload {
  orderId: string;
  customerId: string;
}

export interface OrderReturnedPayload {
  orderId: string;
  customerId: string;
}

export interface CustomerRiskLevelChangedPayload {
  customerId: string;
  previousRiskLevel: string;
  newRiskLevel: string;
}

// Reserved for V2 (Part 9.2/Part M.2) - not emitted anywhere in V1 since Cash
// on Delivery has no verification step.
export interface PaymentApprovedPayload {
  orderId: string;
  verificationMethod: string;
}

export interface InvoiceGeneratedPayload {
  orderId: string;
  invoiceId: string;
  format: string;
}

export interface NotificationSentPayload {
  channel: string;
  templateKey: string;
  recipientRef: string;
  status: "sent" | "failed";
}

export interface PasswordResetRequestedPayload {
  userId: string;
}

export interface PasswordResetCompletedPayload {
  userId: string;
}

export interface RoleAssignedPayload {
  targetUserId: string;
  previousRole: string;
  newRole: string;
}

export interface StaffAccountActivatedPayload {
  userId: string;
}

export interface ImpersonationSessionStartedPayload {
  sessionId: string;
}

export interface ImpersonationSessionEndedPayload {
  sessionId: string;
  durationSeconds: number;
  endReason: string;
}

export interface AnalyticsSnapshotUpdatedPayload {
  snapshotType: string;
  periodStart: string;
  periodEnd: string;
}

/** Maps every cataloged V1 event name to its payload shape (Part M.2/M.4). */
export interface EventPayloadMap {
  UserRegistered: UserRegisteredPayload;
  UserLoggedIn: UserLoggedInPayload;
  StoreCreated: StoreCreatedPayload;
  StoreSuspended: StoreSuspendedPayload;
  StoreThemePublished: StoreThemePublishedPayload;
  StoreThemeRolledBack: StoreThemeRolledBackPayload;
  ProductCreated: ProductCreatedPayload;
  ProductStockLow: ProductStockLowPayload;
  OrderPlaced: OrderPlacedPayload;
  OrderConfirmed: OrderConfirmedPayload;
  CodConfirmationCallLogged: CodConfirmationCallLoggedPayload;
  PasswordResetRequested: PasswordResetRequestedPayload;
  PasswordResetCompleted: PasswordResetCompletedPayload;
  RoleAssigned: RoleAssignedPayload;
  StaffAccountActivated: StaffAccountActivatedPayload;
  OrderStatusChanged: OrderStatusChangedPayload;
  OrderDelivered: OrderDeliveredPayload;
  OrderReturned: OrderReturnedPayload;
  CustomerRiskLevelChanged: CustomerRiskLevelChangedPayload;
  PaymentApproved: PaymentApprovedPayload;
  InvoiceGenerated: InvoiceGeneratedPayload;
  NotificationSent: NotificationSentPayload;
  ImpersonationSessionStarted: ImpersonationSessionStartedPayload;
  ImpersonationSessionEnded: ImpersonationSessionEndedPayload;
  AnalyticsSnapshotUpdated: AnalyticsSnapshotUpdatedPayload;
}

export type EventName = keyof EventPayloadMap;

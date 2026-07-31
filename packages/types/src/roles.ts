// Role matrix per SRS Part 4.1. Master Administrator is the only role with cross-store authority.
export type Role =
  | "MASTER_ADMIN"
  | "STORE_OWNER"
  | "STORE_MANAGER"
  | "INVENTORY_MANAGER"
  | "ORDER_MANAGER"
  | "CUSTOMER_SUPPORT";

export const STORE_SCOPED_ROLES: Role[] = [
  "STORE_OWNER",
  "STORE_MANAGER",
  "INVENTORY_MANAGER",
  "ORDER_MANAGER",
  "CUSTOMER_SUPPORT",
];

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  // null only for MASTER_ADMIN, per SRS Part 4/20.1 (User belongs to zero or one Store)
  storeId: string | null;
}

import { z } from "zod";

// Per Part D.1.1/D.1.6 - Store Owner (or Master Administrator, Part 7.5) may
// only invite or reassign staff into these four roles; Store Owner and
// Master Administrator are never assignable through either endpoint.
export const reassignableRoles = ["STORE_MANAGER", "INVENTORY_MANAGER", "ORDER_MANAGER", "CUSTOMER_SUPPORT"] as const;

export const inviteStaffSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1, "Name is required"),
  role: z.enum(reassignableRoles),
});
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;

export const assignRoleSchema = z.object({
  role: z.enum(reassignableRoles),
});
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;

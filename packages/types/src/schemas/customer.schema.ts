import { z } from "zod";
import { PHONE_PATTERN } from "./store.schema";

// Storefront customer accounts. A customer account is scoped to ONE store
// (Customer's own @@unique([storeId, phone])) - the same phone number is a
// separate account in every store, exactly like guest customers already
// were. Phone is the identifier, matching how the rest of the platform
// (COD confirmation calls, Track Order) already identifies customers.
export const customerSignupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: z.string().trim().regex(PHONE_PATTERN, "Enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});
export type CustomerSignupInput = z.infer<typeof customerSignupSchema>;

export const customerLoginSchema = z.object({
  phone: z.string().trim().min(1, "Phone number is required"),
  password: z.string().min(1, "Password is required"),
});
export type CustomerLoginInput = z.infer<typeof customerLoginSchema>;

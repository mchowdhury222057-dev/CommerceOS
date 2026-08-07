import { z } from "zod";

export const SLUG_PATTERN = /^[a-z0-9-]+$/;

export const createStoreSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  slug: z.string().regex(SLUG_PATTERN, "Lowercase letters, numbers, and hyphens only"),
  ownerEmail: z.string().email(),
  ownerName: z.string().min(1, "Owner name is required"),
});
export type CreateStoreInput = z.infer<typeof createStoreSchema>;

export const suspendStoreSchema = z.object({
  reason: z.string().min(1, "A suspension reason is required"),
});
export type SuspendStoreInput = z.infer<typeof suspendStoreSchema>;

// Per Part 6.1 - the self-signup path: a prospective Store Owner creates
// their own account and their store's shell in one step. Reuses the exact
// same SLUG_PATTERN as createStoreSchema so both entry points enforce
// identical slug rules.
export const signupSchema = z.object({
  storeName: z.string().min(2, "Store name must be at least 2 characters").max(200),
  slug: z.string().regex(SLUG_PATTERN, "Lowercase letters, numbers, and hyphens only"),
  ownerName: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type SignupInput = z.infer<typeof signupSchema>;

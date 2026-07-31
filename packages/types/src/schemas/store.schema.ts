import { z } from "zod";

const SLUG_PATTERN = /^[a-z0-9-]+$/;

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

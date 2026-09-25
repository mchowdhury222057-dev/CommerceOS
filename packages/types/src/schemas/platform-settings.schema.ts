import { z } from "zod";

// Admin Panel "Platform Settings" milestone - every field here maps
// directly to a real PlatformSettings column (packages/prisma/prisma/
// schema.prisma); no field exists here that the backend can't actually
// store and use.
export const updatePlatformSettingsSchema = z.object({
  platformName: z.string().min(1, "Platform name is required").max(100).optional(),
  platformLogoUrl: z.string().url("Must be a valid URL").nullish(),
  platformDescription: z.string().max(500).nullish(),
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().max(500).nullish(),
});
export type UpdatePlatformSettingsInput = z.infer<typeof updatePlatformSettingsSchema>;

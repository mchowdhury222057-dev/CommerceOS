import { z } from "zod";

// Per this milestone's brief - a simplified stand-in for Part 7.2's full
// section/block layout tree (explicitly out of scope). See
// SimplifiedStorefrontLayout in store.ts for the corresponding type.
export const storefrontLayoutSchema = z.object({
  heroHeading: z.string().min(1, "Hero heading is required").max(200),
  heroSubheading: z.string().max(300).default(""),
  heroImageUrl: z.string().url().nullish(),
  showFeaturedProducts: z.boolean().default(true),
});

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color, e.g. #4F46E5");

export const themeSettingsSchema = z.object({
  colorPrimary: hexColor,
  colorSecondary: hexColor,
  colorAccent: hexColor,
  colorBackground: hexColor,
  fontHeading: z.string().min(1).max(100),
  fontBody: z.string().min(1).max(100),
  logoUrl: z.string().url().nullish(),
  faviconUrl: z.string().url().nullish(),
  // Store-configurable range per Part A.6.1.
  cornerRadius: z.number().int().min(0).max(24),
});

// Both PUT .../theme fields are optional and independently patchable - the
// editor autosaves the draft as the Master Admin edits either panel.
export const updateThemeDraftSchema = z.object({
  layout: storefrontLayoutSchema.partial().optional(),
  themeSettings: themeSettingsSchema.partial().optional(),
});
export type UpdateThemeDraftInput = z.infer<typeof updateThemeDraftSchema>;

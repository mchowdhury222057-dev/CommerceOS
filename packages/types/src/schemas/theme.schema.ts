import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color, e.g. #4F46E5");

export const themeSettingsSchema = z.object({
  preset: z.string().min(1).max(50),
  colorPrimary: hexColor,
  colorSecondary: hexColor,
  colorAccent: hexColor,
  colorBackground: hexColor,
  colorSurface: hexColor,
  colorText: hexColor,
  colorTextMuted: hexColor,
  fontHeading: z.string().min(1).max(100),
  fontBody: z.string().min(1).max(100),
  logoUrl: z.string().url().nullish(),
  faviconUrl: z.string().url().nullish(),
  // Store-configurable range per Part A.6.1.
  cornerRadius: z.number().int().min(0).max(24),
  buttonStyle: z.enum(["rounded", "square", "pill"]),
  containerWidth: z.number().int().min(960).max(1600),
  sectionSpacing: z.enum(["compact", "comfortable", "spacious"]),
  productCardStyle: z.enum(["minimal", "bordered", "shadow"]),
});

// Per Section 9 - a flat, reorderable list of typed sections rather than
// Part 7.2's full arbitrary block tree (Section 33 explicitly rules that
// out). `settings` is intentionally a loose record here: each section
// type's concrete shape (HeroSectionSettings, etc. in @commerceos/types)
// is enforced by the admin editor's own form fields, not re-validated
// field-by-field server-side - the same trust boundary already used for
// Product.variants[].attributes (also a free-form Json bag edited only
// through the admin's own UI).
const themeSectionSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(["hero", "featured-categories", "featured-products", "product-grid", "promo-banner", "trust", "newsletter"]),
  enabled: z.boolean(),
  settings: z.record(z.string(), z.unknown()),
});

const announcementBarSchema = z.object({
  enabled: z.boolean(),
  text: z.string().max(200),
  backgroundColor: hexColor,
  textColor: hexColor,
  // .nullable() (not .nullish()) - the editor always sends the complete
  // announcementBar object when saving (Partial<SimplifiedStorefrontLayout>
  // is only shallow-partial at the top level), so "no link" is expressed
  // as null, never an omitted key.
  link: z.string().max(500).nullable(),
  linkText: z.string().max(50).nullable(),
});

const headerSettingsSchema = z.object({ showSearch: z.boolean() });

const footerSettingsSchema = z.object({
  description: z.string().max(500),
  contactEmail: z.string().max(200),
  showSocialLinks: z.boolean(),
});

export const storefrontLayoutSchema = z.object({
  announcementBar: announcementBarSchema,
  header: headerSettingsSchema,
  sections: z.array(themeSectionSchema).max(20),
  footer: footerSettingsSchema,
});

// Both PUT .../theme fields are optional and independently patchable - the
// editor autosaves the draft as the Master Admin edits either panel.
export const updateThemeDraftSchema = z.object({
  layout: storefrontLayoutSchema.partial().optional(),
  themeSettings: themeSettingsSchema.partial().optional(),
});
export type UpdateThemeDraftInput = z.infer<typeof updateThemeDraftSchema>;

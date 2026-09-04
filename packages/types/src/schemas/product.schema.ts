import { z } from "zod";

const SLUG_PATTERN = /^[a-z0-9-]+$/;

export const productVariantSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  attributes: z.record(z.string(), z.string()),
  stock: z.number().int().nonnegative(),
  priceOverride: z.number().positive().nullish(),
});
export type ProductVariantInput = z.infer<typeof productVariantSchema>;

export const createProductSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  description: z.string().max(5000),
  categoryId: z.string().nullish(),
  basePrice: z.number().positive("Price must be greater than zero"),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  metaTitle: z.string().max(70).nullish(),
  metaDescription: z.string().max(160).nullish(),
  slug: z.string().regex(SLUG_PATTERN, "Lowercase letters, numbers, and hyphens only"),
  lowStockThreshold: z.number().int().nonnegative().optional(),
  variants: z.array(productVariantSchema).min(1, "Add at least one variant"),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

// Deliberately omits `variants` - updateProduct() only ever writes
// product-level fields; variant changes go through the dedicated
// add/update/delete-variant endpoints below, each scoped to one variant at
// a time rather than a whole-array replace.
export const updateProductSchema = createProductSchema.omit({ variants: true }).partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const createVariantSchema = productVariantSchema;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;

export const updateVariantSchema = z.object({
  attributes: z.record(z.string(), z.string()).optional(),
  stock: z.number().int().nonnegative().optional(),
  priceOverride: z.number().positive().nullish(),
  isActive: z.boolean().optional(),
});
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;

// Per Part 8.1 - image upload itself is multipart/form-data (handled by
// multer, not JSON), but reordering and alt-text edits are plain JSON PATCH
// requests against an already-uploaded image row.
export const updateImageSchema = z.object({
  displayOrder: z.number().int().nonnegative().optional(),
  altText: z.string().max(200).nullish(),
});
export type UpdateImageInput = z.infer<typeof updateImageSchema>;

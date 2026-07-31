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
  images: z.array(z.string()).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  metaTitle: z.string().max(70).nullish(),
  metaDescription: z.string().max(160).nullish(),
  slug: z.string().regex(SLUG_PATTERN, "Lowercase letters, numbers, and hyphens only"),
  lowStockThreshold: z.number().int().nonnegative().optional(),
  variants: z.array(productVariantSchema).min(1, "Add at least one variant"),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

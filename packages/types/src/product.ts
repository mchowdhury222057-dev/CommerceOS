// Per SRS Part 8.1
export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  attributes: Record<string, string>; // e.g. { size: "M", color: "Red" }
  stock: number;
  priceOverride: number | null;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string;
  categoryId: string | null;
  basePrice: number;
  images: string[];
  variants: ProductVariant[];
  status: ProductStatus;
  metaTitle: string | null;
  metaDescription: string | null;
  slug: string;
  lowStockThreshold: number;
}

export interface Category {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  parentCategoryId: string | null;
}

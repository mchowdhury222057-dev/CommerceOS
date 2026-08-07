import { api } from "../lib/api-client";
import type { Category, Product, ProductImage, ProductStatus, ProductVariant } from "../lib/api-types";

export interface ListProductsResult {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export function listProducts(storeId: string, filters: { status?: ProductStatus[]; search?: string } = {}): Promise<ListProductsResult> {
  const query = new URLSearchParams();
  if (filters.status?.length) query.set("status", filters.status.join(","));
  if (filters.search) query.set("search", filters.search);
  const qs = query.toString();
  return api.get<ListProductsResult>(`/api/store/${storeId}/products${qs ? `?${qs}` : ""}`);
}

export function getProduct(storeId: string, productId: string): Promise<{ product: Product }> {
  return api.get<{ product: Product }>(`/api/store/${storeId}/products/${productId}`);
}

export function listCategories(storeId: string): Promise<{ categories: Category[] }> {
  return api.get<{ categories: Category[] }>(`/api/store/${storeId}/products/categories`);
}

export interface VariantInput {
  sku: string;
  attributes: Record<string, string>;
  stock: number;
  priceOverride?: number | null;
}

export interface CreateProductInput {
  name: string;
  description: string;
  categoryId?: string | null;
  basePrice: number;
  status?: ProductStatus;
  slug: string;
  variants: VariantInput[];
}

export function createProduct(storeId: string, input: CreateProductInput): Promise<{ product: Product }> {
  return api.post<{ product: Product }>(`/api/store/${storeId}/products`, input);
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  categoryId?: string | null;
  basePrice?: number;
  status?: ProductStatus;
  slug?: string;
}

export function updateProduct(storeId: string, productId: string, input: UpdateProductInput): Promise<{ product: Product }> {
  return api.patch<{ product: Product }>(`/api/store/${storeId}/products/${productId}`, input);
}

export function archiveProduct(storeId: string, productId: string): Promise<{ product: Product }> {
  return api.delete<{ product: Product }>(`/api/store/${storeId}/products/${productId}`);
}

export function addVariant(storeId: string, productId: string, input: VariantInput): Promise<{ variant: ProductVariant }> {
  return api.post<{ variant: ProductVariant }>(`/api/store/${storeId}/products/${productId}/variants`, input);
}

export interface UpdateVariantInput {
  attributes?: Record<string, string>;
  stock?: number;
  priceOverride?: number | null;
  isActive?: boolean;
}

export function updateVariant(
  storeId: string,
  productId: string,
  variantId: string,
  input: UpdateVariantInput,
): Promise<{ variant: ProductVariant }> {
  return api.patch<{ variant: ProductVariant }>(`/api/store/${storeId}/products/${productId}/variants/${variantId}`, input);
}

export function deleteVariant(
  storeId: string,
  productId: string,
  variantId: string,
): Promise<{ deleted: boolean; variant: { id: string; isActive: boolean } }> {
  return api.delete(`/api/store/${storeId}/products/${productId}/variants/${variantId}`);
}

export function uploadProductImage(storeId: string, productId: string, file: File): Promise<{ image: ProductImage }> {
  const formData = new FormData();
  formData.append("image", file);
  return api.post<{ image: ProductImage }>(`/api/store/${storeId}/products/${productId}/images`, formData);
}

export function updateProductImage(
  storeId: string,
  productId: string,
  imageId: string,
  input: { displayOrder?: number; altText?: string | null },
): Promise<{ image: ProductImage }> {
  return api.patch<{ image: ProductImage }>(`/api/store/${storeId}/products/${productId}/images/${imageId}`, input);
}

export function deleteProductImage(storeId: string, productId: string, imageId: string): Promise<void> {
  return api.delete(`/api/store/${storeId}/products/${productId}/images/${imageId}`);
}

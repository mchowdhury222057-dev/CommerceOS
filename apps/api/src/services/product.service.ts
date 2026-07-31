import { Prisma, type Product, type ProductStatus } from "@commerceos/prisma/generated/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { emit } from "../events/bus.js";

export interface ProductListFilters {
  status?: ProductStatus[];
  categoryId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listProducts(storeId: string, filters: ProductListFilters = {}) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 25;

  const where: Prisma.ProductWhereInput = {
    storeId,
    status: filters.status?.length ? { in: filters.status } : undefined,
    categoryId: filters.categoryId,
    name: filters.search ? { contains: filters.search, mode: "insensitive" } : undefined,
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { variants: true, category: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total, page, pageSize };
}

export async function getProduct(storeId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, storeId },
    include: { variants: true, category: true },
  });
  if (!product) throw AppError.notFound(`Product ${productId} not found`);
  return product;
}

export interface ProductVariantInput {
  sku: string;
  attributes: Record<string, string>;
  stock: number;
  priceOverride?: number | null;
}

export interface CreateProductInput {
  storeId: string;
  name: string;
  description: string;
  categoryId?: string | null;
  basePrice: number;
  images?: string[];
  status?: ProductStatus;
  metaTitle?: string | null;
  metaDescription?: string | null;
  slug: string;
  lowStockThreshold?: number;
  variants: ProductVariantInput[];
}

async function assertCategoryBelongsToStore(storeId: string, categoryId: string | null | undefined) {
  if (!categoryId) return;
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  // Cross-tenant category assignment is a hard failure (Part 6.3), not a
  // filtered or silent success.
  if (!category || category.storeId !== storeId) {
    throw AppError.forbidden(`Category ${categoryId} does not belong to this store`, "CROSS_TENANT_REFERENCE");
  }
}

function assertActivationRequirements(status: ProductStatus, basePrice: number, variants: ProductVariantInput[]) {
  if (status !== "ACTIVE") return;
  // Part D.3.1 - a Draft-status product is never returned to the public
  // Storefront; Active requires at least one variant with non-negative stock
  // and a resolvable price.
  const hasValidVariant = variants.some((v) => v.stock >= 0 && (v.priceOverride ?? basePrice) > 0);
  if (variants.length === 0 || !hasValidVariant) {
    throw AppError.validation(
      "An Active product requires at least one variant with non-negative stock and a price",
      "ACTIVATION_REQUIREMENTS_NOT_MET",
    );
  }
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  await assertCategoryBelongsToStore(input.storeId, input.categoryId);
  const status = input.status ?? "DRAFT";
  assertActivationRequirements(status, input.basePrice, input.variants);

  try {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          storeId: input.storeId,
          name: input.name,
          description: input.description,
          categoryId: input.categoryId ?? null,
          basePrice: new Prisma.Decimal(input.basePrice),
          images: input.images ?? [],
          status,
          metaTitle: input.metaTitle ?? null,
          metaDescription: input.metaDescription ?? null,
          slug: input.slug,
          lowStockThreshold: input.lowStockThreshold ?? 5,
          variants: {
            create: input.variants.map((v) => ({
              sku: v.sku,
              attributes: v.attributes,
              stock: v.stock,
              priceOverride: v.priceOverride != null ? new Prisma.Decimal(v.priceOverride) : null,
            })),
          },
        },
      });
      return created;
    });

    emit("ProductCreated", {
      storeId: input.storeId,
      actorId: null,
      payload: { productId: product.id, status: product.status },
    });

    return product;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw AppError.conflict("A product with this slug already exists in this store", "DUPLICATE_SLUG");
    }
    throw error;
  }
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  categoryId?: string | null;
  basePrice?: number;
  images?: string[];
  status?: ProductStatus;
  metaTitle?: string | null;
  metaDescription?: string | null;
  slug?: string;
  lowStockThreshold?: number;
}

export async function updateProduct(storeId: string, productId: string, input: UpdateProductInput): Promise<Product> {
  const existing = await getProduct(storeId, productId);

  if (input.categoryId !== undefined) {
    await assertCategoryBelongsToStore(storeId, input.categoryId);
  }

  const nextStatus = input.status ?? existing.status;
  const nextBasePrice = input.basePrice ?? existing.basePrice.toNumber();
  if (input.status === "ACTIVE" || (nextStatus === "ACTIVE" && input.basePrice !== undefined)) {
    assertActivationRequirements(
      nextStatus,
      nextBasePrice,
      existing.variants.map((v) => ({
        sku: v.sku,
        attributes: v.attributes as Record<string, string>,
        stock: v.stock,
        priceOverride: v.priceOverride?.toNumber() ?? null,
      })),
    );
  }

  try {
    return await prisma.product.update({
      where: { id: productId },
      data: {
        name: input.name,
        description: input.description,
        categoryId: input.categoryId,
        basePrice: input.basePrice !== undefined ? new Prisma.Decimal(input.basePrice) : undefined,
        images: input.images,
        status: input.status,
        metaTitle: input.metaTitle,
        metaDescription: input.metaDescription,
        slug: input.slug,
        lowStockThreshold: input.lowStockThreshold,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw AppError.conflict("A product with this slug already exists in this store", "DUPLICATE_SLUG");
    }
    throw error;
  }
}

// Archiving never deletes a product or its historical OrderItem references,
// preserving order-history integrity (Part D.3.1).
export async function archiveProduct(storeId: string, productId: string): Promise<Product> {
  await getProduct(storeId, productId);
  return prisma.product.update({ where: { id: productId }, data: { status: "ARCHIVED" } });
}

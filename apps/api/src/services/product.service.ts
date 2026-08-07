import { Prisma, type Product, type ProductStatus } from "@commerceos/prisma/generated/client";
import type { AuthUser } from "@commerceos/types";
import { prisma } from "../lib/prisma.js";
import { cloudinary } from "../lib/cloudinary.js";
import { AppError } from "../lib/errors.js";
import { emit } from "../events/bus.js";
import { writeAuditLog } from "../lib/audit.js";

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
      include: { variants: true, category: true, images: { orderBy: { displayOrder: "asc" } } },
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
    include: { variants: true, category: true, images: { orderBy: { displayOrder: "asc" } } },
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

export async function createProduct(input: CreateProductInput, actor: AuthUser): Promise<Product> {
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

    // Per Part 7.5/18.2 - Store Owner (and staff) catalog actions are
    // audited the same way Master Admin actions already are (Part 15.3),
    // so platform-wide oversight isn't blind to day-to-day store activity.
    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "ProductCreated",
      targetStoreId: input.storeId,
      targetResource: `Product:${product.id}`,
      metadata: { productName: product.name },
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
  status?: ProductStatus;
  metaTitle?: string | null;
  metaDescription?: string | null;
  slug?: string;
  lowStockThreshold?: number;
}

export async function updateProduct(storeId: string, productId: string, input: UpdateProductInput, actor: AuthUser): Promise<Product> {
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
    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        name: input.name,
        description: input.description,
        categoryId: input.categoryId,
        basePrice: input.basePrice !== undefined ? new Prisma.Decimal(input.basePrice) : undefined,
        status: input.status,
        metaTitle: input.metaTitle,
        metaDescription: input.metaDescription,
        slug: input.slug,
        lowStockThreshold: input.lowStockThreshold,
      },
    });

    // Per Part 7.5/18.2 - a status change (e.g. reactivating an Archived
    // product) is the single most operationally significant field here, so
    // it's called out explicitly in the metadata rather than just "some
    // fields changed."
    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "ProductUpdated",
      targetStoreId: storeId,
      targetResource: `Product:${productId}`,
      metadata: {
        productName: updated.name,
        changedFields: Object.keys(input),
        ...(input.status && input.status !== existing.status
          ? { previousStatus: existing.status, newStatus: input.status }
          : {}),
      },
    });

    return updated;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw AppError.conflict("A product with this slug already exists in this store", "DUPLICATE_SLUG");
    }
    throw error;
  }
}

// Archiving never deletes a product or its historical OrderItem references,
// preserving order-history integrity (Part D.3.1).
export async function archiveProduct(storeId: string, productId: string, actor: AuthUser): Promise<Product> {
  const existing = await getProduct(storeId, productId);
  const updated = await prisma.product.update({ where: { id: productId }, data: { status: "ARCHIVED" } });

  await writeAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    action: "ProductDeactivated",
    targetStoreId: storeId,
    targetResource: `Product:${productId}`,
    metadata: { productName: existing.name },
  });

  return updated;
}

// Per Part 8.1 - selection only; category creation/management is a
// separate, out-of-scope milestone. Read-only, so no role restriction
// beyond the same VIEW_ROLES the product list already uses.
export async function listCategories(storeId: string) {
  return prisma.category.findMany({ where: { storeId }, orderBy: { name: "asc" } });
}

async function assertProductBelongsToStore(storeId: string, productId: string) {
  const product = await prisma.product.findFirst({ where: { id: productId, storeId } });
  if (!product) throw AppError.notFound(`Product ${productId} not found`);
  return product;
}

// Per Part 8.1 - adds a new variant to an existing product (e.g. a new
// color becomes available later); does not touch the product's own fields.
export async function addVariant(storeId: string, productId: string, input: ProductVariantInput) {
  await assertProductBelongsToStore(storeId, productId);
  try {
    return await prisma.productVariant.create({
      data: {
        productId,
        sku: input.sku,
        attributes: input.attributes,
        stock: input.stock,
        priceOverride: input.priceOverride != null ? new Prisma.Decimal(input.priceOverride) : null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw AppError.conflict(`SKU "${input.sku}" is already in use`, "DUPLICATE_SKU");
    }
    throw error;
  }
}

export interface UpdateVariantInput {
  attributes?: Record<string, string>;
  stock?: number;
  priceOverride?: number | null;
  isActive?: boolean;
}

export async function updateVariant(storeId: string, productId: string, variantId: string, input: UpdateVariantInput, actor: AuthUser) {
  const product = await assertProductBelongsToStore(storeId, productId);
  const variant = await prisma.productVariant.findFirst({ where: { id: variantId, productId } });
  if (!variant) throw AppError.notFound(`Variant ${variantId} not found on this product`);

  const updated = await prisma.productVariant.update({
    where: { id: variantId },
    data: {
      attributes: input.attributes,
      stock: input.stock,
      priceOverride: input.priceOverride === undefined ? undefined : input.priceOverride === null ? null : new Prisma.Decimal(input.priceOverride),
      isActive: input.isActive,
    },
  });

  // Per Part 8.3/18.2 - logged as its own action distinct from a generic
  // product edit, since inventory levels are operationally significant
  // enough that the Master Admin's Store Activity view should be able to
  // show stock changes specifically, not bury them in "product updated."
  if (input.stock !== undefined && input.stock !== variant.stock) {
    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "ProductStockAdjusted",
      targetStoreId: storeId,
      targetResource: `Product:${productId}`,
      metadata: { productName: product.name, sku: variant.sku, previousStock: variant.stock, newStock: input.stock },
    });
  }

  return updated;
}

export interface DeleteVariantResult {
  deleted: boolean;
  variant: { id: string; isActive: boolean };
}

// Per Part 8.1 - a variant referenced by any historical OrderItem can never
// be hard-deleted (would corrupt that order's own line-item record); it is
// deactivated instead, which the public storefront already treats as
// unavailable. A never-ordered variant is genuinely removed, since there is
// no historical data to protect.
export async function deleteOrDeactivateVariant(storeId: string, productId: string, variantId: string): Promise<DeleteVariantResult> {
  await assertProductBelongsToStore(storeId, productId);
  const variant = await prisma.productVariant.findFirst({ where: { id: variantId, productId } });
  if (!variant) throw AppError.notFound(`Variant ${variantId} not found on this product`);

  const hasBeenOrdered = await prisma.orderItem.findFirst({ where: { variantId } });
  if (hasBeenOrdered) {
    const deactivated = await prisma.productVariant.update({ where: { id: variantId }, data: { isActive: false } });
    return { deleted: false, variant: { id: deactivated.id, isActive: deactivated.isActive } };
  }

  await prisma.productVariant.delete({ where: { id: variantId } });
  return { deleted: true, variant: { id: variantId, isActive: false } };
}

export interface AddProductImageInput {
  url: string;
  cloudinaryPublicId: string;
  altText?: string | null;
}

// Per Part 8.1 - the uploaded file itself is handled by multer + the
// Cloudinary SDK in the route handler; this just records the result.
// New images append to the end (max existing displayOrder + 1) so
// uploading never silently reorders images the Store Owner already
// arranged.
export async function addProductImage(storeId: string, productId: string, input: AddProductImageInput, actor: AuthUser) {
  const product = await assertProductBelongsToStore(storeId, productId);
  const last = await prisma.productImage.findFirst({ where: { productId }, orderBy: { displayOrder: "desc" } });

  const image = await prisma.productImage.create({
    data: {
      productId,
      url: input.url,
      cloudinaryPublicId: input.cloudinaryPublicId,
      altText: input.altText ?? null,
      displayOrder: (last?.displayOrder ?? -1) + 1,
    },
  });

  await writeAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    action: "ProductImageUploaded",
    targetStoreId: storeId,
    targetResource: `Product:${productId}`,
    metadata: { productName: product.name, imageId: image.id },
  });

  return image;
}

export interface UpdateProductImageInput {
  displayOrder?: number;
  altText?: string | null;
}

export async function updateProductImage(storeId: string, productId: string, imageId: string, input: UpdateProductImageInput) {
  await assertProductBelongsToStore(storeId, productId);
  const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
  if (!image) throw AppError.notFound(`Image ${imageId} not found on this product`);

  return prisma.productImage.update({
    where: { id: imageId },
    data: { displayOrder: input.displayOrder, altText: input.altText },
  });
}

// Per Part 8.1 - removes the asset from Cloudinary itself (uploader.destroy),
// not just the DB row, so deleting an image doesn't leave it orphaned in
// storage. Unlike variants/products, an image carries no historical
// reference (OrderItem points at the Product/Variant, never at a specific
// photo), so this is always a genuine delete, never a soft-deactivate.
export async function deleteProductImage(storeId: string, productId: string, imageId: string, actor: AuthUser): Promise<void> {
  const product = await assertProductBelongsToStore(storeId, productId);
  const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
  if (!image) throw AppError.notFound(`Image ${imageId} not found on this product`);

  await cloudinary.uploader.destroy(image.cloudinaryPublicId).catch(() => {
    // Cloudinary-side failure (e.g. already removed) must not block removing
    // the DB row - a dangling remote asset is a harmless leak; a DB row
    // pointing at nothing is a visible bug.
  });
  await prisma.productImage.delete({ where: { id: imageId } });

  await writeAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    action: "ProductImageRemoved",
    targetStoreId: storeId,
    targetResource: `Product:${productId}`,
    metadata: { productName: product.name },
  });
}

import { Router } from "express";
import type { ProductStatus } from "@commerceos/prisma/generated/client";
import {
  createProductSchema,
  createVariantSchema,
  updateImageSchema,
  updateProductSchema,
  updateVariantSchema,
  type CreateProductInput,
  type CreateVariantInput,
  type UpdateImageInput,
  type UpdateProductInput,
  type UpdateVariantInput,
} from "@commerceos/types";
import { getAuthUser, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { uploadImage } from "../middleware/upload.js";
import { validateBody } from "../middleware/validate.js";
import { uploadImageBuffer } from "../lib/cloudinary.js";
import { AppError } from "../lib/errors.js";
import {
  addProductImage,
  addVariant,
  archiveProduct,
  createProduct,
  deleteOrDeactivateVariant,
  deleteProductImage,
  getProduct,
  listCategories,
  listProducts,
  updateProduct,
  updateProductImage,
  updateVariant,
} from "../services/product.service.js";

// Per SRS Part 21 - /api/store/:storeId/products group.
export const productsRouter = Router({ mergeParams: true });

// Per Part 4.1: Inventory Manager's defining capability is product/stock
// data; Customer Support is view-only; Order Manager has no access here.
const VIEW_ROLES = ["STORE_OWNER", "STORE_MANAGER", "INVENTORY_MANAGER", "CUSTOMER_SUPPORT"] as const;
const MANAGE_ROLES = ["STORE_OWNER", "STORE_MANAGER", "INVENTORY_MANAGER"] as const;

// Per Part 8.1 - selection only on the product form; category management
// itself is out of scope this round.
productsRouter.get(
  "/categories",
  requireRole(...VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const categories = await listCategories(req.params.storeId);
    res.json({ categories });
  }),
);

productsRouter.get(
  "/",
  requireRole(...VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? (req.query.status.split(",") as ProductStatus[]) : undefined;
    const categoryId = typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
    const result = await listProducts(req.params.storeId, { status, categoryId, search, page, pageSize });
    res.json(result);
  }),
);

productsRouter.get(
  "/:productId",
  requireRole(...VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const product = await getProduct(req.params.storeId, req.params.productId);
    res.json({ product });
  }),
);

productsRouter.post(
  "/",
  requireRole(...MANAGE_ROLES),
  validateBody(createProductSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as CreateProductInput;
    const product = await createProduct({ storeId: req.params.storeId, ...body }, getAuthUser(req));
    res.status(201).json({ product });
  }),
);

productsRouter.patch(
  "/:productId",
  requireRole(...MANAGE_ROLES),
  validateBody(updateProductSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as UpdateProductInput;
    const product = await updateProduct(req.params.storeId, req.params.productId, body, getAuthUser(req));
    res.json({ product });
  }),
);

// Per Part D.3.1 - archiving, never a hard delete; historical OrderItem
// references and order-history integrity are preserved.
productsRouter.delete(
  "/:productId",
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const product = await archiveProduct(req.params.storeId, req.params.productId, getAuthUser(req));
    res.json({ product });
  }),
);

productsRouter.post(
  "/:productId/variants",
  requireRole(...MANAGE_ROLES),
  validateBody(createVariantSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as CreateVariantInput;
    const variant = await addVariant(req.params.storeId, req.params.productId, body);
    res.status(201).json({ variant });
  }),
);

productsRouter.patch(
  "/:productId/variants/:variantId",
  requireRole(...MANAGE_ROLES),
  validateBody(updateVariantSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as UpdateVariantInput;
    const variant = await updateVariant(req.params.storeId, req.params.productId, req.params.variantId, body, getAuthUser(req));
    res.json({ variant });
  }),
);

// Per Part 8.1 - deletes only if never ordered; otherwise deactivates
// (isActive: false) so historical OrderItem data stays intact. The response
// tells the caller which actually happened so the UI can show the right
// message rather than assuming a hard delete succeeded.
productsRouter.delete(
  "/:productId/variants/:variantId",
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const result = await deleteOrDeactivateVariant(req.params.storeId, req.params.productId, req.params.variantId);
    res.json(result);
  }),
);

// Per Part 8.1 - multer parses the multipart upload into req.file (memory
// buffer, never written to local disk); the buffer is streamed straight to
// Cloudinary before a ProductImage row is created with the returned URL.
productsRouter.post(
  "/:productId/images",
  requireRole(...MANAGE_ROLES),
  uploadImage,
  asyncHandler(async (req, res) => {
    if (!req.file) throw AppError.validation("An image file is required", "IMAGE_REQUIRED");
    const uploadResult = await uploadImageBuffer(req.file.buffer, `commerceos/${req.params.storeId}/products`);
    const image = await addProductImage(
      req.params.storeId,
      req.params.productId,
      { url: uploadResult.secure_url, cloudinaryPublicId: uploadResult.public_id },
      getAuthUser(req),
    );
    res.status(201).json({ image });
  }),
);

productsRouter.patch(
  "/:productId/images/:imageId",
  requireRole(...MANAGE_ROLES),
  validateBody(updateImageSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as UpdateImageInput;
    const image = await updateProductImage(req.params.storeId, req.params.productId, req.params.imageId, body);
    res.json({ image });
  }),
);

productsRouter.delete(
  "/:productId/images/:imageId",
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    await deleteProductImage(req.params.storeId, req.params.productId, req.params.imageId, getAuthUser(req));
    res.status(204).send();
  }),
);

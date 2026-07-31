import { Router } from "express";
import type { ProductStatus } from "@commerceos/prisma/generated/client";
import { createProductSchema, updateProductSchema, type CreateProductInput, type UpdateProductInput } from "@commerceos/types";
import { requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { validateBody } from "../middleware/validate.js";
import { archiveProduct, createProduct, getProduct, listProducts, updateProduct } from "../services/product.service.js";

// Per SRS Part 21 - /api/store/:storeId/products group.
export const productsRouter = Router({ mergeParams: true });

// Per Part 4.1: Inventory Manager's defining capability is product/stock
// data; Customer Support is view-only; Order Manager has no access here.
const VIEW_ROLES = ["STORE_OWNER", "STORE_MANAGER", "INVENTORY_MANAGER", "CUSTOMER_SUPPORT"] as const;
const MANAGE_ROLES = ["STORE_OWNER", "STORE_MANAGER", "INVENTORY_MANAGER"] as const;

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
    const product = await createProduct({ storeId: req.params.storeId, ...body });
    res.status(201).json({ product });
  }),
);

productsRouter.patch(
  "/:productId",
  requireRole(...MANAGE_ROLES),
  validateBody(updateProductSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as UpdateProductInput;
    const product = await updateProduct(req.params.storeId, req.params.productId, body);
    res.json({ product });
  }),
);

// Per Part D.3.1 - archiving, never a hard delete; historical OrderItem
// references and order-history integrity are preserved.
productsRouter.delete(
  "/:productId",
  requireRole(...MANAGE_ROLES),
  asyncHandler(async (req, res) => {
    const product = await archiveProduct(req.params.storeId, req.params.productId);
    res.json({ product });
  }),
);

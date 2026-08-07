import { Router } from "express";
import { checkoutSchema, type CheckoutInput } from "@commerceos/types";
import { AppError } from "../lib/errors.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { validateBody } from "../middleware/validate.js";
import { placeOrder } from "../services/order.service.js";
import {
  getPublicProduct,
  getPublicStoreInfo,
  listPublicProducts,
  lookupOrdersByPhone,
  resolveActiveStore,
} from "../services/storefront.service.js";

// Per SRS Part 21 - /api/storefront/:storeSlug/* endpoint group. Public,
// customer-facing; no staff authentication is required or accepted here.
export const storefrontRouter = Router({ mergeParams: true });

storefrontRouter.get(
  "/:storeSlug",
  asyncHandler(async (req, res) => {
    const info = await getPublicStoreInfo(req.params.storeSlug);
    res.json(info);
  }),
);

storefrontRouter.get(
  "/:storeSlug/products",
  asyncHandler(async (req, res) => {
    const store = await resolveActiveStore(req.params.storeSlug);
    const products = await listPublicProducts(store.id);
    res.json({ products });
  }),
);

storefrontRouter.get(
  "/:storeSlug/products/:productId",
  asyncHandler(async (req, res) => {
    const store = await resolveActiveStore(req.params.storeSlug);
    const product = await getPublicProduct(store.id, req.params.productId);
    res.json({ product });
  }),
);

// Per Part 10.1 - the only "lookup credential" is the phone number itself;
// there is no OTP/password gate in V1.
storefrontRouter.get(
  "/:storeSlug/orders",
  asyncHandler(async (req, res) => {
    const phone = typeof req.query.phone === "string" ? req.query.phone.trim() : "";
    if (!phone) throw AppError.validation("A phone number is required", "PHONE_REQUIRED");
    const store = await resolveActiveStore(req.params.storeSlug);
    const orders = await lookupOrdersByPhone(store.id, phone);
    res.json({ orders });
  }),
);

storefrontRouter.post(
  "/:storeSlug/checkout",
  validateBody(checkoutSchema),
  asyncHandler(async (req, res) => {
    const store = await resolveActiveStore(req.params.storeSlug);

    const { customerName, customerPhone, deliveryAddress, deliveryAreaId, customerNote, items } =
      req.body as CheckoutInput;
    const order = await placeOrder({
      storeId: store.id,
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryAreaId,
      customerNote,
      items,
    });

    res.status(201).json({ order });
  }),
);

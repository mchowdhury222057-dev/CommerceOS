import { Router } from "express";
import {
  checkoutSchema,
  customerLoginSchema,
  customerSignupSchema,
  type CheckoutInput,
  type CustomerLoginInput,
  type CustomerSignupInput,
} from "@commerceos/types";
import { AppError } from "../lib/errors.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { validateBody } from "../middleware/validate.js";
import { authenticateCustomer } from "../middleware/customer-auth.js";
import { customerLoginRateLimiter, customerSignupRateLimiter } from "../middleware/rate-limit.js";
import { placeOrder } from "../services/order.service.js";
import { getMaintenanceStatus } from "../services/platform-settings.service.js";
import { getCustomerAccount, loginCustomer, signupCustomer } from "../services/customer-auth.service.js";
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

// Platform Settings' Maintenance Mode - the one place it actually changes
// behavior (not just a flag nobody reads). Scoped to the public,
// customer-facing storefront only; Store Owner/Master Admin routes stay
// reachable so an admin can turn maintenance mode back off. Fails open
// (503 only on an explicit maintenanceMode: true) rather than open-by-
// default if the settings lookup itself errors.
storefrontRouter.use(
  asyncHandler(async (_req, res, next) => {
    const { maintenanceMode, maintenanceMessage } = await getMaintenanceStatus();
    if (maintenanceMode) {
      res.status(503).json({
        error: {
          code: "MAINTENANCE_MODE",
          message: maintenanceMessage || "This store is temporarily unavailable for maintenance. Please check back soon.",
        },
      });
      return;
    }
    next();
  }),
);

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

// Storefront customer accounts - scoped to the store in the URL.
storefrontRouter.post(
  "/:storeSlug/account/signup",
  customerSignupRateLimiter,
  validateBody(customerSignupSchema),
  asyncHandler(async (req, res) => {
    const store = await resolveActiveStore(req.params.storeSlug);
    const result = await signupCustomer(store.id, req.body as CustomerSignupInput);
    res.status(201).json(result);
  }),
);

storefrontRouter.post(
  "/:storeSlug/account/login",
  customerLoginRateLimiter,
  validateBody(customerLoginSchema),
  asyncHandler(async (req, res) => {
    const store = await resolveActiveStore(req.params.storeSlug);
    const result = await loginCustomer(store.id, req.body as CustomerLoginInput);
    res.json(result);
  }),
);

storefrontRouter.get(
  "/:storeSlug/account/me",
  asyncHandler(async (req, res) => {
    const store = await resolveActiveStore(req.params.storeSlug);
    const customer = await authenticateCustomer(req, store.id);
    const account = await getCustomerAccount(customer.id, store.id);
    res.json(account);
  }),
);

// Checkout requires a signed-in customer account. The order is attached to
// the account's own Customer row: name/phone come from the account in the
// database, never from the request body, so a shopper can't place an order
// under someone else's phone number.
storefrontRouter.post(
  "/:storeSlug/checkout",
  validateBody(checkoutSchema),
  asyncHandler(async (req, res) => {
    const store = await resolveActiveStore(req.params.storeSlug);
    const customer = await authenticateCustomer(req, store.id);

    const { deliveryAddress, deliveryAreaId, customerNote, items } = req.body as CheckoutInput;
    const order = await placeOrder({
      storeId: store.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      deliveryAddress,
      deliveryAreaId,
      customerNote,
      items,
    });

    res.status(201).json({ order });
  }),
);

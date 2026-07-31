import { Router } from "express";
import { checkoutSchema, type CheckoutInput } from "@commerceos/types";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { validateBody } from "../middleware/validate.js";
import { placeOrder } from "../services/order.service.js";

// Per SRS Part 21 - /api/storefront/:storeSlug/* endpoint group. Public,
// customer-facing; no staff authentication is required or accepted here.
export const storefrontRouter = Router({ mergeParams: true });

storefrontRouter.post(
  "/:storeSlug/checkout",
  validateBody(checkoutSchema),
  asyncHandler(async (req, res) => {
    const store = await prisma.store.findUnique({ where: { slug: req.params.storeSlug } });
    if (!store) throw AppError.notFound(`Store "${req.params.storeSlug}" not found`);
    if (store.status !== "ACTIVE") {
      throw AppError.conflict("This store is not currently accepting orders", "STORE_NOT_ACTIVE");
    }

    const { customerName, customerPhone, deliveryAddress, deliveryAreaId, items } = req.body as CheckoutInput;
    const order = await placeOrder({
      storeId: store.id,
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryAreaId,
      items,
    });

    res.status(201).json({ order });
  }),
);

import { z } from "zod";

export const checkoutItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const checkoutSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  customerPhone: z.string().min(1, "Phone number is required"),
  deliveryAddress: z.string().min(1, "Delivery address is required"),
  deliveryAreaId: z.string().nullish(),
  items: z.array(checkoutItemSchema).min(1, "Cart cannot be empty"),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const orderStatusValues = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "RETURNED",
  "CANCELLED",
] as const;

export const updateOrderStatusSchema = z.object({
  status: z.enum(orderStatusValues),
  note: z.string().optional(),
  codConfirmOverrideReason: z.string().optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const confirmCodSchema = z.object({
  outcome: z.enum(["CONFIRMED", "NO_ANSWER", "DECLINED"]),
  note: z.string().optional(),
});
export type ConfirmCodInput = z.infer<typeof confirmCodSchema>;

// Per SRS Part 9.4 - manual courier tracking; V1 has no live courier API
// (that's V2, Part 12.2), so this is staff-entered free text for the
// consignment/tracking ID and a small fixed list for the courier name.
export const courierNameValues = ["PATHAO", "STEADFAST", "REDX", "OTHER"] as const;

export const updateCourierSchema = z.object({
  courierName: z.enum(courierNameValues),
  courierTrackingId: z.string().min(1, "Tracking/consignment ID is required"),
});
export type UpdateCourierInput = z.infer<typeof updateCourierSchema>;

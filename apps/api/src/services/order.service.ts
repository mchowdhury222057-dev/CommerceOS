import { Prisma, type Order, type OrderStatus } from "@commerceos/prisma/generated/client";
import { computeRiskLevel } from "@commerceos/types";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { emit } from "../events/bus.js";
import { writeAuditLog } from "../lib/audit.js";

// Per SRS Part 9.1 / Part D.4.2 - the fixed order-status state machine. The
// UI disables transitions that skip states (Part B.2.1); the service layer is
// the actual point of enforcement, so a legal-looking client request cannot
// bypass the sequence.
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: [],
  RETURNED: [],
  CANCELLED: [],
};

export interface OrderListFilters {
  status?: OrderStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
}

export async function listOrders(storeId: string, filters: OrderListFilters = {}) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 25;

  const where: Prisma.OrderWhereInput = {
    storeId, // Part 6.3 - never trust a bare client-supplied filter alone
    status: filters.status?.length ? { in: filters.status } : undefined,
    createdAt:
      filters.dateFrom || filters.dateTo
        ? { gte: filters.dateFrom, lte: filters.dateTo }
        : undefined,
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { customer: { select: { id: true, name: true, phone: true, riskLevel: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total, page, pageSize };
}

export async function getOrder(storeId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId },
    include: {
      customer: true,
      items: { include: { product: true, variant: true } },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) throw AppError.notFound(`Order ${orderId} not found`);
  return order;
}

export interface PlaceOrderInput {
  storeId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryAreaId?: string | null;
  customerNote?: string | null;
  items: Array<{ productId: string; variantId: string; quantity: number }>;
}

// Per SRS Part D.4.1 - creates an Order in Pending status with no stock
// decrement (Part 8.3) and no risk recalculation (Part D.4.4 fires only on
// Delivered/Returned). Prices are always re-derived server-side; a clientsubmitted total is never trusted.
export async function placeOrder(input: PlaceOrderInput): Promise<Order> {
  if (input.items.length === 0) {
    throw AppError.validation("Cannot place an order with no items", "EMPTY_CART");
  }

  const result = await prisma.$transaction(async (tx) => {
    const store = await tx.store.findUnique({ where: { id: input.storeId } });
    if (!store || store.status !== "APPROVED") {
      throw AppError.conflict("This store is not currently accepting orders", "STORE_NOT_ACTIVE");
    }

    // Part D.1.2 - lazily resolve or create the Customer by (storeId, phone);
    // the same phone number is a distinct Customer in each store (Part 6.3).
    const customer = await tx.customer.upsert({
      where: { storeId_phone: { storeId: input.storeId, phone: input.customerPhone } },
      update: {},
      create: { storeId: input.storeId, name: input.customerName, phone: input.customerPhone },
    });

    let total = new Prisma.Decimal(0);
    const itemsData: Array<{
      productId: string;
      variantId: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
    }> = [];

    for (const line of input.items) {
      if (line.quantity <= 0) {
        throw AppError.validation(`Quantity for variant ${line.variantId} must be positive`);
      }
      const variant = await tx.productVariant.findUnique({
        where: { id: line.variantId },
        include: { product: true },
      });
      if (!variant || variant.product.storeId !== input.storeId || variant.product.status !== "ACTIVE" || !variant.isActive) {
        throw AppError.conflict(`Product variant ${line.variantId} is not available`, "PRODUCT_UNAVAILABLE");
      }
      // Placement never decrements stock (Part 8.3), but an already-exhausted
      // variant still blocks the order, matching the Product page's rule.
      if (variant.stock < line.quantity) {
        throw AppError.conflict(
          `Insufficient stock for variant ${line.variantId}`,
          "INSUFFICIENT_STOCK",
          { variantId: line.variantId, requested: line.quantity, available: variant.stock },
        );
      }
      const unitPrice = variant.priceOverride ?? variant.product.basePrice;
      total = total.add(unitPrice.mul(line.quantity));
      itemsData.push({
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
        unitPrice,
      });
    }

    if (input.deliveryAreaId) {
      const deliveryArea = await tx.deliveryArea.findUnique({ where: { id: input.deliveryAreaId } });
      if (!deliveryArea || deliveryArea.storeId !== input.storeId) {
        throw AppError.validation("deliveryAreaId does not belong to this store", "INVALID_DELIVERY_AREA");
      }
    }

    const order = await tx.order.create({
      data: {
        storeId: input.storeId,
        customerId: customer.id,
        deliveryAddress: input.deliveryAddress,
        deliveryAreaId: input.deliveryAreaId ?? null,
        customerNote: input.customerNote ?? null,
        total,
        items: { create: itemsData },
      },
    });

    await tx.customer.update({ where: { id: customer.id }, data: { totalOrders: { increment: 1 } } });
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, status: "PENDING", note: "Order placed" },
    });

    return { order, customerId: customer.id, riskLevelAtPlacement: customer.riskLevel };
  });

  emit("OrderPlaced", {
    storeId: input.storeId,
    actorId: null,
    payload: {
      orderId: result.order.id,
      customerId: result.customerId,
      total: result.order.total.toString(),
      paymentMethod: result.order.paymentMethod,
      riskLevelAtPlacement: result.riskLevelAtPlacement,
    },
  });

  return result.order;
}

export interface UpdateOrderStatusInput {
  storeId: string;
  orderId: string;
  targetStatus: OrderStatus;
  actorId: string;
  note?: string;
  /** Explicit, logged bypass of the codConfirmedByCall gate (Part 9.3). */
  codConfirmOverrideReason?: string;
}

// Per SRS Part D.4.2 - the core order lifecycle transition. Status update,
// stock decrement (Confirmed only, Part D.3.2/8.3), and risk recalculation
// (Delivered/Returned only, Part D.4.4) are bundled into one transaction so an
// order can never be observed in an inconsistent intermediate state.
export async function updateOrderStatus(input: UpdateOrderStatusInput): Promise<Order> {
  const actor = await prisma.user.findUniqueOrThrow({ where: { id: input.actorId } });

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: input.orderId, storeId: input.storeId } });
    if (!order) throw AppError.notFound(`Order ${input.orderId} not found`);

    const legalNextStates = ORDER_STATUS_TRANSITIONS[order.status];
    if (!legalNextStates.includes(input.targetStatus)) {
      throw AppError.conflict(
        `Cannot transition order from ${order.status} to ${input.targetStatus}`,
        "ILLEGAL_TRANSITION",
        { currentStatus: order.status, legalNextStates },
      );
    }

    if (input.targetStatus === "CONFIRMED" && !order.codConfirmedByCall && !input.codConfirmOverrideReason) {
      throw AppError.unprocessable(
        "Confirming requires codConfirmedByCall=true or an explicit override reason (Part 9.3)",
        "COD_CONFIRMATION_REQUIRED",
      );
    }

    const stockLowEvents: Array<{ productId: string; variantId: string; currentStock: number; threshold: number }> = [];

    // Part 8.3 / D.3.2 - stock decrements exactly once, at Pending->Confirmed,
    // never at placement, so unconfirmed COD orders never over-reserve stock.
    if (input.targetStatus === "CONFIRMED") {
      const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
      const variants = await Promise.all(
        items.map((item) => tx.productVariant.findUniqueOrThrow({ where: { id: item.variantId } })),
      );
      const shortages = items
        .map((item, i) => ({ item, variant: variants[i] }))
        .filter(({ item, variant }) => variant.stock < item.quantity);
      if (shortages.length > 0) {
        throw AppError.conflict(
          "Insufficient stock to confirm this order",
          "INSUFFICIENT_STOCK",
          { shortages: shortages.map(({ item, variant }) => ({ variantId: item.variantId, requested: item.quantity, available: variant.stock })) },
        );
      }
      for (const item of items) {
        const updatedVariant = await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
        const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
        if (updatedVariant.stock <= product.lowStockThreshold) {
          stockLowEvents.push({
            productId: item.productId,
            variantId: item.variantId,
            currentStock: updatedVariant.stock,
            threshold: product.lowStockThreshold,
          });
        }
      }
    }

    const updateData: Prisma.OrderUpdateInput = { status: input.targetStatus };
    if (input.targetStatus === "CANCELLED" && input.note) {
      updateData.cancelledReason = input.note;
    }

    // Part D.4.4 - Delivered/Returned are the only two risk-recalculation
    // triggers, built as an isolated computation (Part 10.2) so V2's couriernetwork extension (Part 12.3) can wrap it without touching this call site.
    let riskChange: { previousRiskLevel: string; newRiskLevel: string } | null = null;
    if (input.targetStatus === "DELIVERED" || input.targetStatus === "RETURNED") {
      const customer = await tx.customer.findUniqueOrThrow({ where: { id: order.customerId } });
      const deliveredOrders = customer.deliveredOrders + (input.targetStatus === "DELIVERED" ? 1 : 0);
      const refusedOrders = customer.refusedOrders + (input.targetStatus === "RETURNED" ? 1 : 0);
      const newRiskLevel = computeRiskLevel({ totalOrders: customer.totalOrders, refusedOrders });
      if (newRiskLevel !== customer.riskLevel) {
        riskChange = { previousRiskLevel: customer.riskLevel, newRiskLevel };
      }
      await tx.customer.update({
        where: { id: order.customerId },
        data: { deliveredOrders, refusedOrders, riskLevel: newRiskLevel },
      });
      if (input.targetStatus === "DELIVERED") {
        // Part D.5.1 - the courier's cash collection IS the payment event in V1.
        updateData.isPaid = true;
      }
    }

    const updatedOrder = await tx.order.update({ where: { id: order.id }, data: updateData });
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: input.targetStatus,
        actorId: input.actorId,
        note: input.note ?? input.codConfirmOverrideReason ?? null,
      },
    });

    return { updatedOrder, fromStatus: order.status, stockLowEvents, riskChange };
  });

  // Per Part D.4.2 - every status transition is audit-logged, giving Store
  // Owners a full accountability trail across their staff.
  await writeAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    action: "OrderStatusChanged",
    targetStoreId: input.storeId,
    targetResource: `Order:${input.orderId}`,
  });

  emit("OrderStatusChanged", {
    storeId: input.storeId,
    actorId: input.actorId,
    payload: { orderId: input.orderId, fromStatus: result.fromStatus, toStatus: input.targetStatus },
  });
  if (input.targetStatus === "CONFIRMED") {
    emit("OrderConfirmed", {
      storeId: input.storeId,
      actorId: input.actorId,
      payload: { orderId: input.orderId, confirmedByUserId: input.actorId },
    });
  }
  if (input.targetStatus === "DELIVERED") {
    emit("OrderDelivered", {
      storeId: input.storeId,
      actorId: input.actorId,
      payload: { orderId: input.orderId, customerId: result.updatedOrder.customerId },
    });
  }
  if (input.targetStatus === "RETURNED") {
    emit("OrderReturned", {
      storeId: input.storeId,
      actorId: input.actorId,
      payload: { orderId: input.orderId, customerId: result.updatedOrder.customerId },
    });
  }
  for (const stockLow of result.stockLowEvents) {
    emit("ProductStockLow", { storeId: input.storeId, actorId: null, payload: stockLow });
  }
  if (result.riskChange) {
    emit("CustomerRiskLevelChanged", {
      storeId: input.storeId,
      actorId: input.actorId,
      payload: { customerId: result.updatedOrder.customerId, ...result.riskChange },
    });
  }

  return result.updatedOrder;
}

export interface UpdateCourierTrackingInput {
  storeId: string;
  orderId: string;
  courierName: string;
  courierTrackingId: string;
  actorId: string;
}

// Per SRS Part 9.4 - manual courier tracking is only meaningful once an
// order has actually been handed to a courier; entering it earlier would
// just be an unlinked guess. Left editable at Delivered/Returned too (not
// only Shipped) so a typo'd consignment ID can still be corrected after
// the fact.
export async function updateCourierTracking(input: UpdateCourierTrackingInput): Promise<Order> {
  const actor = await prisma.user.findUniqueOrThrow({ where: { id: input.actorId } });
  const order = await prisma.order.findFirst({ where: { id: input.orderId, storeId: input.storeId } });
  if (!order) throw AppError.notFound(`Order ${input.orderId} not found`);
  if (!["SHIPPED", "DELIVERED", "RETURNED"].includes(order.status)) {
    throw AppError.conflict(
      "Courier tracking can only be set once an order has been Shipped",
      "ORDER_NOT_SHIPPED",
    );
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { courierName: input.courierName, courierTrackingId: input.courierTrackingId },
  });

  await writeAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    action: "OrderCourierUpdated",
    targetStoreId: input.storeId,
    targetResource: `Order:${input.orderId}`,
    metadata: { courierName: input.courierName, courierTrackingId: input.courierTrackingId },
  });

  return updated;
}

export interface LogCodConfirmationCallInput {
  storeId: string;
  orderId: string;
  outcome: "CONFIRMED" | "NO_ANSWER" | "DECLINED";
  note?: string;
  actorId: string;
}

// Per SRS Part D.4.3 - the gate (or logged bypass) the Confirmed transition
// checks. An order can accumulate multiple call attempts while remaining
// Pending; this never itself changes the order's status.
export async function logCodConfirmationCall(input: LogCodConfirmationCallInput): Promise<Order> {
  const order = await prisma.order.findFirst({ where: { id: input.orderId, storeId: input.storeId } });
  if (!order) throw AppError.notFound(`Order ${input.orderId} not found`);
  if (order.status !== "PENDING") {
    throw AppError.conflict(
      "A call outcome can only be logged while an order is Pending",
      "INVALID_STATE",
    );
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      codConfirmedByCall: input.outcome === "CONFIRMED",
      codCallNote: input.note ?? null,
      callAttempts: { increment: 1 },
    },
  });

  emit("CodConfirmationCallLogged", {
    storeId: input.storeId,
    actorId: input.actorId,
    payload: { orderId: order.id, outcome: input.outcome, callAttempts: updated.callAttempts },
  });

  return updated;
}

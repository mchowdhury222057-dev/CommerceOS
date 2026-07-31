import { prisma } from "../lib/prisma.js";
import { on } from "../events/bus.js";

// Per Part 17 / Part C.4's Notification component - the persistent, in-app,
// dismiss-per-item list surfaced from the Navbar bell icon. This subscribes
// to the domain events that back new-order/low-stock/high-risk alerts and
// writes real, queryable Notification rows.
//
// Customer-facing SMS delivery (order confirmation/status SMS, Part 17) is
// explicitly NOT implemented here: it requires a real SMS_PROVIDER_API_KEY
// integration, which is Phase-14 (Notifications) scope. Building a stub that
// pretends to send an SMS would violate the no-placeholder-code rule (Part
// O), so that channel is simply not wired up yet rather than faked.

async function createNotification(params: { storeId: string | null; type: string; message: string }) {
  await prisma.notification.create({
    data: { storeId: params.storeId, type: params.type, message: params.message },
  });
}

export function registerNotificationSubscribers(): void {
  on("OrderPlaced", async (event) => {
    await createNotification({
      storeId: event.storeId,
      type: "NEW_ORDER",
      message: `New order ${event.payload.orderId} placed (risk: ${event.payload.riskLevelAtPlacement})`,
    });
  });

  on("ProductStockLow", async (event) => {
    await createNotification({
      storeId: event.storeId,
      type: "LOW_STOCK",
      message: `Variant ${event.payload.variantId} is low on stock: ${event.payload.currentStock} remaining`,
    });
  });

  on("CustomerRiskLevelChanged", async (event) => {
    if (event.payload.newRiskLevel === "NONE") return;
    await createNotification({
      storeId: event.storeId,
      type: "RISK_LEVEL_CHANGED",
      message: `Customer ${event.payload.customerId} risk level changed to ${event.payload.newRiskLevel}`,
    });
  });
}

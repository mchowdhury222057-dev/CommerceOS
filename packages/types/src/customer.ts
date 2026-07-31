// Per SRS Part 10.1 / 10.2
export type RiskLevel = "NONE" | "CAUTION" | "HIGH_RISK";

export interface Customer {
  id: string;
  storeId: string;
  name: string;
  phone: string; // primary identifier for COD commerce, per Part 10.1
  totalOrders: number;
  deliveredOrders: number;
  refusedOrders: number;
  riskLevel: RiskLevel;
}

// Per SRS Part 10.2 - recalculated whenever an order transitions to Delivered/Returned.
// Implemented as an isolated function so V2 can extend it with courier-network data
// (Part 12.3) without changing any calling code.
export function computeRiskLevel(customer: Pick<Customer, "totalOrders" | "refusedOrders">): RiskLevel {
  const { totalOrders, refusedOrders } = customer;
  if (refusedOrders < 2) return "NONE";
  const refusalRate = totalOrders > 0 ? refusedOrders / totalOrders : 0;
  if (refusedOrders >= 2 && refusalRate > 0.4) return "HIGH_RISK";
  return "CAUTION";
}

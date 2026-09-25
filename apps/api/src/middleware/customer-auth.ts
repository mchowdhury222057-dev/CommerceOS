import type { Request } from "express";
import { AppError } from "../lib/errors.js";
import { getAuthenticatedCustomer, verifyCustomerToken } from "../services/customer-auth.service.js";

// Resolves the signed-in storefront customer for a request against the
// store already resolved from the URL slug. Kept as a plain function (not
// Express middleware) because the store has to be resolved from the slug
// first, and that happens inside each storefront route handler.
export async function authenticateCustomer(req: Request, storeId: string) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw AppError.unauthorized("Please sign in to continue", "CUSTOMER_AUTH_REQUIRED");
  }
  const claims = verifyCustomerToken(header.slice(7));
  return getAuthenticatedCustomer(claims, storeId);
}

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";

// Deliberately NOT the staff JWT secret. The staff requireAuth middleware
// accepts any token signed with that secret that carries no `sid`, so a
// customer token signed with the same key could be replayed against staff
// routes. A separate key means a customer token can never pass staff auth,
// and a staff token can never pass customer auth.
const CUSTOMER_JWT_SECRET =
  process.env.CUSTOMER_JWT_SECRET ?? `${process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? "dev-secret-change-me"}:customer`;
const CUSTOMER_TOKEN_TTL = "7d";

export interface CustomerTokenClaims {
  type: "customer";
  customerId: string;
  storeId: string;
}

export interface CustomerAccountView {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
}

export interface CustomerAuthResult {
  token: string;
  customer: CustomerAccountView;
}

function toView(c: { id: string; name: string; phone: string; createdAt: Date }): CustomerAccountView {
  return { id: c.id, name: c.name, phone: c.phone, createdAt: c.createdAt.toISOString() };
}

function issueToken(customerId: string, storeId: string): string {
  const claims: CustomerTokenClaims = { type: "customer", customerId, storeId };
  return jwt.sign(claims, CUSTOMER_JWT_SECRET, { expiresIn: CUSTOMER_TOKEN_TTL });
}

export function verifyCustomerToken(token: string): CustomerTokenClaims {
  let payload: CustomerTokenClaims;
  try {
    payload = jwt.verify(token, CUSTOMER_JWT_SECRET) as CustomerTokenClaims;
  } catch {
    throw AppError.unauthorized("Please sign in to continue", "CUSTOMER_AUTH_REQUIRED");
  }
  if (payload.type !== "customer" || !payload.customerId || !payload.storeId) {
    throw AppError.unauthorized("Please sign in to continue", "CUSTOMER_AUTH_REQUIRED");
  }
  return payload;
}

// A phone that already placed guest orders here has a Customer row with no
// password - signing up with that phone claims it, so the customer's past
// orders show up in their new account. This exposes nothing new: order
// history by phone is already public via Track Order. A phone that already
// has a password is a real account and must log in instead.
export async function signupCustomer(storeId: string, input: { name: string; phone: string; password: string }): Promise<CustomerAuthResult> {
  const passwordHash = await bcrypt.hash(input.password, 10);
  const existing = await prisma.customer.findUnique({ where: { storeId_phone: { storeId, phone: input.phone } } });

  if (existing?.passwordHash) {
    throw AppError.conflict("An account with this phone number already exists. Please sign in.", "ACCOUNT_EXISTS");
  }

  const customer = existing
    ? await prisma.customer.update({ where: { id: existing.id }, data: { name: input.name, passwordHash } })
    : await prisma.customer.create({ data: { storeId, name: input.name, phone: input.phone, passwordHash } });

  return { token: issueToken(customer.id, storeId), customer: toView(customer) };
}

export async function loginCustomer(storeId: string, input: { phone: string; password: string }): Promise<CustomerAuthResult> {
  const customer = await prisma.customer.findUnique({ where: { storeId_phone: { storeId, phone: input.phone } } });
  // Same message whether the phone is unknown, has no account yet, or the
  // password is wrong - doesn't reveal which phones have accounts.
  const valid = customer?.passwordHash ? await bcrypt.compare(input.password, customer.passwordHash) : false;
  if (!customer || !valid) {
    throw AppError.unauthorized("Invalid phone number or password", "INVALID_CREDENTIALS");
  }
  return { token: issueToken(customer.id, storeId), customer: toView(customer) };
}

// Re-reads the customer from the database on every authenticated request
// (not just trusting the token), scoped to the store resolved from the URL
// slug - a token issued by Store A is rejected on Store B's URLs.
export async function getAuthenticatedCustomer(claims: CustomerTokenClaims, storeId: string) {
  if (claims.storeId !== storeId) {
    throw AppError.unauthorized("Please sign in to continue", "CUSTOMER_AUTH_REQUIRED");
  }
  const customer = await prisma.customer.findFirst({ where: { id: claims.customerId, storeId } });
  if (!customer?.passwordHash) {
    throw AppError.unauthorized("Please sign in to continue", "CUSTOMER_AUTH_REQUIRED");
  }
  return customer;
}

export async function getCustomerAccount(customerId: string, storeId: string) {
  const customer = await prisma.customer.findFirstOrThrow({ where: { id: customerId, storeId } });
  const orders = await prisma.order.findMany({
    where: { customerId, storeId },
    include: { items: { include: { product: true, variant: true } } },
    orderBy: { createdAt: "desc" },
  });
  return { customer: toView(customer), orders };
}

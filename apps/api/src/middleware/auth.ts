import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { AuthUser, Role } from "@commerceos/types";
import { AppError } from "../lib/errors.js";
import { isSessionActive } from "../services/session.service.js";
import { isImpersonationSessionActive } from "../services/impersonation.service.js";

// Widens AuthUser with the two optional session claims a token may carry:
// `sid` for an ordinary login session (Part D.1.4), or
// `impersonationSessionId` for a time-boxed impersonation token (Part 15.2).
// A token never carries both.
export interface RequestUser extends AuthUser {
  sid?: string;
  impersonationSessionId?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

// Per SRS Part J.1.1 - JWT_ACCESS_SECRET is the production variable name; the
// dev-only fallback never persists into staging/production configuration.
const JWT_SECRET = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? "dev-secret-change-me";

// Per SRS Part 4/19.4 - every request resolves the authenticated user's role
// (and store_id, where relevant) before any database query executes. The
// `sid` claim is additionally checked against Redis (Part D.1.6/F.5.1) so a
// role change, logout, or password reset takes effect instantly rather than
// waiting out the access token's own short natural expiry. An
// impersonation-scoped token's own validity is checked separately by
// requireStoreAccess, since a plain login token and an impersonation token
// are never both present on the same request.
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw AppError.unauthorized("Missing bearer token");
    }

    let payload: RequestUser;
    try {
      payload = jwt.verify(header.slice(7), JWT_SECRET) as RequestUser;
    } catch {
      throw AppError.unauthorized("Invalid or expired token");
    }

    if (payload.sid && !(await isSessionActive(payload.sid))) {
      throw AppError.unauthorized("Session has been revoked", "SESSION_REVOKED");
    }

    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
}

// Per SRS Part 4.2 - every /api/admin/* route must verify Master Administrator status.
export function requireMasterAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "MASTER_ADMIN") {
    throw AppError.forbidden("Master Administrator access required");
  }
  next();
}

// Per SRS Part 4.2/B.2.1 - every /api/store/:storeId/* route must verify the
// authenticated identity's access to the requested storeId before touching
// the database. Cross-store access is a hard failure, not a filtered result -
// the request is rejected outright, never silently re-scoped.
//
// A Master Administrator's own login token grants NO store-scoped access on
// its own (Part B.2.1: "full access to any store's page only through an
// active impersonation session, with the Impersonation Banner rendered for
// the duration"). Access is granted only via a short-lived impersonation
// token minted by impersonation.service.ts's startImpersonation(), carrying
// an `impersonationSessionId` claim and a `storeId` matching the request -
// and only for as long as that session remains active in Redis, so it
// naturally (and instantly, on End Session) stops working.
//
// IMPORTANT: this must be mounted at a path containing `:storeId` itself
// (e.g. `router.use("/:storeId", requireAuth, requireStoreAccess)`), never as
// a bare `router.use(requireStoreAccess)` registered ahead of the route that
// declares `:storeId` - Express only resolves a named path param when
// matching the path pattern that declares it, so a bare `.use()` mounted
// earlier in the stack would see `req.params.storeId` as `undefined`.
export async function requireStoreAccess(req: Request, _res: Response, next: NextFunction) {
  try {
    const { storeId } = req.params;
    const user = req.user;
    if (!user) throw AppError.unauthorized("Unauthenticated");

    if (user.role === "MASTER_ADMIN") {
      if (!user.impersonationSessionId) {
        throw AppError.forbidden(
          "Start an impersonation session to access this store's dashboard routes",
          "IMPERSONATION_REQUIRED",
        );
      }
      if (!storeId || user.storeId !== storeId) {
        throw AppError.forbidden("This impersonation session is not scoped to the requested store");
      }
      const active = await isImpersonationSessionActive(user.impersonationSessionId);
      if (!active) {
        throw AppError.unauthorized("Impersonation session has ended or expired", "IMPERSONATION_SESSION_ENDED");
      }
      return next();
    }

    if (!storeId || user.storeId !== storeId) {
      throw AppError.forbidden("Cross-store access is not permitted");
    }
    next();
  } catch (error) {
    next(error);
  }
}

// Per SRS Part 4.1 - fine-grained role check within an already store-scoped
// route. A Master Administrator reaches this point only after
// requireStoreAccess has already verified an active impersonation session
// for this exact store, so they are treated as having full permissions
// within it - matching "acting AS the Store Owner" (Part 15.2) - while
// every other role must appear in the allow-list.
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (role === "MASTER_ADMIN") return next();
    if (!role || !allowedRoles.includes(role)) {
      throw AppError.forbidden("Your role does not permit this action");
    }
    next();
  };
}

// Narrows `req.user` from optional to required for handlers that only ever
// run after requireAuth - avoids a non-null assertion at every call site.
export function getAuthUser(req: Request): RequestUser {
  if (!req.user) throw AppError.unauthorized("Unauthenticated");
  return req.user;
}

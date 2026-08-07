import { Router } from "express";
import type { Request, Response } from "express";
import {
  adminSignupSchema,
  loginSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  redeemInviteSchema,
  signupSchema,
  type SignupInput,
} from "@commerceos/types";
import { AppError } from "../lib/errors.js";
import { asyncHandler } from "../middleware/error-handler.js";
import {
  inviteRedeemRateLimiter,
  loginRateLimiter,
  passwordResetRateLimiter,
  signupRateLimiter,
} from "../middleware/rate-limit.js";
import { validateBody } from "../middleware/validate.js";
import {
  confirmPasswordReset,
  login,
  logout,
  redeemStaffInvite,
  refreshAccessToken,
  requestPasswordReset,
  signup,
  signupMasterAdmin,
  type AdminSignupInput,
  type AuthResult,
} from "../services/auth.service.js";

// Per SRS Part 21 - /api/auth/* endpoint group. Staff/admin authentication
// only; customer (Storefront) identity is a separate track under
// /api/storefront/:storeSlug/auth/* (Part 19.4), not yet built this phase.
export const authRouter = Router();

const REFRESH_COOKIE_NAME = "commerceos_refresh_token";
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, matches session.service.ts's TTL

// Per Part E.3's authStore convention - the access token is returned in the
// body for the frontend to hold in memory (never persisted); the refresh
// token is never exposed to JS at all, only readable by the browser itself.
function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    path: "/api/auth",
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
}

function respondWithSession(res: Response, result: AuthResult, status = 200) {
  setRefreshCookie(res, result.refreshToken);
  res.status(status).json({ accessToken: result.accessToken, user: result.user });
}

function readRefreshCookie(req: Request): string {
  const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE_NAME];
  if (!token) throw AppError.unauthorized("No refresh session present", "NO_REFRESH_TOKEN");
  return token;
}

authRouter.post(
  "/login",
  loginRateLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    const result = await login(email, password);
    respondWithSession(res, result);
  }),
);

// Per Part 6.1 - public, no auth: this is how a Store Owner account first
// comes into existence via self-signup, alongside (not replacing) the
// Master Admin's "+ Create Store" path (admin.routes.ts).
authRouter.post(
  "/signup",
  signupRateLimiter,
  validateBody(signupSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as SignupInput;
    const result = await signup(body);
    respondWithSession(res, result, 201);
  }),
);

// Per Part 4/20.1 - a second Master Administrator account creation path,
// public but gated by a shared secret (ADMIN_SETUP_KEY) rather than the
// Store Owner path's open signup, since this role is platform-wide. Not
// rate-limited yet (see auth.service.ts's TODO on signupMasterAdmin).
authRouter.post(
  "/admin-signup",
  validateBody(adminSignupSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as AdminSignupInput;
    const result = await signupMasterAdmin(body);
    respondWithSession(res, result, 201);
  }),
);

authRouter.post(
  "/invite/redeem",
  inviteRedeemRateLimiter,
  validateBody(redeemInviteSchema),
  asyncHandler(async (req, res) => {
    const { token, password } = req.body as { token: string; password: string };
    const result = await redeemStaffInvite(token, password);
    respondWithSession(res, result, 201);
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const refreshToken = readRefreshCookie(req);
    const result = await refreshAccessToken(refreshToken);
    respondWithSession(res, result);
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE_NAME];
    if (token) await logout(token);
    clearRefreshCookie(res);
    res.status(204).send();
  }),
);

authRouter.post(
  "/password/reset-request",
  passwordResetRateLimiter,
  validateBody(passwordResetRequestSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body as { email: string };
    const resetLink = await requestPasswordReset(email);
    // Per Part D.1.5 - the `message` field is identical whether or not the
    // account exists, so a client can never learn that from the response
    // alone. `resetLink` breaks that guarantee (it's only present when the
    // account exists) - that's DEV ONLY, standing in for the real email that
    // would otherwise carry the link out-of-band. Once real email sending
    // exists (see lib/mailer.ts's sendPasswordResetLink), delete this field
    // entirely rather than shipping it to production.
    res.status(200).json({
      message: "If an account exists for this email, a reset link has been generated.",
      ...(resetLink ? { resetLink } : {}),
    });
  }),
);

authRouter.post(
  "/password/reset-confirm",
  passwordResetRateLimiter,
  validateBody(passwordResetConfirmSchema),
  asyncHandler(async (req, res) => {
    const { token, password } = req.body as { token: string; password: string };
    await confirmPasswordReset(token, password);
    res.status(200).json({ message: "Password updated. Please sign in again." });
  }),
);

import { Router } from "express";
import type { Request, Response } from "express";
import {
  loginSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  redeemInviteSchema,
} from "@commerceos/types";
import { AppError } from "../lib/errors.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { inviteRedeemRateLimiter, loginRateLimiter, passwordResetRateLimiter } from "../middleware/rate-limit.js";
import { validateBody } from "../middleware/validate.js";
import {
  confirmPasswordReset,
  login,
  logout,
  redeemStaffInvite,
  refreshAccessToken,
  requestPasswordReset,
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
    await requestPasswordReset(email);
    // Per Part D.1.5 - identical response whether or not the account exists.
    res.status(200).json({ message: "If an account exists for this email, a reset link has been sent." });
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

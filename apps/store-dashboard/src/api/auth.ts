import { api } from "../lib/api-client";
import type { AuthUser } from "../lib/api-types";

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

export function login(email: string, password: string): Promise<LoginResult> {
  return api.post<LoginResult>("/api/auth/login", { email, password });
}

export function logout(): Promise<void> {
  return api.post<void>("/api/auth/logout");
}

export interface AdminSignupInput {
  name: string;
  email: string;
  password: string;
  setupKey: string;
}

export function adminSignup(input: AdminSignupInput): Promise<LoginResult> {
  return api.post<LoginResult>("/api/auth/admin-signup", input);
}

export interface RequestPasswordResetResult {
  message: string;
  // DEV ONLY - present only while requestPasswordReset (apps/api's
  // auth.service.ts) returns the link directly instead of emailing it.
  resetLink?: string;
}

export function requestPasswordReset(email: string): Promise<RequestPasswordResetResult> {
  return api.post<RequestPasswordResetResult>("/api/auth/password/reset-request", { email });
}

export function confirmPasswordReset(token: string, password: string): Promise<{ message: string }> {
  return api.post<{ message: string }>("/api/auth/password/reset-confirm", { token, password });
}

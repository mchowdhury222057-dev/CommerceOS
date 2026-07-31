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

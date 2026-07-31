import { create } from "zustand";
import type { AuthUser } from "../lib/api-types";

// Per SRS Part E.3 - the access token is held in memory only, NEVER
// persisted (no `persist` middleware here), so a page refresh always
// re-establishes the session via the httpOnly refresh cookie (see
// api-client.ts's bootstrapSession) rather than trusting a stale localStorage
// copy of a short-lived token.
interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  status: "checking" | "authenticated" | "unauthenticated";
  setSession: (accessToken: string, user: AuthUser) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: "checking",
  setSession: (accessToken, user) => set({ accessToken, user, status: "authenticated" }),
  clear: () => set({ accessToken: null, user: null, status: "unauthenticated" }),
}));

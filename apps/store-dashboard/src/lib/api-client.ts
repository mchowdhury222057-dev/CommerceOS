import { useAuthStore } from "../stores/auth.store";
import type { AppErrorBody, AuthUser } from "./api-types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let refreshInFlight: Promise<boolean> | null = null;

// Per SRS Part D.1.4 - exchanges the httpOnly refresh cookie (sent
// automatically via credentials: "include") for a new access token. Used
// both at app boot (to silently restore a session after a page reload,
// since the access token itself is never persisted) and transparently on a
// single 401 retry.
async function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, { method: "POST", credentials: "include" });
        if (!res.ok) return false;
        const body = (await res.json()) as { accessToken: string; user: AuthUser };
        useAuthStore.getState().setSession(body.accessToken, body.user);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Set true only for the refresh call itself, to avoid an infinite retry loop. */
  skipAuthRetry?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuthRetry, headers, ...rest } = options;
  const token = useAuthStore.getState().accessToken;

  const doFetch = () =>
    fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch();

  if (res.status === 401 && !skipAuthRetry) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } else {
      useAuthStore.getState().clear();
    }
  }

  if (res.status === 204) return undefined as T;

  const parsed = await res.json().catch(() => null);
  if (!res.ok) {
    const err = parsed as AppErrorBody | null;
    throw new ApiError(res.status, err?.error?.code ?? "UNKNOWN", err?.error?.message ?? "Request failed", err?.error?.details);
  }
  return parsed as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
};

// Called once at app boot (see main.tsx) to silently restore a session from
// the refresh cookie; resolves once we know whether the user is signed in.
export async function bootstrapSession(): Promise<void> {
  const ok = await refreshSession();
  if (!ok) useAuthStore.getState().clear();
}

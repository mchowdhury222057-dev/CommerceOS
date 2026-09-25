import type { AppErrorBody } from "./api-types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000";

// Plain fetch wrapper. Most storefront calls are public; customer-account
// calls (account page, checkout) pass the signed-in customer's token
// explicitly. There's no refresh flow - customer tokens are long-lived and
// an expired one just sends the shopper back to sign in.
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

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: { "Content-Type": "application/json", ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const parsed = await res.json().catch(() => null);
  if (!res.ok) {
    const err = parsed as AppErrorBody | null;
    throw new ApiError(res.status, err?.error?.code ?? "UNKNOWN", err?.error?.message ?? "Request failed", err?.error?.details);
  }
  return parsed as T;
}

function authHeaders(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<T>(path, { method: "GET", headers: authHeaders(token) }),
  post: <T>(path: string, body?: unknown, token?: string | null) => request<T>(path, { method: "POST", body, headers: authHeaders(token) }),
};

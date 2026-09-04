import type { AppErrorBody } from "./api-types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000";

// No auth on this app at all (Part 10.1 - guest checkout + phone lookup
// only, no customer account/login exists in V1), so this client is a plain
// fetch wrapper with no token handling, unlike admin-panel/store-dashboard's.
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

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
};

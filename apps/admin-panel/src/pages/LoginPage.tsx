import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@commerceos/ui";
import { login } from "../api/auth";
import { ApiError } from "../lib/api-client";
import { useAuthStore } from "../stores/auth.store";

// Reuses the existing /api/auth/login endpoint (Part 21) - the only
// difference from the Store Dashboard's login is that access to every page
// past this one requires role === MASTER_ADMIN, enforced both here (a
// friendlier inline message) and, authoritatively, server-side.
export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.user.role !== "MASTER_ADMIN") {
        setError("This account does not have Master Administrator access.");
        return;
      }
      setSession(result.accessToken, result.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.code === "RATE_LIMITED" ? "Too many attempts - please wait and try again." : "Invalid email or password.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-admin-sidebar">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg bg-surface-card p-8 shadow-lg">
        <h1 className="mb-1 text-lg font-semibold text-text-primary">Super Admin Panel</h1>
        <p className="mb-6 text-sm text-text-secondary">Master Administrator sign in</p>

        <label htmlFor="email" className="mb-1 block text-sm font-medium text-text-primary">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-md border border-border-default bg-surface-card px-3 py-2 text-sm text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />

        <label htmlFor="password" className="mb-1 block text-sm font-medium text-text-primary">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-md border border-border-default bg-surface-card px-3 py-2 text-sm text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />

        <div className="mb-4 text-right">
          <Link to="/forgot-password" className="text-xs text-text-secondary hover:text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        {error && (
          <p role="alert" className="mb-4 text-sm text-status-danger">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" loading={submitting} className="w-full">
          Sign in
        </Button>

        <p className="mt-4 text-center text-sm text-text-secondary">
          <Link to="/admin-signup" className="font-medium text-primary hover:underline">
            Create a Master Administrator account →
          </Link>
        </p>
      </form>
    </div>
  );
}

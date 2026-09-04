import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@commerceos/ui";
import { login } from "../api/auth";
import { ApiError } from "../lib/api-client";
import { useAuthStore } from "../stores/auth.store";
import { AuthLayout } from "../components/AuthLayout";
import { Input } from "../components/ui/Input";

// Reuses the existing /api/auth/login endpoint (Part 21), same as
// admin-panel - the only difference is which role is rejected: a Master
// Administrator's own login token grants no access here (Part B.2.1), the
// inverse of admin-panel's Master-Admin-only check.
//
// "Remember me" is visual only: sessions already persist for 7 days via
// an httpOnly refresh cookie regardless of this checkbox (Part D.1.4) -
// making it actually change session length would be an auth behavior
// change, out of scope for this redesign.
export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.user.role === "MASTER_ADMIN" || !result.user.storeId) {
        setError("This account does not have Store Dashboard access.");
        return;
      }
      setSession(result.accessToken, result.user);
      navigate("/", { replace: true });
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
    <AuthLayout>
      <form onSubmit={handleSubmit} className="rounded-xl border border-border-default bg-surface-card p-8 shadow-card">
        <h1 className="mb-1 text-xl font-bold tracking-tight text-text-primary">Welcome back</h1>
        <p className="mb-6 text-sm text-text-secondary">Sign in to your Store Dashboard.</p>

        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="mb-6 mt-3 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-border-default text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-status-danger/10 px-3.5 py-2.5 text-sm text-status-danger">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" loading={submitting} className="w-full">
          Sign in
        </Button>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Don't have a store yet?{" "}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

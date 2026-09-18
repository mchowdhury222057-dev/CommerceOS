import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, LogIn, Mail } from "lucide-react";
import { Button } from "@commerceos/ui";
import { login } from "../api/auth";
import { ApiError } from "../lib/api-client";
import { useAuthStore } from "../stores/auth.store";
import { SignInLayout } from "../components/SignInLayout";
import { Input } from "../components/ui/Input";

const fieldClass =
  "w-full rounded-lg border border-border-default bg-surface-card py-2.5 pl-9 pr-10 text-sm text-text-primary placeholder:text-text-disabled transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary";

// A small multi-color "G" mark - the standard way to label a (currently
// disabled) Google sign-in entry point; lucide-react ships no brand icons.
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 35.1 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.6 39.6 16.3 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.4 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

// Reuses the existing /api/auth/login endpoint (Part 21), same as
// admin-panel - the only difference is which role is rejected: a Master
// Administrator's own login token grants no access here (Part B.2.1), the
// inverse of admin-panel's Master-Admin-only check.
//
// "Remember me" is visual only: sessions already persist for 7 days via
// an httpOnly refresh cookie regardless of this checkbox (Part D.1.4) -
// making it actually change session length would be an auth behavior
// change, out of scope for this redesign.
//
// "Continue with Google" is part of the reference design but there is no
// Google OAuth integration in this project - shown disabled with a "Soon"
// badge (the same pattern the Store Dashboard sidebar already uses for
// Analytics) rather than a button that pretends to sign anyone in.
export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <SignInLayout>
      <form onSubmit={handleSubmit} className="rounded-xl border border-border-default bg-surface-card p-8 shadow-card">
        <h1 className="mb-1 text-xl font-bold tracking-tight text-text-primary">Sign In</h1>
        <p className="mb-6 text-sm text-text-secondary">Welcome back! Please enter your details to continue.</p>

        <div className="space-y-4">
          <Input
            label="Email address"
            type="email"
            required
            autoComplete="username"
            icon={<Mail size={16} aria-hidden="true" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-primary">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" aria-hidden="true" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldClass}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-disabled transition-colors hover:text-text-secondary"
              >
                {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
          </div>
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
          <LogIn size={15} aria-hidden="true" />
          Sign In
        </Button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border-default" />
          <span className="text-xs text-text-secondary">or</span>
          <div className="h-px flex-1 bg-border-default" />
        </div>

        <button
          type="button"
          disabled
          title="Coming soon"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-default bg-surface-card py-2.5 text-sm font-medium text-text-secondary opacity-60 disabled:cursor-not-allowed"
        >
          <GoogleIcon />
          Continue with Google
          <span className="rounded-full bg-surface-sunken px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Soon</span>
        </button>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Don't have an account?{" "}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </SignInLayout>
  );
}

import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, KeyRound, Lock, LogIn, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@commerceos/ui";
import { login } from "../api/auth";
import { ApiError } from "../lib/api-client";
import { useAuthStore } from "../stores/auth.store";
import { AdminSignInLayout } from "../components/AdminSignInLayout";

const fieldClass =
  "w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-9 pr-10 text-sm text-white placeholder:text-white/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/60";

// Reuses the existing /api/auth/login endpoint (Part 21) - the only
// difference from the Store Dashboard's login is that access to every page
// past this one requires role === MASTER_ADMIN, enforced both here (a
// friendlier inline message) and, authoritatively, server-side.
//
// "Remember me" is visual only, same precedent as the Store Dashboard's
// LoginPage: sessions already persist via an httpOnly refresh cookie
// regardless of this checkbox, so wiring it up would be an auth behavior
// change, out of scope for this visual-only redesign.
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
    <AdminSignInLayout>
      <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-500 shadow-lg shadow-primary/30">
            <ShieldCheck size={26} className="text-white" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Admin <span className="bg-gradient-to-r from-primary-hover to-blue-400 bg-clip-text text-transparent">Sign In</span>
          </h1>
          <p className="mt-1 text-sm text-white/50">Access your CommerceOS admin panel</p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-white/80">
              Email Address
            </label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" aria-hidden="true" />
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-white/80">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" aria-hidden="true" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldClass}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/60"
              >
                {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 mt-4 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-white/60">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-sm font-medium text-primary-hover hover:text-blue-400 hover:underline">
            Forgot password?
          </Link>
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-lg border border-status-danger/30 bg-status-danger/10 px-3.5 py-2.5 text-sm text-status-danger">
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          loading={submitting}
          className="w-full bg-gradient-to-r from-primary to-blue-500 shadow-lg shadow-primary/30 hover:opacity-95"
        >
          <LogIn size={15} aria-hidden="true" />
          Sign In
        </Button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-white/40">OR</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <Link
          to="/admin-signup"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <KeyRound size={15} aria-hidden="true" />
          Create a master admin account
        </Link>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-white/40">
          <ShieldCheck size={12} aria-hidden="true" />
          Secure access <span aria-hidden="true">•</span> CommerceOS Admin
        </p>
      </form>
    </AdminSignInLayout>
  );
}

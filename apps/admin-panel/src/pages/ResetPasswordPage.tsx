import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, KeyRound, ShieldAlert } from "lucide-react";
import { Button } from "@commerceos/ui";
import { confirmPasswordReset } from "../api/auth";
import { ApiError } from "../lib/api-client";

const PASSWORD_MIN_LENGTH = 8;

// Same generic /api/auth/password/reset-confirm endpoint as the Store
// Dashboard's ResetPasswordPage - the token/confirm logic has no
// role-specific assumptions, so this is the same approach, just its own
// file since apps/admin-panel and apps/store-dashboard are separate apps.
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return <InvalidTokenNotice />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(token, password);
      setSuccess(true);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      if (err instanceof ApiError && err.code === "INVALID_RESET_TOKEN") {
        setError("This reset link has expired or already been used — request a new one.");
      } else {
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-admin-sidebar px-4">
        <div className="w-full max-w-sm rounded-lg bg-surface-card p-8 text-center shadow-lg">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-status-success" aria-hidden="true" />
          <h1 className="mb-2 text-lg font-semibold text-text-primary">Password updated</h1>
          <p className="text-sm text-text-secondary">Redirecting you to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-admin-sidebar px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg bg-surface-card p-8 shadow-lg">
        <KeyRound size={28} className="mb-3 text-primary" aria-hidden="true" />
        <h1 className="mb-1 text-lg font-semibold text-text-primary">Set a new password</h1>
        <p className="mb-6 text-sm text-text-secondary">Choose a new password for your account.</p>

        <label htmlFor="password" className="mb-1 block text-sm font-medium text-text-primary">
          New password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-md border border-border-default px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />

        <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-text-primary">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mb-4 w-full rounded-md border border-border-default px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />

        {error && (
          <p role="alert" className="mb-4 text-sm text-status-danger">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" loading={submitting} className="w-full">
          Reset password
        </Button>

        <p className="mt-4 text-center text-sm text-text-secondary">
          <Link to="/login" className="font-medium text-primary hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

function InvalidTokenNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-admin-sidebar px-4">
      <div className="w-full max-w-sm rounded-lg bg-surface-card p-8 text-center shadow-lg">
        <ShieldAlert size={40} className="mx-auto mb-3 text-status-danger" aria-hidden="true" />
        <h1 className="mb-2 text-lg font-semibold text-text-primary">Invalid reset link</h1>
        <p className="mb-6 text-sm text-text-secondary">
          This reset link has expired or already been used — request a new one.
        </p>
        <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
          Request a new link →
        </Link>
      </div>
    </div>
  );
}

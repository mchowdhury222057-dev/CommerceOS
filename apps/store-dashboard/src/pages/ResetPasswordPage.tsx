import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, KeyRound, ShieldAlert } from "lucide-react";
import { Button } from "@commerceos/ui";
import { confirmPasswordReset } from "../api/auth";
import { ApiError } from "../lib/api-client";
import { AuthLayout } from "../components/AuthLayout";
import { Input } from "../components/ui/Input";

const PASSWORD_MIN_LENGTH = 8;

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
      <AuthLayout>
        <div className="rounded-xl border border-border-default bg-surface-card p-8 text-center shadow-card">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-status-success" aria-hidden="true" />
          <h1 className="mb-2 text-xl font-bold tracking-tight text-text-primary">Password updated</h1>
          <p className="text-sm text-text-secondary">Redirecting you to sign in…</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="rounded-xl border border-border-default bg-surface-card p-8 shadow-card">
        <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <KeyRound size={18} aria-hidden="true" />
        </span>
        <h1 className="mb-1 text-xl font-bold tracking-tight text-text-primary">Set a new password</h1>
        <p className="mb-6 text-sm text-text-secondary">Choose a new password for your account.</p>

        <div className="space-y-4">
          <Input label="New password" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Input
            label="Confirm new password"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-status-danger/10 px-3.5 py-2.5 text-sm text-status-danger">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" loading={submitting} className="mt-4 w-full">
          Reset password
        </Button>

        <p className="mt-6 text-center text-sm text-text-secondary">
          <Link to="/login" className="font-medium text-primary hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

function InvalidTokenNotice() {
  return (
    <AuthLayout>
      <div className="rounded-xl border border-border-default bg-surface-card p-8 text-center shadow-card">
        <ShieldAlert size={40} className="mx-auto mb-3 text-status-danger" aria-hidden="true" />
        <h1 className="mb-2 text-xl font-bold tracking-tight text-text-primary">Invalid reset link</h1>
        <p className="mb-6 text-sm text-text-secondary">This reset link has expired or already been used — request a new one.</p>
        <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
          Request a new link →
        </Link>
      </div>
    </AuthLayout>
  );
}

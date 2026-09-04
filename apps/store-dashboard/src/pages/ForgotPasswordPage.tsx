import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { Button } from "@commerceos/ui";
import { requestPasswordReset } from "../api/auth";
import { ApiError } from "../lib/api-client";
import { AuthLayout } from "../components/AuthLayout";
import { Input } from "../components/ui/Input";

// Per SRS Part D.1.5 - the response message is identical whether or not the
// account exists (never confirm/deny an email is registered). `resetLink`
// is a DEV ONLY addition (apps/api's auth.routes.ts) standing in for the
// real email this link would otherwise arrive by - shown here in a
// clearly-marked box so the whole flow is testable without email infra.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await requestPasswordReset(email);
      setMessage(result.message);
      setResetLink(result.resetLink ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="rounded-xl border border-border-default bg-surface-card p-8 shadow-card">
        <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <KeyRound size={18} aria-hidden="true" />
        </span>
        <h1 className="mb-1 text-xl font-bold tracking-tight text-text-primary">Reset your password</h1>
        <p className="mb-6 text-sm text-text-secondary">Enter the email on your account and we'll generate a reset link.</p>

        {message ? (
          <div>
            <p className="mb-4 rounded-lg bg-primary-subtle px-3.5 py-2.5 text-sm text-text-primary">{message}</p>
            {resetLink && (
              <div className="mb-4 rounded-lg border border-dashed border-amber-400 bg-amber-50 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Dev Mode — no email sending yet</p>
                <p className="mb-2 text-xs text-amber-800">In production this link would be emailed. For now, use it directly:</p>
                <a href={resetLink} className="break-all text-xs font-medium text-amber-900 underline hover:no-underline">
                  {resetLink}
                </a>
              </div>
            )}
            <Link to="/login" className="text-sm font-medium text-primary hover:underline">
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <Input label="Email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />

            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-status-danger/10 px-3.5 py-2.5 text-sm text-status-danger">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" loading={submitting} className="mt-4 w-full">
              Send reset link
            </Button>

            <p className="mt-6 text-center text-sm text-text-secondary">
              <Link to="/login" className="font-medium text-primary hover:underline">
                ← Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}

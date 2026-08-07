import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { Button } from "@commerceos/ui";
import { requestPasswordReset } from "../api/auth";
import { ApiError } from "../lib/api-client";

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
    <div className="flex min-h-screen items-center justify-center bg-surface-page px-4">
      <div className="w-full max-w-sm rounded-lg bg-surface-card p-8 shadow-lg">
        <KeyRound size={28} className="mb-3 text-primary" aria-hidden="true" />
        <h1 className="mb-1 text-lg font-semibold text-text-primary">Reset your password</h1>
        <p className="mb-6 text-sm text-text-secondary">
          Enter the email on your account and we'll generate a reset link.
        </p>

        {message ? (
          <div>
            <p className="mb-4 rounded-md bg-primary-subtle p-3 text-sm text-text-primary">{message}</p>
            {resetLink && (
              <div className="mb-4 rounded-md border border-dashed border-amber-400 bg-amber-50 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Dev Mode — no email sending yet
                </p>
                <p className="mb-2 text-xs text-amber-800">
                  In production this link would be emailed. For now, use it directly:
                </p>
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
              className="mb-4 w-full rounded-md border border-border-default px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            />

            {error && (
              <p role="alert" className="mb-4 text-sm text-status-danger">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" loading={submitting} className="w-full">
              Send reset link
            </Button>

            <p className="mt-4 text-center text-sm text-text-secondary">
              <Link to="/login" className="font-medium text-primary hover:underline">
                ← Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

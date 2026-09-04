import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { Button } from "@commerceos/ui";
import { adminSignup } from "../api/auth";
import { ApiError } from "../lib/api-client";
import { useAuthStore } from "../stores/auth.store";

// Per Part 4/20.1 - this is NOT open public signup: it only succeeds with
// the correct ADMIN_SETUP_KEY (apps/api's .env), known only to whoever is
// already running the platform. The setup-key field is labeled explicitly
// so nobody mistakes this for a self-service account creation flow.
export default function AdminSignupPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupKey, setSetupKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await adminSignup({ name, email, password, setupKey });
      setSession(result.accessToken, result.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-admin-sidebar px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg bg-surface-card p-8 shadow-lg">
        <h1 className="mb-1 text-lg font-semibold text-text-primary">Super Admin Panel</h1>
        <p className="mb-6 text-sm text-text-secondary">Create a Master Administrator account</p>

        <label htmlFor="name" className="mb-1 block text-sm font-medium text-text-primary">
          Name
        </label>
        <input
          id="name"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4 w-full rounded-md border border-border-default bg-surface-card px-3 py-2 text-sm text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />

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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-md border border-border-default bg-surface-card px-3 py-2 text-sm text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />

        <div className="mb-4 rounded-md border border-dashed border-amber-400 bg-amber-50 p-3">
          <label htmlFor="setupKey" className="mb-1 flex items-center gap-1.5 text-sm font-medium text-amber-900">
            <KeyRound size={14} aria-hidden="true" />
            Setup Key
          </label>
          <p className="mb-2 text-xs text-amber-800">Provided by your platform administrator — not a public field.</p>
          <input
            id="setupKey"
            type="password"
            required
            value={setupKey}
            onChange={(e) => setSetupKey(e.target.value)}
            className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-amber-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          />
        </div>

        {error && (
          <p role="alert" className="mb-4 text-sm text-status-danger">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" loading={submitting} className="w-full">
          Create account
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

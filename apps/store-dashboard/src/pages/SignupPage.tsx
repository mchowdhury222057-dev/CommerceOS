import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@commerceos/ui";
import { signup } from "../api/auth";
import { ApiError } from "../lib/api-client";
import { useAuthStore } from "../stores/auth.store";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Per SRS Part 6.1 - the self-signup path, alongside (not replacing) the
// Master Admin's "+ Create Store" flow. Creates the owner's account and
// their store's shell in one step; the store lands in Pending Setup, which
// the app-level status gate (see DashboardPage) already handles regardless
// of how the store came to exist.
export default function SignupPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleStoreNameChange(value: string) {
    setStoreName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(slugify(value));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!slug) {
      setError("Store slug is required.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signup({ storeName, slug, ownerName, email, password });
      setSession(result.accessToken, result.user);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.code === "RATE_LIMITED" ? "Too many attempts - please wait and try again." : err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-page py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg bg-surface-card p-8 shadow-lg">
        <h1 className="mb-1 text-lg font-semibold text-text-primary">Create your store</h1>
        <p className="mb-6 text-sm text-text-secondary">Set up your account and store in one step.</p>

        <Field label="Store name" value={storeName} onChange={handleStoreNameChange} required />
        <Field
          label="Store URL"
          value={slug}
          onChange={handleSlugChange}
          required
          prefix="commerceos.dev/"
        />
        <Field label="Your name" value={ownerName} onChange={setOwnerName} required />
        <Field label="Email" type="email" value={email} onChange={setEmail} required autoComplete="username" />
        <Field label="Password" type="password" value={password} onChange={setPassword} required autoComplete="new-password" />
        <Field
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
          autoComplete="new-password"
        />

        {error && (
          <p role="alert" className="mb-4 text-sm text-status-danger">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" loading={submitting} className="w-full">
          Create Store
        </Button>

        <p className="mt-4 text-center text-sm text-text-secondary">
          Already have a store?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  prefix?: string;
}) {
  return (
    <label className="mb-4 block text-sm">
      <span className="mb-1 block font-medium text-text-primary">{props.label}</span>
      {props.prefix ? (
        <div className="flex items-center rounded-md border border-border-default focus-within:outline focus-within:outline-2 focus-within:outline-primary">
          <span className="pl-3 text-sm text-text-secondary">{props.prefix}</span>
          <input
            type="text"
            required={props.required}
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            className="w-full rounded-md px-2 py-2 text-sm outline-none"
          />
        </div>
      ) : (
        <input
          type={props.type ?? "text"}
          required={props.required}
          autoComplete={props.autoComplete}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          className="w-full rounded-md border border-border-default px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />
      )}
    </label>
  );
}

import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@commerceos/ui";
import { signup } from "../api/auth";
import { ApiError } from "../lib/api-client";
import { useAuthStore } from "../stores/auth.store";
import { AuthLayout } from "../components/AuthLayout";
import { Input } from "../components/ui/Input";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Per SRS Part 6.1 and this milestone's merchant verification workflow -
// the self-signup path, alongside (not replacing) the Master Admin's
// "+ Create Store" flow. Creates the owner's account and their store's
// shell in one step; the store lands in PENDING and the owner is routed
// to StoreAccessGate's Pending Approval screen, not the real Dashboard -
// a verification email is sent from here to complete before an admin can
// approve. Collects Phone Number now too (Section 3) - NOT sensitive
// verification info (NID etc.), just a contact number.
export default function SignupPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
      const result = await signup({ storeName, slug, ownerName, email, phone, password });
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
    <AuthLayout>
      <form onSubmit={handleSubmit} className="rounded-xl border border-border-default bg-surface-card p-8 shadow-card">
        <h1 className="mb-1 text-xl font-bold tracking-tight text-text-primary">Create your store</h1>
        <p className="mb-6 text-sm text-text-secondary">Set up your account and store in one step.</p>

        <div className="space-y-4">
          <Input label="Store name" value={storeName} onChange={(e) => handleStoreNameChange(e.target.value)} required />
          <div>
            <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-text-primary">
              Store URL
            </label>
            <div className="flex items-center overflow-hidden rounded-lg border border-border-default bg-surface-card transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/40">
              <span className="pl-3.5 text-sm text-text-secondary">commerceos.dev/</span>
              <input
                id="slug"
                type="text"
                required
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="w-full bg-transparent py-2.5 pl-1 pr-3.5 text-sm text-text-primary outline-none"
              />
            </div>
          </div>
          <Input label="Your name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
          <Input label="Phone number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
          <Input
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-status-danger/10 px-3.5 py-2.5 text-sm text-status-danger">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" loading={submitting} className="mt-5 w-full">
          Create Store
        </Button>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Already have a store?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

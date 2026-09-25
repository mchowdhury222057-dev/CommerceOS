import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Lock, Phone, User } from "lucide-react";
import { Button } from "@commerceos/ui";
import { customerSignup } from "../api/storefront";
import { ApiError } from "../lib/api-client";
import { useCustomerAuth } from "../account/CustomerAuthContext";
import { AuthCard, AuthField } from "../account/AuthCard";
import { redirectTarget } from "../account/redirect";

export default function AccountSignupPage() {
  const { storeSlug = "" } = useParams();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect");
  const navigate = useNavigate();
  const { customer, signIn } = useCustomerAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (customer) return <Navigate to={redirectTarget(storeSlug, redirect)} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^[0-9+\-\s]{7,20}$/.test(phone.trim())) {
      setError("Please enter a valid phone number.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      signIn(await customerSignup(storeSlug, { name: name.trim(), phone: phone.trim(), password }));
      navigate(redirectTarget(storeSlug, redirect), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === "RATE_LIMITED") setError("Too many attempts - please wait a minute and try again.");
      else setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const loginHref = `/${storeSlug}/account/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`;

  return (
    <AuthCard title="Create your account" subtitle="You need an account to place orders. It only takes a moment.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Full name" icon={User} autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <AuthField label="Phone number" icon={Phone} type="tel" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
        <AuthField label="Password" icon={Lock} type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
        <AuthField label="Confirm password" icon={Lock} type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />

        {error && (
          <p role="alert" className="rounded-lg bg-status-danger/10 px-3.5 py-2.5 text-sm text-status-danger">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full shadow-md shadow-primary/20">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link to={loginHref} className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}

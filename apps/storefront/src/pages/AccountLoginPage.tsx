import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Lock, Phone } from "lucide-react";
import { Button } from "@commerceos/ui";
import { customerLogin } from "../api/storefront";
import { ApiError } from "../lib/api-client";
import { useCustomerAuth } from "../account/CustomerAuthContext";
import { AuthCard, AuthField } from "../account/AuthCard";
import { redirectTarget } from "../account/redirect";

export default function AccountLoginPage() {
  const { storeSlug = "" } = useParams();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect");
  const navigate = useNavigate();
  const { customer, signIn } = useCustomerAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (customer) return <Navigate to={redirectTarget(storeSlug, redirect)} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      signIn(await customerLogin(storeSlug, { phone: phone.trim(), password }));
      navigate(redirectTarget(storeSlug, redirect), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === "RATE_LIMITED") setError("Too many attempts - please wait a minute and try again.");
      else setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const signupHref = `/${storeSlug}/account/signup${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`;

  return (
    <AuthCard
      title="Sign in"
      subtitle={redirect === "checkout" ? "Sign in to your account to place your order." : "Welcome back! Sign in to your account."}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Phone number" icon={Phone} type="tel" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
        <AuthField label="Password" icon={Lock} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />

        {error && (
          <p role="alert" className="rounded-lg bg-status-danger/10 px-3.5 py-2.5 text-sm text-status-danger">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full shadow-md shadow-primary/20">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        New here?{" "}
        <Link to={signupHref} className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}

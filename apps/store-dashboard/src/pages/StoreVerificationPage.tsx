import { useEffect, useId, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Button } from "@commerceos/ui";
import { PHONE_PATTERN } from "@commerceos/types";
import { Check, Clock, Loader2, ShieldAlert, ShieldCheck, Upload } from "lucide-react";
import { getVerificationByToken, submitVerification } from "../api/verification";
import { ApiError } from "../lib/api-client";
import { toast } from "../components/ui/Toaster";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { Input, Textarea } from "../components/ui/Input";
import { cn } from "../lib/cn";

const STEPS = ["Account", "Identity", "Business", "Documents", "Submit"] as const;
const ACCEPT = "image/*,application/pdf";
const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface FormValues {
  fullName: string;
  phone: string;
  nidNumber: string;
  businessType: string;
  businessAddress: string;
  description: string;
  tradeLicenseNumber: string;
}

const DEFAULT_VALUES: FormValues = {
  fullName: "",
  phone: "",
  nidNumber: "",
  businessType: "",
  businessAddress: "",
  description: "",
  tradeLicenseNumber: "",
};

function BrandHeader() {
  return (
    <div className="mb-8 flex items-center justify-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">C</span>
      <span className="text-lg font-bold tracking-tight text-text-primary">CommerceOS</span>
    </div>
  );
}

function CenteredNotice({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-page px-4">
      <BrandHeader />
      <div className="w-full max-w-sm rounded-xl border border-border-default bg-surface-card p-8 text-center shadow-card">
        <div className="mb-4 flex justify-center">{icon}</div>
        <h1 className="mb-2 text-lg font-bold text-text-primary">{title}</h1>
        <div className="text-sm leading-relaxed text-text-secondary">{children}</div>
      </div>
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex items-center">
      {STEPS.map((label, i) => {
        const isDone = i < current;
        const isCurrent = i === current;
        return (
          <li key={label} className={cn("flex items-center", i < STEPS.length - 1 && "flex-1")}>
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  isDone && "bg-primary text-white",
                  isCurrent && !isDone && "border-2 border-primary text-primary",
                  !isDone && !isCurrent && "border border-border-default text-text-disabled",
                )}
              >
                {isDone ? <Check size={14} aria-hidden="true" /> : i + 1}
              </span>
              <span className={cn("hidden text-xs font-medium sm:block", isCurrent ? "text-text-primary" : "text-text-secondary")}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={cn("mx-2 h-0.5 flex-1", isDone ? "bg-primary" : "bg-border-default")} />}
          </li>
        );
      })}
    </ol>
  );
}

function DocumentUpload({
  label,
  hint,
  required,
  file,
  onChange,
  error,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  file: File | null;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-text-primary">
        {label}
        {required && <span className="ml-0.5 text-status-danger">*</span>}
      </label>
      <label
        htmlFor={id}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-lg border border-dashed bg-surface-sunken px-3.5 py-3 text-sm transition-colors hover:border-primary hover:text-text-primary",
          error ? "border-status-danger text-status-danger" : "border-border-default text-text-secondary",
        )}
      >
        <Upload size={16} aria-hidden="true" className="shrink-0" />
        <span className="truncate">{file ? file.name : "Choose a file (image or PDF, max 5MB)"}</span>
      </label>
      <input id={id} type="file" accept={ACCEPT} onChange={onChange} className="sr-only" />
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-status-danger">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-text-secondary">{hint}</p>
      )}
    </div>
  );
}

// Per Section 10/11 - the multi-step form the owner reaches from the
// verification-required email. Public route (Section 7): the token in the
// URL is the credential, so this page works even if the owner isn't logged
// in on this device/browser. Account -> Identity -> Business -> Documents
// -> Submit, per Section 10's exact progress indicator order.
export default function StoreVerificationPage() {
  const { token = "" } = useParams<{ token: string }>();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [nidDocument, setNidDocument] = useState<File | null>(null);
  const [tradeLicenseDocument, setTradeLicenseDocument] = useState<File | null>(null);
  const [supportingDocument, setSupportingDocument] = useState<File | null>(null);
  const [nidDocumentError, setNidDocumentError] = useState<string | null>(null);

  const tokenQuery = useQuery({
    queryKey: ["verification-token", token],
    queryFn: () => getVerificationByToken(token),
    enabled: Boolean(token),
    retry: false,
  });

  const {
    register,
    handleSubmit,
    trigger,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: DEFAULT_VALUES });

  // Prefill the owner's name once the token resolves - still editable, in
  // case it needs correcting for the verification record.
  useEffect(() => {
    if (tokenQuery.data) reset({ ...DEFAULT_VALUES, fullName: tokenQuery.data.ownerName });
  }, [tokenQuery.data, reset]);

  const submitMutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!nidDocument) throw new Error("NID document is required");
      return submitVerification(token, {
        fullName: values.fullName,
        phone: values.phone,
        nidNumber: values.nidNumber,
        businessType: values.businessType || undefined,
        businessAddress: values.businessAddress || undefined,
        description: values.description || undefined,
        tradeLicenseNumber: values.tradeLicenseNumber || undefined,
        nidDocument,
        tradeLicenseDocument: tradeLicenseDocument ?? undefined,
        supportingDocument: supportingDocument ?? undefined,
      });
    },
    onSuccess: () => setSubmitted(true),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not submit verification. Please try again."),
  });

  function handleFileChange(setFile: (f: File | null) => void) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      if (file && file.size > MAX_FILE_BYTES) {
        toast.error("File must be 5MB or smaller.");
        e.target.value = "";
        setFile(null);
        return;
      }
      setFile(file);
      if (file) setNidDocumentError(null);
    };
  }

  async function handleNext() {
    if (step === 0) {
      const ok = await trigger(["fullName", "phone"]);
      if (!ok) return;
    }
    if (step === 1) {
      const ok = await trigger(["nidNumber"]);
      if (!ok) return;
      if (!nidDocument) {
        setNidDocumentError("An NID document is required");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  if (tokenQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  if (tokenQuery.isError || !tokenQuery.data) {
    const message = tokenQuery.error instanceof ApiError ? tokenQuery.error.message : "This verification link is invalid or has expired.";
    return (
      <CenteredNotice icon={<ShieldAlert size={40} className="text-status-danger" aria-hidden="true" />} title="Link unavailable">
        <p>{message}</p>
        <p className="mt-2">Please check your email for the most recent verification link, or contact support if the problem continues.</p>
      </CenteredNotice>
    );
  }

  if (submitted) {
    return (
      <CenteredNotice icon={<ShieldCheck size={40} className="text-primary" aria-hidden="true" />} title="Verification Submitted">
        <p>Thanks - your verification details have been submitted for {tokenQuery.data.storeName}.</p>
        <p className="mt-2 flex items-center justify-center gap-1.5 font-medium text-text-primary">
          <Clock size={14} aria-hidden="true" />
          Under review by our team
        </p>
        <p className="mt-2">We'll email you as soon as a decision is made. You can close this page.</p>
        <Link to="/login" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Return to sign in
        </Link>
      </CenteredNotice>
    );
  }

  const values = watch();

  return (
    <div className="min-h-screen bg-surface-page px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <BrandHeader />
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-base">Complete your store verification</CardTitle>
              <p className="mt-1 text-sm text-text-secondary">{tokenQuery.data.storeName} - this only takes a few minutes.</p>
            </div>
          </CardHeader>
          <CardBody>
            <Stepper current={step} />

            <form onSubmit={handleSubmit((v) => submitMutation.mutate(v))}>
              {step === 0 && (
                <div className="space-y-4">
                  <Input
                    label="Full name"
                    required
                    error={errors.fullName?.message}
                    {...register("fullName", { required: "Full name is required", maxLength: { value: 200, message: "Too long" } })}
                  />
                  <Input
                    label="Phone number"
                    type="tel"
                    required
                    error={errors.phone?.message}
                    {...register("phone", { required: "Phone number is required", pattern: { value: PHONE_PATTERN, message: "Enter a valid phone number" } })}
                  />
                  <Input label="Email" value={tokenQuery.data.ownerEmail} disabled readOnly />
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <Input
                    label="NID number"
                    required
                    hint="Your National ID number, for identity verification."
                    error={errors.nidNumber?.message}
                    {...register("nidNumber", { required: "NID number is required", maxLength: { value: 50, message: "Too long" } })}
                  />
                  <DocumentUpload
                    label="NID document"
                    required
                    hint="A clear photo or scan of your National ID card."
                    file={nidDocument}
                    onChange={handleFileChange(setNidDocument)}
                    error={nidDocumentError ?? undefined}
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <Input label="Store name" value={tokenQuery.data.storeName} disabled readOnly />
                  <Input label="Business type" hint="Optional - e.g. Sole proprietorship, Partnership." {...register("businessType", { maxLength: 200 })} />
                  <Textarea label="Business address" rows={2} {...register("businessAddress", { maxLength: 500 })} />
                  <Textarea label="Description" hint="A short description of what your store sells." rows={3} {...register("description", { maxLength: 1000 })} />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <Input label="Trade license number" hint="If applicable." {...register("tradeLicenseNumber", { maxLength: 100 })} />
                  <DocumentUpload
                    label="Trade license document"
                    hint="Optional - if your business has a registered trade license."
                    file={tradeLicenseDocument}
                    onChange={handleFileChange(setTradeLicenseDocument)}
                  />
                  <DocumentUpload
                    label="Supporting document"
                    hint="Optional - any other document that helps verify your business."
                    file={supportingDocument}
                    onChange={handleFileChange(setSupportingDocument)}
                  />
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3">
                  <p className="text-sm text-text-secondary">Please review your details before submitting.</p>
                  <div className="space-y-2 rounded-lg border border-border-default p-4 text-sm">
                    <ReviewRow label="Full name" value={values.fullName} />
                    <ReviewRow label="Phone" value={values.phone} />
                    <ReviewRow label="NID number" value={values.nidNumber} />
                    <ReviewRow label="NID document" value={nidDocument?.name ?? "-"} />
                    <ReviewRow label="Business type" value={values.businessType || "-"} />
                    <ReviewRow label="Business address" value={values.businessAddress || "-"} />
                    <ReviewRow label="Trade license number" value={values.tradeLicenseNumber || "-"} />
                    <ReviewRow label="Trade license document" value={tradeLicenseDocument?.name ?? "-"} />
                    <ReviewRow label="Supporting document" value={supportingDocument?.name ?? "-"} />
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between border-t border-border-default pt-5">
                <Button type="button" variant="secondary" onClick={handleBack} disabled={step === 0}>
                  Back
                </Button>
                {step < STEPS.length - 1 ? (
                  <Button type="button" variant="primary" onClick={handleNext}>
                    Continue
                  </Button>
                ) : (
                  <Button type="submit" variant="primary" loading={submitMutation.isPending}>
                    Submit verification
                  </Button>
                )}
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-text-secondary">{label}</span>
      <span className="text-right font-medium text-text-primary">{value}</span>
    </div>
  );
}

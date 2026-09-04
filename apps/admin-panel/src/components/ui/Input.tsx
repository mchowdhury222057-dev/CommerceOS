import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

const fieldClass =
  "w-full rounded-lg border border-border-default bg-surface-card px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-disabled transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50";

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  id: string;
  children: ReactNode;
}

function FieldWrapper({ label, error, hint, required, id, children }: FieldWrapperProps) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-text-primary">
          {label}
          {required && <span className="ml-0.5 text-status-danger">*</span>}
        </label>
      )}
      {children}
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

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, icon, required, className, id, ...rest },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required} id={fieldId}>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled">{icon}</span>}
        <input
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={Boolean(error)}
          className={cn(fieldClass, icon && "pl-9", error && "border-status-danger focus-visible:ring-status-danger/30", className)}
          {...rest}
        />
      </div>
    </FieldWrapper>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, required, className, id, ...rest },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required} id={fieldId}>
      <textarea
        ref={ref}
        id={fieldId}
        required={required}
        aria-invalid={Boolean(error)}
        className={cn(fieldClass, "resize-none", error && "border-status-danger focus-visible:ring-status-danger/30", className)}
        {...rest}
      />
    </FieldWrapper>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, required, className, id, children, ...rest },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required} id={fieldId}>
      <select
        ref={ref}
        id={fieldId}
        required={required}
        aria-invalid={Boolean(error)}
        className={cn(fieldClass, "appearance-none bg-no-repeat", error && "border-status-danger focus-visible:ring-status-danger/30", className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
          backgroundPosition: "right 0.75rem center",
          backgroundSize: "16px",
          paddingRight: "2.25rem",
        }}
        {...rest}
      >
        {children}
      </select>
    </FieldWrapper>
  );
});

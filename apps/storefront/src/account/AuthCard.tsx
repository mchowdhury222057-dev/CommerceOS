import type { InputHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-16">
      <div className="animate-fade-in-up rounded-2xl border border-border-default bg-surface-card p-6 shadow-sm sm:p-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-text-primary">{title}</h1>
        <p className="mb-6 mt-1 text-sm text-text-secondary">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

export function AuthField({ label, icon: Icon, ...inputProps }: { label: string; icon: LucideIcon } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 flex items-center gap-1.5 font-medium text-text-primary">
        <Icon size={14} className="text-text-secondary" aria-hidden="true" />
        {label}
      </span>
      <input
        {...inputProps}
        className="w-full rounded-lg border border-border-default bg-surface-card px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-disabled transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      />
    </label>
  );
}

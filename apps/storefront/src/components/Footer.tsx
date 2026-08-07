import { Mail } from "lucide-react";

export function Footer({ storeName }: { storeName: string }) {
  return (
    <footer className="mt-16 border-t border-border-default bg-surface-card">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <span className="text-lg font-bold tracking-tight text-text-primary">{storeName}</span>
          <a href="mailto:support@example.com" className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary">
            <Mail size={16} aria-hidden="true" />
            support@example.com
          </a>
        </div>
        <p className="border-t border-border-default pt-4 text-xs text-text-disabled">
          © {new Date().getFullYear()} {storeName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

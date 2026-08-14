import type { ReactNode } from "react";

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-sunken text-text-secondary" aria-hidden="true">
        {icon}
      </div>
      <p className="mb-1 text-sm font-semibold text-text-primary">{title}</p>
      {description && <p className="mb-4 max-w-xs text-sm text-text-secondary">{description}</p>}
      {action}
    </div>
  );
}

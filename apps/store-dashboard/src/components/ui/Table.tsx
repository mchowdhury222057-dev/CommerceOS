import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-default bg-surface-card shadow-card">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-surface-sunken text-xs font-semibold uppercase tracking-wide text-text-secondary">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border-default">{children}</tbody>;
}

export interface TRProps extends HTMLAttributes<HTMLTableRowElement> {
  clickable?: boolean;
}

export function TR({ className, clickable = false, ...rest }: TRProps) {
  return (
    <tr
      className={cn("transition-colors hover:bg-surface-sunken/60", clickable && "cursor-pointer", className)}
      {...rest}
    />
  );
}

export function TH({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-4 py-3", className)} {...rest} />;
}

export function TD({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3.5 text-text-primary", className)} {...rest} />;
}

export function TableState({ colSpan, children, tone = "secondary" }: { colSpan: number; children: ReactNode; tone?: "secondary" | "danger" }) {
  return (
    <tr>
      <td colSpan={colSpan} className={cn("px-4 py-12 text-center text-sm", tone === "danger" ? "text-status-danger" : "text-text-secondary")}>
        {children}
      </td>
    </tr>
  );
}

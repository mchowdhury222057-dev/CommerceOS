import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

// Local to this app (not @commerceos/ui's StatusBadge) so tone colors run
// through this app's own dark-mode-aware tokens instead of StatusBadge's
// hardcoded per-tone hex text color, which doesn't adapt to dark mode.
export type BadgeTone = "success" | "caution" | "danger" | "info" | "neutral" | "primary";

const toneClass: Record<BadgeTone, string> = {
  success: "bg-status-success/10 text-status-success",
  caution: "bg-status-caution/10 text-status-caution",
  danger: "bg-status-danger/10 text-status-danger",
  info: "bg-status-info/10 text-status-info",
  neutral: "bg-status-neutral/10 text-status-neutral",
  primary: "bg-primary/10 text-primary",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone: BadgeTone;
  size?: "sm" | "md";
}

export function Badge({ tone, size = "md", className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        toneClass[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

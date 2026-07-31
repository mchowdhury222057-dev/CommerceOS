// Per SRS Addendum Part A.5.3 - status is never conveyed by colour alone; the
// risk badge additionally carries a distinct icon shape per Part A.5.4.
export type StatusTone = "success" | "caution" | "danger" | "info" | "neutral";

const toneClass: Record<StatusTone, string> = {
  success: "bg-status-success/10 text-[#166534]",
  caution: "bg-status-caution/10 text-[#92400E]",
  danger: "bg-status-danger/10 text-[#991B1B]",
  info: "bg-status-info/10 text-[#1E40AF]",
  neutral: "bg-status-neutral/10 text-[#334155]",
};

export interface StatusBadgeProps {
  tone: StatusTone;
  label: string;
  size?: "sm" | "md";
}

export function StatusBadge({ tone, label, size = "md" }: StatusBadgeProps) {
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${toneClass[tone]}`}>
      {label}
    </span>
  );
}

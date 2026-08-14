import { Phone } from "lucide-react";
import type { RiskLevel } from "../lib/api-types";

// Per SRS Part 10.2 / Part 22.14 - exact copy and treatment specified there:
// None renders nothing at all (not even a neutral pill); Caution is an amber
// pill; High Risk is a red pill carrying its own phone icon, since Part
// 22.14 calls this "the single most important piece of information" on any
// screen a flagged customer appears on - never buried, never color-alone.
export function RiskBadge({ level }: { level: RiskLevel }) {
  if (level === "NONE") return null;

  if (level === "CAUTION") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-status-caution/10 px-2.5 py-1 text-xs font-medium text-status-caution">
        Caution — 2+ past refusals
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-status-danger/10 px-2.5 py-1 text-xs font-medium text-status-danger">
      <Phone size={12} aria-hidden="true" />
      High Risk — confirm by phone
    </span>
  );
}

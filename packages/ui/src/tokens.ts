// Design tokens per SRS Addendum Part A.3-A.7/A.11.
// Single source of truth consumed by tailwind.config.ts in every app and by any
// inline JS/TS logic (e.g. chart colours) that needs a token value directly.

export const colorTokens = {
  primary: "#4F46E5",
  primaryHover: "#4338CA",
  primarySubtle: "#EEF2FF",
  adminSidebar: "#0F172A",
  amberImpersonation: "#F59E0B",

  surfacePage: "#F8FAFC",
  surfaceCard: "#FFFFFF",
  surfaceSunken: "#F1F5F9",
  borderDefault: "#E2E8F0",
  borderStrong: "#CBD5E1",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textDisabled: "#94A3B8",

  statusSuccess: "#16A34A",
  statusCaution: "#D97706",
  statusDanger: "#DC2626",
  statusInfo: "#2563EB",
  statusNeutral: "#64748B",
} as const;

export const spaceTokens = {
  0: "0px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
} as const;

export const radiusTokens = {
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  full: "9999px",
} as const;

export const shadowTokens = {
  elevation1: "0 1px 2px rgba(15,23,42,0.06)",
  elevation2: "0 2px 8px rgba(15,23,42,0.08)",
  elevation3: "0 8px 24px rgba(15,23,42,0.12)",
  elevation4: "0 16px 40px rgba(15,23,42,0.16)",
} as const;

export const motionTokens = {
  instant: "100ms ease-out",
  fast: "150ms ease-out",
  base: "200ms cubic-bezier(0.4,0,0.2,1)",
  slow: "300ms cubic-bezier(0.4,0,0.2,1)",
  banner: "400ms ease-in-out",
} as const;

export const breakpointTokens = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

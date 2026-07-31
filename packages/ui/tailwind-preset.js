// Shared Tailwind preset per SRS Addendum Part A.11 - every app extends this
// preset rather than redefining colour/spacing/radius scales locally.
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#4F46E5", hover: "#4338CA", subtle: "#EEF2FF" },
        "admin-sidebar": "#0F172A",
        // Reserved exclusively for impersonation UI (Part A.5.1) - never
        // reused for general warnings, so it stays visually unambiguous.
        "amber-impersonation": "#F59E0B",
        "surface-page": "#F8FAFC",
        "surface-card": "#FFFFFF",
        "surface-sunken": "#F1F5F9",
        "border-default": "#E2E8F0",
        "border-strong": "#CBD5E1",
        "text-primary": "#0F172A",
        "text-secondary": "#475569",
        "text-disabled": "#94A3B8",
        status: {
          success: "#16A34A",
          caution: "#D97706",
          danger: "#DC2626",
          info: "#2563EB",
          neutral: "#64748B",
        },
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      screens: {
        xs: "0px",
        sm: "480px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
      fontFamily: {
        sans: ["Inter var", "Noto Sans Bengali", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
      },
    },
  },
};

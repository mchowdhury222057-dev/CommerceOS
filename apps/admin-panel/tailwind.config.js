import preset from "@commerceos/ui/tailwind-preset.js";

// Overrides color/font/shadow tokens from the shared preset so every one
// resolves through a CSS custom property (see src/index.css) that flips
// under :root.dark - dark mode never needs a `dark:` variant on
// individual components. Non-color tokens (radius, spacing, screens)
// still come from the shared preset via `presets: [preset]`. Light-mode
// values are UNCHANGED from the preset's originals (same indigo, same
// status colors) - this is additive (dark-mode support), not a palette
// change.
//
// admin-sidebar / amber-impersonation are intentionally left as the
// preset's own static hex values (not converted to CSS vars) - the dark
// navy sidebar is a fixed identity marker, not something that should
// lighten when the admin's personal theme preference is Dark.
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  presets: [preset],
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          hover: "rgb(var(--color-primary-hover) / <alpha-value>)",
          subtle: "rgb(var(--color-primary-subtle) / <alpha-value>)",
        },
        "surface-page": "rgb(var(--color-surface-page) / <alpha-value>)",
        "surface-card": "rgb(var(--color-surface-card) / <alpha-value>)",
        "surface-sunken": "rgb(var(--color-surface-sunken) / <alpha-value>)",
        "border-default": "rgb(var(--color-border-default) / <alpha-value>)",
        "border-strong": "rgb(var(--color-border-strong) / <alpha-value>)",
        "text-primary": "rgb(var(--color-text-primary) / <alpha-value>)",
        "text-secondary": "rgb(var(--color-text-secondary) / <alpha-value>)",
        "text-disabled": "rgb(var(--color-text-disabled) / <alpha-value>)",
        status: {
          success: "rgb(var(--color-success) / <alpha-value>)",
          caution: "rgb(var(--color-caution) / <alpha-value>)",
          danger: "rgb(var(--color-danger) / <alpha-value>)",
          info: "rgb(var(--color-info) / <alpha-value>)",
          neutral: "rgb(var(--color-neutral) / <alpha-value>)",
        },
      },
      // The shared preset lists "Inter var" first, but no app ever
      // actually loaded that self-hosted variable font file - it silently
      // fell back to the system stack this whole time. This app now loads
      // the real (Google Fonts, static) "Inter" family via index.html.
      fontFamily: {
        sans: ["Inter", "-apple-system", "Segoe UI", "Roboto", "Noto Sans Bengali", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        popover: "var(--shadow-popover)",
      },
    },
  },
};

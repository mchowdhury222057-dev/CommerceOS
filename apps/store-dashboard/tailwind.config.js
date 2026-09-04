import preset from "@commerceos/ui/tailwind-preset.js";

// Deliberately overrides colors/fonts/shadows from the shared preset rather
// than just extending it - every color token here resolves through a CSS
// custom property (see src/index.css) that also flips under `:root.dark`,
// so dark mode never needs a `dark:` variant on individual components.
// Non-color tokens (radius, spacing, screens) still come from the shared
// preset via `presets: [preset]`. Scoped to this app only - admin-panel
// keeps the shared preset's original indigo/status values untouched.
//
// Colors use the rgb(var(--x) / <alpha-value>) form (not a bare var()) -
// Tailwind substitutes <alpha-value> with whatever opacity modifier is
// used (bg-primary/10, text-danger/60, etc.); a bare var() reference can't
// support that since Tailwind can't decompose an opaque CSS value into a
// blendable alpha channel at build time.
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
        sidebar: "rgb(var(--color-sidebar) / <alpha-value>)",
        "border-default": "rgb(var(--color-border-default) / <alpha-value>)",
        "border-strong": "rgb(var(--color-border-strong) / <alpha-value>)",
        "text-primary": "rgb(var(--color-text-primary) / <alpha-value>)",
        "text-secondary": "rgb(var(--color-text-secondary) / <alpha-value>)",
        "text-disabled": "rgb(var(--color-text-disabled) / <alpha-value>)",
        status: {
          success: "rgb(var(--color-success) / <alpha-value>)",
          caution: "rgb(var(--color-warning) / <alpha-value>)",
          danger: "rgb(var(--color-danger) / <alpha-value>)",
          info: "rgb(var(--color-info) / <alpha-value>)",
          neutral: "rgb(var(--color-neutral) / <alpha-value>)",
        },
      },
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

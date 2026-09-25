import preset from "@commerceos/ui/tailwind-preset.js";

// Deliberately does NOT just inherit the shared preset's color scale as-is -
// every color/radius token here resolves through a CSS custom property
// (see src/index.css) rather than a fixed hex, so a future per-store theme
// pull is a runtime CSS-variable change, not a rebuild. Non-color tokens
// (spacing, screens, base font stack shape) still come from the shared
// preset via `presets: [preset]`.
//
// Colors use the rgb(var(--x) / <alpha-value>) form (not a bare var()) -
// Tailwind substitutes <alpha-value> with whatever opacity modifier is
// used (bg-primary/10, text-accent/60, etc.); a bare var() reference can't
// support that since Tailwind can't decompose an opaque CSS value into a
// blendable alpha channel at build time. This is why src/index.css defines
// each variable as an "R G B" triplet, not a hex string.
/** @type {import('tailwindcss').Config} */
export default {
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
        accent: {
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          hover: "rgb(var(--color-accent-hover) / <alpha-value>)",
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
          success: "rgb(var(--color-status-success) / <alpha-value>)",
          danger: "rgb(var(--color-status-danger) / <alpha-value>)",
        },
      },
      borderRadius: {
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        heading: ["var(--font-heading)"],
      },
      maxWidth: {
        theme: "var(--theme-container-width)",
      },
    },
  },
};

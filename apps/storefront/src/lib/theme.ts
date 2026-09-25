import type { ThemeSettings } from "./api-types";

// Per the Theme Editor milestone (Sections 7/8/27) - the exact mechanism
// index.css's own header comment already called for: "a future 'pull
// colors from StorefrontVersion.themeSettings' pass becomes
// document.documentElement.style.setProperty(...) per store, not a
// rewrite of every component." Every component already reads color/radius
// through these CSS custom properties (tailwind.config.js's
// rgb(var(--x) / <alpha-value>) pattern) - this is the one place that
// writes them, so Header/Hero/Product cards/Buttons/Banners/Footer all
// pick up the same per-store palette automatically (Section 8).

function hexToTriplet(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function shade(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const r = Math.round(parseInt(clean.slice(0, 2), 16) * (1 + amount));
  const g = Math.round(parseInt(clean.slice(2, 4), 16) * (1 + amount));
  const b = Math.round(parseInt(clean.slice(4, 6), 16) * (1 + amount));
  const clamp = (n: number) => Math.min(255, Math.max(0, n));
  return `${clamp(r)} ${clamp(g)} ${clamp(b)}`;
}

// Mixes `hex` a small distance toward `towardHex` - used for
// primary-subtle/surface-sunken (hover backgrounds, badges, COD/info
// cards). Mixing toward the theme's OWN surface/text color, rather than
// always toward white, is what makes this work on both light and dark
// themes: on a dark theme (e.g. the Neon preset) it stays a dark, subtly
// tinted background instead of collapsing to a near-white card that makes
// the theme's light heading text unreadable on top of it.
function mix(hex: string, towardHex: string, ratio: number): string {
  const from = hex.replace("#", "");
  const to = towardHex.replace("#", "");
  const channel = (i: number) => {
    const a = parseInt(from.slice(i, i + 2), 16);
    const b = parseInt(to.slice(i, i + 2), 16);
    return Math.round(a + (b - a) * ratio);
  };
  return `${channel(0)} ${channel(2)} ${channel(4)}`;
}

export function applyThemeToDocument(theme: ThemeSettings): void {
  const root = document.documentElement.style;

  root.setProperty("--color-primary", hexToTriplet(theme.colorPrimary));
  root.setProperty("--color-primary-hover", shade(theme.colorPrimary, -0.15));
  root.setProperty("--color-primary-subtle", mix(theme.colorSurface, theme.colorPrimary, 0.12));

  root.setProperty("--color-accent", hexToTriplet(theme.colorAccent));
  root.setProperty("--color-accent-hover", shade(theme.colorAccent, -0.15));

  root.setProperty("--color-surface-page", hexToTriplet(theme.colorBackground));
  root.setProperty("--color-surface-card", hexToTriplet(theme.colorSurface));
  root.setProperty("--color-surface-sunken", mix(theme.colorSurface, theme.colorText, 0.06));

  root.setProperty("--color-text-primary", hexToTriplet(theme.colorText));
  root.setProperty("--color-text-secondary", hexToTriplet(theme.colorTextMuted));

  root.setProperty("--radius-md", `${theme.cornerRadius}px`);
  root.setProperty("--radius-lg", `${Math.min(theme.cornerRadius * 2, 32)}px`);

  root.setProperty("--font-sans", `${theme.fontBody}, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Noto Sans Bengali", sans-serif`);
  root.setProperty("--font-heading", `${theme.fontHeading}, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Noto Sans Bengali", sans-serif`);

  root.setProperty("--theme-container-width", `${theme.containerWidth}px`);

  const spacingScale: Record<ThemeSettings["sectionSpacing"], string> = { compact: "2.5rem", comfortable: "4rem", spacious: "6rem" };
  root.setProperty("--theme-section-spacing", spacingScale[theme.sectionSpacing]);

  const buttonRadius: Record<ThemeSettings["buttonStyle"], string> = { square: "0px", rounded: `${theme.cornerRadius}px`, pill: "999px" };
  root.setProperty("--theme-button-radius", buttonRadius[theme.buttonStyle]);
}

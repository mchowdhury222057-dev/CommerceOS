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

// A light tint of a color (mixed toward white) - used for primary-subtle
// (hover backgrounds, badges) the same way the app's own default teal
// palette uses a pale version of itself.
function tint(hex: string, ratio: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * ratio);
  return `${mix(r)} ${mix(g)} ${mix(b)}`;
}

export function applyThemeToDocument(theme: ThemeSettings): void {
  const root = document.documentElement.style;

  root.setProperty("--color-primary", hexToTriplet(theme.colorPrimary));
  root.setProperty("--color-primary-hover", shade(theme.colorPrimary, -0.15));
  root.setProperty("--color-primary-subtle", tint(theme.colorPrimary, 0.92));

  root.setProperty("--color-accent", hexToTriplet(theme.colorAccent));
  root.setProperty("--color-accent-hover", shade(theme.colorAccent, -0.15));

  root.setProperty("--color-surface-page", hexToTriplet(theme.colorBackground));
  root.setProperty("--color-surface-card", hexToTriplet(theme.colorSurface));
  root.setProperty("--color-surface-sunken", tint(theme.colorText, 0.94));

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

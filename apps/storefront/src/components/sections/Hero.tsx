import { ArrowRight } from "lucide-react";
import type { HeroSectionSettings } from "../../lib/api-types";
import { cn } from "../../lib/cn";

// Bold Modern redesign - noticeably taller/bolder than before at every
// size, since the hero is this section's whole job (Section 3's "large
// attractive hero section").
const HEIGHT_CLASS: Record<HeroSectionSettings["height"], string> = {
  small: "py-16 sm:py-20",
  medium: "py-24 sm:py-32",
  large: "py-32 sm:py-48",
};

const ALIGN_CLASS: Record<HeroSectionSettings["alignment"], string> = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

// Still entirely driven by the store's own theme.colorPrimary/colorAccent
// (Section 4/14 - never bypass the per-store theme system) - what changed
// is the TREATMENT: a richer three-stop gradient plus two soft blurred
// "orbs" in the accent color, the same layered-gradient language modern
// SaaS/e-commerce hero sections use, rather than a flat two-stop fill.
export function Hero({ settings }: { settings: HeroSectionSettings }) {
  const hasImage = Boolean(settings.imageUrl);

  return (
    <section
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-primary via-primary-hover to-accent px-4 text-white",
        HEIGHT_CLASS[settings.height],
      )}
      style={hasImage ? { backgroundImage: `url(${settings.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      {!hasImage && (
        <>
          <div
            className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-accent/40 blur-3xl animate-float-slow"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-32 -right-16 h-[28rem] w-[28rem] rounded-full bg-primary-hover/50 blur-3xl animate-float-slow"
            style={{ animationDelay: "-4.5s" }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{ backgroundImage: "radial-gradient(circle, #fff 1.5px, transparent 1.5px)", backgroundSize: "28px 28px" }}
            aria-hidden="true"
          />
        </>
      )}
      {hasImage && settings.overlay && <div className="absolute inset-0 bg-black/50" aria-hidden="true" />}

      <div className={cn("relative mx-auto flex max-w-theme flex-col animate-fade-in-up", ALIGN_CLASS[settings.alignment])}>
        <h1 className="max-w-3xl font-heading text-5xl font-extrabold leading-[1.05] tracking-tight drop-shadow-sm sm:text-6xl lg:text-7xl">
          {settings.heading}
        </h1>
        {settings.subheading && <p className="mt-5 max-w-xl text-base text-white/90 sm:text-lg">{settings.subheading}</p>}
        {settings.buttonText && (
          <a
            href={settings.buttonLink || "#products"}
            className="mt-9 inline-flex items-center gap-2 bg-white px-7 py-3.5 text-sm font-semibold text-primary shadow-xl shadow-black/10 transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/20 sm:text-base"
            style={{ borderRadius: "var(--theme-button-radius)" }}
          >
            {settings.buttonText}
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        )}
      </div>
    </section>
  );
}

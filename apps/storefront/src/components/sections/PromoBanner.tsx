import { ArrowRight } from "lucide-react";
import type { PromoBannerSectionSettings } from "../../lib/api-types";

const ALIGN_CLASS: Record<PromoBannerSectionSettings["alignment"], string> = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

export function PromoBanner({ settings }: { settings: PromoBannerSectionSettings }) {
  return (
    <section className="mx-auto max-w-theme px-4" style={{ paddingBlock: "var(--theme-section-spacing)" }}>
      <div
        className="relative overflow-hidden bg-gradient-to-br from-accent via-accent to-primary px-8 py-16 text-white shadow-xl sm:px-16 sm:py-20"
        style={{
          borderRadius: "var(--radius-lg)",
          backgroundImage: settings.imageUrl ? `linear-gradient(to right, rgb(0 0 0 / 0.5), rgb(0 0 0 / 0.2)), url(${settings.imageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {!settings.imageUrl && (
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{ backgroundImage: "radial-gradient(circle, #fff 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }}
            aria-hidden="true"
          />
        )}
        <div className={`relative flex flex-col ${ALIGN_CLASS[settings.alignment]}`}>
          <h2 className="max-w-md font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{settings.heading}</h2>
          {settings.description && <p className="mt-3 max-w-sm text-sm text-white/90 sm:text-base">{settings.description}</p>}
          {settings.buttonText && (
            <a
              href={settings.buttonLink || "#products"}
              className="mt-7 inline-flex items-center gap-2 bg-white px-6 py-3 text-sm font-semibold text-accent shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
              style={{ borderRadius: "var(--theme-button-radius)" }}
            >
              {settings.buttonText}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

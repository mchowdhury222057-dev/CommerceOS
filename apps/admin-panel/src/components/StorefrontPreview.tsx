import type { SimplifiedLayout, ThemeSettings } from "../lib/api-types";

// The Theme Editor's center column renders FROM this exact component, and
// it is the ONLY rendering path for a draft's layout/themeSettings in this
// milestone (no separate public Storefront app exists yet to duplicate
// against) - satisfying "preview is what publishes" (Part 7.3) trivially,
// since there is nothing else it could diverge from.
export function StorefrontPreview({ layout, themeSettings }: { layout: SimplifiedLayout; themeSettings: ThemeSettings }) {
  return (
    <div
      className="h-full overflow-y-auto"
      style={{
        backgroundColor: themeSettings.colorBackground,
        fontFamily: themeSettings.fontBody,
        borderRadius: themeSettings.cornerRadius,
      }}
    >
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: `1px solid ${themeSettings.colorSecondary}22` }}
      >
        {themeSettings.logoUrl ? (
          <img src={themeSettings.logoUrl} alt="Store logo" className="h-8" />
        ) : (
          <div className="text-sm font-semibold" style={{ color: themeSettings.colorSecondary }}>
            Your Store
          </div>
        )}
        <nav className="flex gap-4 text-xs" style={{ color: themeSettings.colorSecondary }}>
          <span>Home</span>
          <span>Products</span>
          <span>Cart</span>
        </nav>
      </header>

      <section
        className="flex flex-col items-center justify-center gap-4 px-8 py-16 text-center"
        style={{
          backgroundColor: layout.heroImageUrl ? undefined : `${themeSettings.colorPrimary}0D`,
          backgroundImage: layout.heroImageUrl ? `url(${layout.heroImageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <h1
          className="text-3xl font-bold"
          style={{ fontFamily: themeSettings.fontHeading, color: themeSettings.colorSecondary }}
        >
          {layout.heroHeading || "Welcome to our store"}
        </h1>
        {layout.heroSubheading && <p style={{ color: themeSettings.colorSecondary }}>{layout.heroSubheading}</p>}
        <button
          type="button"
          className="px-5 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: themeSettings.colorPrimary, borderRadius: themeSettings.cornerRadius }}
        >
          Shop Now
        </button>
      </section>

      {layout.showFeaturedProducts && (
        <section className="px-6 py-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: themeSettings.colorSecondary }}>
            Featured Products
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg p-3" style={{ backgroundColor: `${themeSettings.colorAccent}14` }}>
                <div className="mb-2 aspect-square rounded" style={{ backgroundColor: `${themeSettings.colorAccent}33` }} />
                <div className="text-xs" style={{ color: themeSettings.colorSecondary }}>
                  Sample product {i}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

import { ArrowRight, Headphones, ImageOff, LayoutGrid, Mail, RotateCcw, Search, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import type {
  AnnouncementBarSettings,
  FeaturedCategoriesSectionSettings,
  FeaturedProductsSectionSettings,
  FooterSettings,
  HeaderSettings,
  HeroSectionSettings,
  NewsletterSectionSettings,
  PreviewProduct,
  ProductGridSectionSettings,
  PromoBannerSectionSettings,
  SimplifiedLayout,
  ThemeSection,
  ThemeSettings,
  TrustSectionSettings,
} from "../lib/api-types";

export type PreviewDevice = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTH: Record<PreviewDevice, string> = { desktop: "100%", tablet: "768px", mobile: "390px" };

const TRUST_ICONS = [ShieldCheck, Truck, RotateCcw, Headphones];

function formatMoney(value: string): string {
  return `৳${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buttonRadius(theme: ThemeSettings): number {
  if (theme.buttonStyle === "square") return 0;
  if (theme.buttonStyle === "pill") return 999;
  return theme.cornerRadius;
}

// Per Section 4/20 - the Theme Editor's own live preview. This is a
// faithful but intentionally simpler mirror of the real storefront app's
// section renderers (apps/storefront/src/components/sections/) - it runs
// inside the Admin Panel, whose Tailwind tokens are the indigo admin
// palette, not a per-store one, so every themed value here is an inline
// style rather than a CSS custom property. The real storefront (Section
// 27) is what actually publishes; this is "close enough to trust," not a
// byte-for-byte duplicate render path.
export function StorefrontPreview({
  layout,
  themeSettings: theme,
  products,
  storeName,
  device,
}: {
  layout: SimplifiedLayout;
  themeSettings: ThemeSettings;
  products: PreviewProduct[];
  storeName: string;
  device: PreviewDevice;
}) {
  return (
    <div className="flex h-full justify-center overflow-y-auto bg-surface-sunken py-4">
      <div
        className="h-fit min-h-full overflow-hidden shadow-lg transition-[width] duration-200"
        style={{ width: DEVICE_WIDTH[device], maxWidth: "100%", backgroundColor: theme.colorBackground, fontFamily: theme.fontBody }}
      >
        <AnnouncementBarPreview settings={layout.announcementBar} />
        <HeaderPreview settings={layout.header} theme={theme} storeName={storeName} />
        {layout.sections
          .filter((s) => s.enabled)
          .map((section) => (
            <SectionPreview key={section.id} section={section} theme={theme} products={products} />
          ))}
        <FooterPreview settings={layout.footer} theme={theme} storeName={storeName} />
      </div>
    </div>
  );
}

function AnnouncementBarPreview({ settings }: { settings: AnnouncementBarSettings }) {
  if (!settings.enabled || !settings.text) return null;
  return (
    <div style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }} className="px-4 py-2 text-center text-xs font-medium">
      {settings.text}
    </div>
  );
}

function HeaderPreview({ settings, theme, storeName }: { settings: HeaderSettings; theme: ThemeSettings; storeName: string }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b px-6 py-4" style={{ borderColor: `${theme.colorText}1A` }}>
      <div className="flex items-center gap-2.5">
        {theme.logoUrl ? (
          <img src={theme.logoUrl} alt={storeName} className="h-8 w-8 rounded object-cover" />
        ) : (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold text-white"
            style={{ backgroundColor: theme.colorPrimary }}
          >
            {storeName.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="text-sm font-bold" style={{ color: theme.colorText, fontFamily: theme.fontHeading }}>
          {storeName}
        </span>
      </div>
      {settings.showSearch && (
        <div className="hidden flex-1 max-w-xs items-center gap-2 rounded-full border px-3 py-1.5 sm:flex" style={{ borderColor: `${theme.colorText}22` }}>
          <Search size={13} style={{ color: theme.colorTextMuted }} aria-hidden="true" />
          <span className="text-xs" style={{ color: theme.colorTextMuted }}>
            Search {storeName}…
          </span>
        </div>
      )}
      <ShoppingCart size={18} style={{ color: theme.colorText }} aria-hidden="true" />
    </header>
  );
}

function SectionPreview({ section, theme, products }: { section: ThemeSection; theme: ThemeSettings; products: PreviewProduct[] }) {
  switch (section.type) {
    case "hero":
      return <HeroPreview settings={section.settings as unknown as HeroSectionSettings} theme={theme} />;
    case "featured-categories":
      return <FeaturedCategoriesPreview settings={section.settings as unknown as FeaturedCategoriesSectionSettings} theme={theme} products={products} />;
    case "featured-products":
      return <ProductGridPreview title={(section.settings as unknown as FeaturedProductsSectionSettings).title} settings={section.settings as unknown as FeaturedProductsSectionSettings} theme={theme} products={products} />;
    case "product-grid":
      return <ProductGridPreview title={(section.settings as unknown as ProductGridSectionSettings).title} settings={section.settings as unknown as ProductGridSectionSettings} theme={theme} products={products} />;
    case "promo-banner":
      return <PromoBannerPreview settings={section.settings as unknown as PromoBannerSectionSettings} theme={theme} />;
    case "trust":
      return <TrustPreview settings={section.settings as unknown as TrustSectionSettings} theme={theme} />;
    case "newsletter":
      return <NewsletterPreview settings={section.settings as unknown as NewsletterSectionSettings} theme={theme} />;
    default:
      return null;
  }
}

const HERO_HEIGHT: Record<HeroSectionSettings["height"], string> = { small: "48px", medium: "80px", large: "112px" };
const ALIGN: Record<"left" | "center" | "right", string> = { left: "flex-start", center: "center", right: "flex-end" };
const TEXT_ALIGN: Record<"left" | "center" | "right", "left" | "center" | "right"> = { left: "left", center: "center", right: "right" };

function HeroPreview({ settings, theme }: { settings: HeroSectionSettings; theme: ThemeSettings }) {
  return (
    <section
      className="relative flex flex-col overflow-hidden px-8 text-white"
      style={{
        paddingBlock: HERO_HEIGHT[settings.height],
        alignItems: ALIGN[settings.alignment],
        textAlign: TEXT_ALIGN[settings.alignment],
        backgroundColor: theme.colorPrimary,
        backgroundImage: settings.imageUrl ? `url(${settings.imageUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {settings.imageUrl && settings.overlay && <div className="absolute inset-0 bg-black/40" aria-hidden="true" />}
      <div className="relative max-w-md">
        <h1 className="text-2xl font-bold" style={{ fontFamily: theme.fontHeading }}>
          {settings.heading || "Welcome to our store"}
        </h1>
        {settings.subheading && <p className="mt-2 text-sm text-white/90">{settings.subheading}</p>}
        {settings.buttonText && (
          <span
            className="mt-4 inline-flex items-center gap-1.5 bg-white px-4 py-2 text-xs font-semibold"
            style={{ color: theme.colorPrimary, borderRadius: buttonRadius(theme) }}
          >
            {settings.buttonText}
            <ArrowRight size={12} aria-hidden="true" />
          </span>
        )}
      </div>
    </section>
  );
}

function SectionShell({ children, theme }: { children: React.ReactNode; theme: ThemeSettings }) {
  return (
    <div className="px-6" style={{ paddingBlock: 28, backgroundColor: theme.colorBackground }}>
      {children}
    </div>
  );
}

function SectionTitle({ title, theme }: { title: string; theme: ThemeSettings }) {
  if (!title) return null;
  return (
    <h2 className="mb-4 text-sm font-bold" style={{ color: theme.colorText, fontFamily: theme.fontHeading }}>
      {title}
    </h2>
  );
}

function FeaturedCategoriesPreview({ settings, theme, products }: { settings: FeaturedCategoriesSectionSettings; theme: ThemeSettings; products: PreviewProduct[] }) {
  const categories = new Map<string, { name: string; count: number }>();
  for (const p of products) {
    if (!p.category) continue;
    const existing = categories.get(p.category.id);
    if (existing) existing.count += 1;
    else categories.set(p.category.id, { name: p.category.name, count: 1 });
  }
  const list = Array.from(categories.values()).slice(0, settings.limit);
  if (list.length === 0) return null;

  return (
    <SectionShell theme={theme}>
      <SectionTitle title={settings.title} theme={theme} />
      <div className="grid grid-cols-4 gap-2">
        {list.map((c) => (
          <div key={c.name} className="flex flex-col items-center gap-1.5 border p-3 text-center" style={{ borderColor: `${theme.colorText}1A`, borderRadius: theme.cornerRadius }}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: `${theme.colorPrimary}1A`, color: theme.colorPrimary }}>
              <LayoutGrid size={13} aria-hidden="true" />
            </span>
            <span className="text-[11px] font-medium" style={{ color: theme.colorText }}>
              {c.name}
            </span>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

const CARD_BORDER: Record<ThemeSettings["productCardStyle"], string> = { minimal: "transparent", bordered: "", shadow: "transparent" };

function ProductCardPreview({ product, theme, showPrice }: { product: PreviewProduct; theme: ThemeSettings; showPrice: boolean }) {
  const image = product.images[0]?.url;
  return (
    <div
      className="overflow-hidden border"
      style={{
        borderColor: CARD_BORDER[theme.productCardStyle] || `${theme.colorText}1A`,
        borderRadius: theme.cornerRadius,
        boxShadow: theme.productCardStyle === "shadow" ? "0 4px 14px rgb(0 0 0 / 0.1)" : undefined,
        backgroundColor: theme.colorSurface,
      }}
    >
      <div className="flex aspect-square items-center justify-center" style={{ backgroundColor: `${theme.colorText}0D` }}>
        {image ? <img src={image} alt={product.name} className="h-full w-full object-cover" /> : <ImageOff size={20} style={{ color: theme.colorTextMuted }} />}
      </div>
      <div className="p-2">
        <div className="truncate text-[11px] font-medium" style={{ color: theme.colorText }}>
          {product.name}
        </div>
        {showPrice && (
          <div className="text-xs font-bold" style={{ color: theme.colorText }}>
            {formatMoney(product.basePrice)}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductGridPreview({
  title,
  settings,
  theme,
  products,
}: {
  title: string;
  settings: { limit?: number; columns: 2 | 3 | 4; showPrice: boolean };
  theme: ThemeSettings;
  products: PreviewProduct[];
}) {
  const visible = products.slice(0, settings.limit ?? products.length);
  return (
    <SectionShell theme={theme}>
      <SectionTitle title={title} theme={theme} />
      {visible.length === 0 ? (
        <div className="border border-dashed p-6 text-center text-xs" style={{ borderColor: `${theme.colorText}22`, color: theme.colorTextMuted, borderRadius: theme.cornerRadius }}>
          No active products yet
        </div>
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${settings.columns}, minmax(0, 1fr))` }}>
          {visible.map((p) => (
            <ProductCardPreview key={p.id} product={p} theme={theme} showPrice={settings.showPrice} />
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function PromoBannerPreview({ settings, theme }: { settings: PromoBannerSectionSettings; theme: ThemeSettings }) {
  return (
    <SectionShell theme={theme}>
      <div
        className="flex flex-col overflow-hidden px-6 py-8 text-white"
        style={{
          alignItems: ALIGN[settings.alignment],
          textAlign: TEXT_ALIGN[settings.alignment],
          backgroundColor: theme.colorAccent,
          backgroundImage: settings.imageUrl ? `linear-gradient(to right, rgb(0 0 0 / 0.45), rgb(0 0 0 / 0.15)), url(${settings.imageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderRadius: theme.cornerRadius,
        }}
      >
        <h2 className="max-w-xs text-lg font-bold" style={{ fontFamily: theme.fontHeading }}>
          {settings.heading}
        </h2>
        {settings.description && <p className="mt-1 max-w-xs text-xs text-white/90">{settings.description}</p>}
        {settings.buttonText && (
          <span className="mt-3 inline-block bg-white px-3.5 py-1.5 text-xs font-semibold" style={{ color: theme.colorAccent, borderRadius: buttonRadius(theme) }}>
            {settings.buttonText}
          </span>
        )}
      </div>
    </SectionShell>
  );
}

function TrustPreview({ settings, theme }: { settings: TrustSectionSettings; theme: ThemeSettings }) {
  if (settings.items.length === 0) return null;
  return (
    <div className="border-y px-6 py-6" style={{ borderColor: `${theme.colorText}14`, backgroundColor: `${theme.colorText}08` }}>
      {settings.title && (
        <h2 className="mb-4 text-center text-xs font-bold" style={{ color: theme.colorText, fontFamily: theme.fontHeading }}>
          {settings.title}
        </h2>
      )}
      <div className="grid grid-cols-4 gap-2">
        {settings.items.map((item, i) => {
          const Icon = TRUST_ICONS[i % TRUST_ICONS.length];
          return (
            <div key={i} className="flex flex-col items-center gap-1 text-center">
              <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: `${theme.colorPrimary}1A`, color: theme.colorPrimary }}>
                <Icon size={13} aria-hidden="true" />
              </span>
              <span className="text-[10px] font-medium" style={{ color: theme.colorText }}>
                {item.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewsletterPreview({ settings, theme }: { settings: NewsletterSectionSettings; theme: ThemeSettings }) {
  return (
    <SectionShell theme={theme}>
      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center" style={{ backgroundColor: `${theme.colorPrimary}0D`, borderRadius: theme.cornerRadius }}>
        <Mail size={18} style={{ color: theme.colorPrimary }} aria-hidden="true" />
        <h2 className="text-sm font-bold" style={{ color: theme.colorText, fontFamily: theme.fontHeading }}>
          {settings.heading}
        </h2>
        {settings.subheading && (
          <p className="text-xs" style={{ color: theme.colorTextMuted }}>
            {settings.subheading}
          </p>
        )}
      </div>
    </SectionShell>
  );
}

function FooterPreview({ settings, theme, storeName }: { settings: FooterSettings; theme: ThemeSettings; storeName: string }) {
  return (
    <footer className="border-t px-6 py-6" style={{ borderColor: `${theme.colorText}14` }}>
      <div className="text-xs font-bold" style={{ color: theme.colorText, fontFamily: theme.fontHeading }}>
        {storeName}
      </div>
      {settings.description && (
        <p className="mt-1 max-w-xs text-[11px]" style={{ color: theme.colorTextMuted }}>
          {settings.description}
        </p>
      )}
      <p className="mt-3 text-[10px]" style={{ color: theme.colorTextMuted }}>
        © {new Date().getFullYear()} {storeName}
      </p>
    </footer>
  );
}

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@commerceos/ui";
import { Dialog } from "../ui/Dialog";
import { Input, Select, Textarea } from "../ui/Input";
import type {
  FeaturedCategoriesSectionSettings,
  FeaturedProductsSectionSettings,
  HeroSectionSettings,
  NewsletterSectionSettings,
  ProductGridSectionSettings,
  PromoBannerSectionSettings,
  ThemeSection,
  TrustSectionSettings,
} from "../../lib/api-types";

const SECTION_LABEL: Record<ThemeSection["type"], string> = {
  hero: "Hero Banner",
  "featured-categories": "Featured Categories",
  "featured-products": "Featured Products",
  "product-grid": "Product Grid",
  "promo-banner": "Promotional Banner",
  trust: "Trust / Brand Section",
  newsletter: "Newsletter",
};

// Per Section 19 - clicking a section opens its settings; every field here
// maps 1:1 to that section's own SectionXSettings shape in
// @commerceos/types. One dialog, one form-per-type switch, rather than 7
// separate dialog components.
export function SectionSettingsDialog({
  section,
  onClose,
  onChange,
}: {
  section: ThemeSection | null;
  onClose: () => void;
  onChange: (settings: Record<string, unknown>) => void;
}) {
  if (!section) return null;

  function update(patch: Record<string, unknown>) {
    onChange({ ...section!.settings, ...patch });
  }

  return (
    <Dialog open={Boolean(section)} onOpenChange={(open) => !open && onClose()} title={SECTION_LABEL[section.type]} size="md">
      <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
        {section.type === "hero" && <HeroForm settings={section.settings as unknown as HeroSectionSettings} update={update} />}
        {section.type === "featured-categories" && (
          <FeaturedCategoriesForm settings={section.settings as unknown as FeaturedCategoriesSectionSettings} update={update} />
        )}
        {section.type === "featured-products" && (
          <FeaturedProductsForm settings={section.settings as unknown as FeaturedProductsSectionSettings} update={update} />
        )}
        {section.type === "product-grid" && <ProductGridForm settings={section.settings as unknown as ProductGridSectionSettings} update={update} />}
        {section.type === "promo-banner" && <PromoBannerForm settings={section.settings as unknown as PromoBannerSectionSettings} update={update} />}
        {section.type === "trust" && <TrustForm settings={section.settings as unknown as TrustSectionSettings} update={update} />}
        {section.type === "newsletter" && <NewsletterForm settings={section.settings as unknown as NewsletterSectionSettings} update={update} />}
      </div>
      <div className="mt-5 flex justify-end border-t border-border-default pt-4">
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </div>
    </Dialog>
  );
}

function HeroForm({ settings, update }: { settings: HeroSectionSettings; update: (p: Partial<HeroSectionSettings>) => void }) {
  return (
    <>
      <Input label="Heading" value={settings.heading} onChange={(e) => update({ heading: e.target.value })} />
      <Textarea label="Description" rows={2} value={settings.subheading} onChange={(e) => update({ subheading: e.target.value })} />
      <Input label="Image URL" hint="Leave empty for a solid brand-color background." value={settings.imageUrl ?? ""} onChange={(e) => update({ imageUrl: e.target.value || null })} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Button text" value={settings.buttonText} onChange={(e) => update({ buttonText: e.target.value })} />
        <Input label="Button link" value={settings.buttonLink} onChange={(e) => update({ buttonLink: e.target.value })} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Select label="Alignment" value={settings.alignment} onChange={(e) => update({ alignment: e.target.value as HeroSectionSettings["alignment"] })}>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </Select>
        <Select label="Height" value={settings.height} onChange={(e) => update({ height: e.target.value as HeroSectionSettings["height"] })}>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </Select>
        <label className="flex items-end pb-2.5 text-sm">
          <span className="flex items-center gap-2 text-text-primary">
            <input
              type="checkbox"
              checked={settings.overlay}
              onChange={(e) => update({ overlay: e.target.checked })}
              className="h-4 w-4 rounded border-border-default text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            Dark overlay
          </span>
        </label>
      </div>
    </>
  );
}

function FeaturedCategoriesForm({ settings, update }: { settings: FeaturedCategoriesSectionSettings; update: (p: Partial<FeaturedCategoriesSectionSettings>) => void }) {
  return (
    <>
      <Input label="Section title" value={settings.title} onChange={(e) => update({ title: e.target.value })} />
      <Input
        label="Number of categories"
        type="number"
        min={1}
        max={8}
        value={settings.limit}
        onChange={(e) => update({ limit: Number(e.target.value) })}
      />
    </>
  );
}

function FeaturedProductsForm({ settings, update }: { settings: FeaturedProductsSectionSettings; update: (p: Partial<FeaturedProductsSectionSettings>) => void }) {
  return (
    <>
      <Input label="Section title" value={settings.title} onChange={(e) => update({ title: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Number of products" type="number" min={1} max={24} value={settings.limit} onChange={(e) => update({ limit: Number(e.target.value) })} />
        <Select label="Grid columns" value={settings.columns} onChange={(e) => update({ columns: Number(e.target.value) as 2 | 3 | 4 })}>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </Select>
      </div>
      <ToggleRow label="Show price" checked={settings.showPrice} onChange={(v) => update({ showPrice: v })} />
      <ToggleRow label="Show Add to Cart" checked={settings.showAddToCart} onChange={(v) => update({ showAddToCart: v })} />
    </>
  );
}

function ProductGridForm({ settings, update }: { settings: ProductGridSectionSettings; update: (p: Partial<ProductGridSectionSettings>) => void }) {
  return (
    <>
      <Input label="Section title" value={settings.title} onChange={(e) => update({ title: e.target.value })} />
      <Select label="Grid columns" value={settings.columns} onChange={(e) => update({ columns: Number(e.target.value) as 2 | 3 | 4 })}>
        <option value={2}>2</option>
        <option value={3}>3</option>
        <option value={4}>4</option>
      </Select>
      <ToggleRow label="Show price" checked={settings.showPrice} onChange={(v) => update({ showPrice: v })} />
      <ToggleRow label="Show Add to Cart" checked={settings.showAddToCart} onChange={(v) => update({ showAddToCart: v })} />
    </>
  );
}

function PromoBannerForm({ settings, update }: { settings: PromoBannerSectionSettings; update: (p: Partial<PromoBannerSectionSettings>) => void }) {
  return (
    <>
      <Input label="Heading" value={settings.heading} onChange={(e) => update({ heading: e.target.value })} />
      <Textarea label="Description" rows={2} value={settings.description} onChange={(e) => update({ description: e.target.value })} />
      <Input label="Image URL" value={settings.imageUrl ?? ""} onChange={(e) => update({ imageUrl: e.target.value || null })} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Button text" value={settings.buttonText} onChange={(e) => update({ buttonText: e.target.value })} />
        <Input label="Button link" value={settings.buttonLink} onChange={(e) => update({ buttonLink: e.target.value })} />
      </div>
      <Select label="Alignment" value={settings.alignment} onChange={(e) => update({ alignment: e.target.value as PromoBannerSectionSettings["alignment"] })}>
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </Select>
    </>
  );
}

function TrustForm({ settings, update }: { settings: TrustSectionSettings; update: (p: Partial<TrustSectionSettings>) => void }) {
  function updateItem(i: number, text: string) {
    const items = settings.items.map((item, idx) => (idx === i ? { text } : item));
    update({ items });
  }
  function removeItem(i: number) {
    update({ items: settings.items.filter((_, idx) => idx !== i) });
  }
  function addItem() {
    if (settings.items.length >= 4) return;
    update({ items: [...settings.items, { text: "" }] });
  }

  return (
    <>
      <Input label="Section title" value={settings.title} onChange={(e) => update({ title: e.target.value })} />
      <div className="space-y-2">
        <span className="block text-xs font-medium text-text-primary">Trust points (up to 4)</span>
        {settings.items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input value={item.text} onChange={(e) => updateItem(i, e.target.value)} className="flex-1" />
            <button
              type="button"
              onClick={() => removeItem(i)}
              aria-label="Remove trust point"
              className="rounded-md p-2 text-text-secondary transition-colors hover:bg-status-danger/10 hover:text-status-danger"
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
        {settings.items.length < 4 && (
          <Button type="button" variant="ghost" size="sm" onClick={addItem}>
            <Plus size={14} aria-hidden="true" />
            Add trust point
          </Button>
        )}
      </div>
    </>
  );
}

function NewsletterForm({ settings, update }: { settings: NewsletterSectionSettings; update: (p: Partial<NewsletterSectionSettings>) => void }) {
  return (
    <>
      <Input label="Heading" value={settings.heading} onChange={(e) => update({ heading: e.target.value })} />
      <Input label="Subheading" value={settings.subheading} onChange={(e) => update({ subheading: e.target.value })} />
    </>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-text-primary">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border-default text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      />
      {label}
    </label>
  );
}

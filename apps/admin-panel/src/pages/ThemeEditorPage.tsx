import { useEffect, useState } from "react";
import { Link, useBlocker, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@commerceos/ui";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  History,
  Laptop,
  Megaphone,
  RotateCcw,
  Smartphone,
  Tablet,
  Wand2,
} from "lucide-react";
import { getDraftTheme, getThemePreviewProducts, listThemeVersions, publishTheme, restoreThemeVersion, updateDraftTheme } from "../api/theme";
import { StorefrontPreview } from "../components/StorefrontPreview";
import type { PreviewDevice } from "../components/StorefrontPreview";
import { SectionSettingsDialog } from "../components/theme-editor/SectionSettingsDialog";
import { THEME_PRESETS } from "../lib/theme-presets";
import type { SimplifiedLayout, StorefrontVersionStatus, ThemeSection, ThemeSettings } from "../lib/api-types";
import { DEFAULT_STOREFRONT_LAYOUT, DEFAULT_THEME_SETTINGS } from "../lib/theme-defaults";
import { ApiError } from "../lib/api-client";
import { toast } from "../components/ui/Toaster";
import { Badge } from "../components/ui/Badge";
import type { BadgeTone } from "../components/ui/Badge";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Input, Select } from "../components/ui/Input";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";

const VERSION_STATUS_TONE: Record<StorefrontVersionStatus, BadgeTone> = {
  DRAFT: "info",
  PUBLISHED: "success",
  OBSOLETE: "neutral",
};

const SECTION_LABEL: Record<ThemeSection["type"], string> = {
  hero: "Hero Banner",
  "featured-categories": "Featured Categories",
  "featured-products": "Featured Products",
  "product-grid": "Product Grid",
  "promo-banner": "Promotional Banner",
  trust: "Trust / Brand Section",
  newsletter: "Newsletter",
};

type Tab = "presets" | "sections" | "styles" | "history";

// Per Sections 4/9/20/22 - the full visual Theme Editor: a top bar (device
// preview + Save/Publish), a left rail of Presets/Sections/Styles/History,
// and a live preview center column that's always rendering the exact same
// data the left rail edits (no separate "apply" step). Everything here
// only ever touches the DRAFT (Part D.6's invariant, unchanged) - Publish
// is the one explicit action that makes it live.
export default function ThemeEditorPage() {
  const { storeId = "" } = useParams();
  const queryClient = useQueryClient();

  const draftQuery = useQuery({ queryKey: ["theme", storeId, "draft"], queryFn: () => getDraftTheme(storeId) });
  const versionsQuery = useQuery({ queryKey: ["theme", storeId, "versions"], queryFn: () => listThemeVersions(storeId) });
  const productsQuery = useQuery({ queryKey: ["theme", storeId, "preview-products"], queryFn: () => getThemePreviewProducts(storeId) });

  const [layout, setLayout] = useState<SimplifiedLayout | null>(null);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("presets");
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  useEffect(() => {
    if (draftQuery.data) {
      setLayout(draftQuery.data.draft.layout);
      setThemeSettings(draftQuery.data.draft.themeSettings);
      setSavedSnapshot(JSON.stringify({ layout: draftQuery.data.draft.layout, themeSettings: draftQuery.data.draft.themeSettings }));
    }
  }, [draftQuery.data]);

  const isDirty = Boolean(layout && themeSettings && savedSnapshot !== null && JSON.stringify({ layout, themeSettings }) !== savedSnapshot);

  // Per Section 31 - leaving with unsaved changes (either an in-app
  // navigation or closing/refreshing the tab) prompts first.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => isDirty && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirty) return;
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const invalidateTheme = () => queryClient.invalidateQueries({ queryKey: ["theme", storeId] });

  const saveMutation = useMutation({
    mutationFn: () => updateDraftTheme(storeId, { layout: layout ?? undefined, themeSettings: themeSettings ?? undefined }),
    onSuccess: (data) => {
      toast.success("Draft saved");
      setSavedSnapshot(JSON.stringify({ layout: data.draft.layout, themeSettings: data.draft.themeSettings }));
      invalidateTheme();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not save draft"),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishTheme(storeId),
    onSuccess: () => {
      toast.success("Theme published — now live on the storefront");
      invalidateTheme();
      setPublishConfirmOpen(false);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not publish theme"),
  });

  const restoreMutation = useMutation({
    mutationFn: (versionId: string) => restoreThemeVersion(storeId, versionId),
    onSuccess: () => {
      toast.success("Restored into a new draft");
      invalidateTheme();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not restore this version"),
  });

  if (draftQuery.isLoading || !layout || !themeSettings) {
    return (
      <div className="flex h-[80vh] gap-4">
        <Skeleton className="w-80 shrink-0" />
        <Skeleton className="flex-1" />
      </div>
    );
  }
  if (draftQuery.isError) {
    return <div className="text-status-danger">Could not load this store's theme draft.</div>;
  }

  function applyPreset(presetKey: string) {
    const preset = THEME_PRESETS.find((p) => p.key === presetKey);
    if (!preset || !layout) return;
    setThemeSettings((s) => (s ? { ...s, ...preset.themeSettings, preset: preset.key } : s));
    setLayout((l) => {
      if (!l) return l;
      return {
        ...l,
        sections: l.sections.map((section) =>
          section.type === "hero" ? { ...section, settings: { ...section.settings, ...preset.heroOverrides } } : section,
        ),
      };
    });
  }

  function updateThemeField<K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) {
    setThemeSettings((s) => (s ? { ...s, [key]: value, preset: "custom" } : s));
  }

  function moveSection(index: number, direction: -1 | 1) {
    setLayout((l) => {
      if (!l) return l;
      const next = [...l.sections];
      const target = index + direction;
      if (target < 0 || target >= next.length) return l;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...l, sections: next };
    });
  }

  function toggleSection(id: string) {
    setLayout((l) => (l ? { ...l, sections: l.sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)) } : l));
  }

  function updateSectionSettings(id: string, settings: Record<string, unknown>) {
    setLayout((l) => (l ? { ...l, sections: l.sections.map((s) => (s.id === id ? { ...s, settings } : s)) } : l));
  }

  function handleReset() {
    setLayout(structuredClone(DEFAULT_STOREFRONT_LAYOUT));
    setThemeSettings({ ...DEFAULT_THEME_SETTINGS });
    setResetConfirmOpen(false);
    toast.success("Draft reset to the default theme — click Save Draft to keep it");
  }

  const editingSection = layout.sections.find((s) => s.id === editingSectionId) ?? null;
  const storeName = draftQuery.data?.draft ? productsQuery.data?.products[0]?.name ?? "Store" : "Store";

  return (
    <div className="flex h-[calc(100vh-7.5rem)] min-h-[560px] flex-col">
      {/* TOP BAR */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-default bg-surface-card px-4 py-3 shadow-card">
        <div className="flex items-center gap-3">
          <Link to="/themes" className="flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary">
            <ArrowLeft size={15} aria-hidden="true" />
            Themes
          </Link>
          {isDirty && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-status-caution">
              <span className="h-1.5 w-1.5 rounded-full bg-status-caution" aria-hidden="true" />
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border-default p-1">
          <DeviceButton icon={Laptop} label="Desktop" active={device === "desktop"} onClick={() => setDevice("desktop")} />
          <DeviceButton icon={Tablet} label="Tablet" active={device === "tablet"} onClick={() => setDevice("tablet")} />
          <DeviceButton icon={Smartphone} label="Mobile" active={device === "mobile"} onClick={() => setDevice("mobile")} />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setResetConfirmOpen(true)}>
            <RotateCcw size={14} aria-hidden="true" />
            Reset Theme
          </Button>
          <Button variant="secondary" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            Save Draft
          </Button>
          <Button variant="primary" loading={publishMutation.isPending} onClick={() => setPublishConfirmOpen(true)}>
            Publish
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        {/* LEFT RAIL */}
        <div className="flex w-80 shrink-0 flex-col overflow-hidden rounded-xl border border-border-default bg-surface-card shadow-card">
          <div className="flex border-b border-border-default">
            <TabButton label="Presets" active={tab === "presets"} onClick={() => setTab("presets")} />
            <TabButton label="Sections" active={tab === "sections"} onClick={() => setTab("sections")} />
            <TabButton label="Styles" active={tab === "styles"} onClick={() => setTab("styles")} />
            <TabButton label="History" active={tab === "history"} onClick={() => setTab("history")} />
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {tab === "presets" && <PresetsPanel currentPreset={themeSettings.preset} onApply={applyPreset} />}

            {tab === "sections" && (
              <SectionsPanel
                layout={layout}
                setLayout={setLayout}
                onMove={moveSection}
                onToggle={toggleSection}
                onEdit={setEditingSectionId}
              />
            )}

            {tab === "styles" && <StylesPanel themeSettings={themeSettings} update={updateThemeField} />}

            {tab === "history" && (
              <div className="space-y-2">
                {versionsQuery.isLoading && (
                  <>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                )}
                {versionsQuery.data?.versions.length === 0 && <EmptyState icon={<History size={18} aria-hidden="true" />} title="No versions yet" />}
                {versionsQuery.data?.versions.map((version) => (
                  <div key={version.id} className="rounded-lg border border-border-default p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-text-primary">v{version.versionNumber}</span>
                      <Badge tone={VERSION_STATUS_TONE[version.status]} size="sm">
                        {version.status}
                      </Badge>
                    </div>
                    <div className="mb-2 text-xs text-text-secondary">
                      {version.publishedAt ? `Published ${new Date(version.publishedAt).toLocaleString()}` : `Created ${new Date(version.createdAt).toLocaleString()}`}
                    </div>
                    {version.status === "OBSOLETE" && (
                      <button
                        type="button"
                        onClick={() => restoreMutation.mutate(version.id)}
                        disabled={restoreMutation.isPending}
                        className="text-xs font-medium text-primary underline transition-colors hover:no-underline disabled:opacity-50"
                      >
                        Restore into a new draft
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CENTER — live preview */}
        <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border-default bg-surface-card shadow-card">
          <StorefrontPreview
            layout={layout}
            themeSettings={themeSettings}
            products={productsQuery.data?.products ?? []}
            storeName={storeName}
            device={device}
          />
        </div>
      </div>

      <SectionSettingsDialog
        section={editingSection}
        onClose={() => setEditingSectionId(null)}
        onChange={(settings) => editingSectionId && updateSectionSettings(editingSectionId, settings)}
      />

      <ConfirmDialog
        open={publishConfirmOpen}
        onOpenChange={setPublishConfirmOpen}
        title="Publish this theme?"
        description="Your storefront will immediately use these theme settings."
        confirmLabel="Publish Theme"
        loading={publishMutation.isPending}
        onConfirm={() => publishMutation.mutate()}
      />

      <ConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Reset to the default theme?"
        description="This replaces your current draft with CommerceOS's default theme. Your published storefront is not affected until you publish again."
        confirmLabel="Reset Draft"
        destructive
        onConfirm={handleReset}
      />

      <ConfirmDialog
        open={discardConfirmOpen || blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open) {
            setDiscardConfirmOpen(false);
            if (blocker.state === "blocked") blocker.reset?.();
          }
        }}
        title="You have unsaved changes"
        description="Leaving now will discard your changes to this draft."
        confirmLabel="Discard Changes"
        destructive
        onConfirm={() => {
          if (blocker.state === "blocked") blocker.proceed?.();
        }}
      />
    </div>
  );
}

function DeviceButton({ icon: Icon, label, active, onClick }: { icon: typeof Laptop; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
        active ? "bg-primary text-white" : "text-text-secondary hover:bg-surface-sunken hover:text-text-primary"
      }`}
    >
      <Icon size={15} aria-hidden="true" />
    </button>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 border-b-2 px-2 py-3 text-xs font-semibold transition-colors ${
        active ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"
      }`}
    >
      {label}
    </button>
  );
}

function PresetsPanel({ currentPreset, onApply }: { currentPreset: string; onApply: (key: string) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-text-secondary">Applying a preset updates colors, fonts, and button/card style. Section content stays as-is.</p>
      {THEME_PRESETS.map((preset) => {
        const active = currentPreset === preset.key;
        return (
          <button
            key={preset.key}
            type="button"
            onClick={() => onApply(preset.key)}
            className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
              active ? "border-primary bg-primary-subtle" : "border-border-default hover:border-primary"
            }`}
          >
            <span className="flex h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border-default" aria-hidden="true">
              <span className="h-full w-1/3" style={{ backgroundColor: preset.themeSettings.colorPrimary }} />
              <span className="h-full w-1/3" style={{ backgroundColor: preset.themeSettings.colorAccent }} />
              <span className="h-full w-1/3" style={{ backgroundColor: preset.themeSettings.colorBackground }} />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                {preset.name}
                {active && <Wand2 size={12} className="text-primary" aria-hidden="true" />}
              </span>
              <span className="block truncate text-xs text-text-secondary">{preset.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SectionsPanel({
  layout,
  setLayout,
  onMove,
  onToggle,
  onEdit,
}: {
  layout: SimplifiedLayout;
  setLayout: React.Dispatch<React.SetStateAction<SimplifiedLayout | null>>;
  onMove: (index: number, direction: -1 | 1) => void;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border-default p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
            <Megaphone size={14} aria-hidden="true" />
            Announcement Bar
          </span>
          <button
            type="button"
            onClick={() => setLayout((l) => (l ? { ...l, announcementBar: { ...l.announcementBar, enabled: !l.announcementBar.enabled } } : l))}
            aria-label={layout.announcementBar.enabled ? "Hide announcement bar" : "Show announcement bar"}
            className="text-text-secondary hover:text-text-primary"
          >
            {layout.announcementBar.enabled ? <Eye size={15} aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}
          </button>
        </div>
        <Input
          value={layout.announcementBar.text}
          onChange={(e) => setLayout((l) => (l ? { ...l, announcementBar: { ...l.announcementBar, text: e.target.value } } : l))}
          placeholder="Free delivery on orders over ৳2,000"
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Homepage Sections</p>
        <ul className="space-y-2">
          {layout.sections.map((section, i) => (
            <li key={section.id} className="flex items-center gap-1.5 rounded-lg border border-border-default p-2.5">
              <div className="flex flex-col">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => onMove(i, -1)}
                  aria-label="Move section up"
                  className="text-text-secondary hover:text-text-primary disabled:opacity-25"
                >
                  <ChevronUp size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={i === layout.sections.length - 1}
                  onClick={() => onMove(i, 1)}
                  aria-label="Move section down"
                  className="text-text-secondary hover:text-text-primary disabled:opacity-25"
                >
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
              </div>
              <button type="button" onClick={() => onEdit(section.id)} className="min-w-0 flex-1 truncate text-left text-sm font-medium text-text-primary hover:text-primary">
                {SECTION_LABEL[section.type]}
              </button>
              <button
                type="button"
                onClick={() => onToggle(section.id)}
                aria-label={section.enabled ? "Hide section" : "Show section"}
                className="text-text-secondary hover:text-text-primary"
              >
                {section.enabled ? <Eye size={15} aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-border-default p-3">
        <p className="mb-2 text-sm font-medium text-text-primary">Footer</p>
        <div className="space-y-2">
          <Input
            label="Description"
            value={layout.footer.description}
            onChange={(e) => setLayout((l) => (l ? { ...l, footer: { ...l.footer, description: e.target.value } } : l))}
          />
          <Input
            label="Contact email"
            value={layout.footer.contactEmail}
            onChange={(e) => setLayout((l) => (l ? { ...l, footer: { ...l.footer, contactEmail: e.target.value } } : l))}
          />
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={layout.footer.showSocialLinks}
              onChange={(e) => setLayout((l) => (l ? { ...l, footer: { ...l.footer, showSocialLinks: e.target.checked } } : l))}
              className="h-4 w-4 rounded border-border-default text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            Show social links
          </label>
        </div>
      </div>
    </div>
  );
}

function StylesPanel({ themeSettings, update }: { themeSettings: ThemeSettings; update: <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => void }) {
  return (
    <div className="space-y-5">
      <Section title="Brand">
        <TextField label="Logo URL" value={themeSettings.logoUrl ?? ""} onChange={(v) => update("logoUrl", v || null)} />
        <TextField label="Favicon URL" value={themeSettings.faviconUrl ?? ""} onChange={(v) => update("faviconUrl", v || null)} />
      </Section>

      <Section title="Colors">
        <ColorField label="Primary" value={themeSettings.colorPrimary} onChange={(v) => update("colorPrimary", v)} />
        <ColorField label="Secondary" value={themeSettings.colorSecondary} onChange={(v) => update("colorSecondary", v)} />
        <ColorField label="Accent" value={themeSettings.colorAccent} onChange={(v) => update("colorAccent", v)} />
        <ColorField label="Background" value={themeSettings.colorBackground} onChange={(v) => update("colorBackground", v)} />
        <ColorField label="Surface / card" value={themeSettings.colorSurface} onChange={(v) => update("colorSurface", v)} />
        <ColorField label="Text" value={themeSettings.colorText} onChange={(v) => update("colorText", v)} />
        <ColorField label="Muted text" value={themeSettings.colorTextMuted} onChange={(v) => update("colorTextMuted", v)} />
      </Section>

      <Section title="Typography">
        <TextField label="Heading font" value={themeSettings.fontHeading} onChange={(v) => update("fontHeading", v)} />
        <TextField label="Body font" value={themeSettings.fontBody} onChange={(v) => update("fontBody", v)} />
      </Section>

      <Section title="Layout">
        <RangeField label={`Corner radius (${themeSettings.cornerRadius}px)`} min={0} max={24} value={themeSettings.cornerRadius} onChange={(v) => update("cornerRadius", v)} />
        <RangeField
          label={`Container width (${themeSettings.containerWidth}px)`}
          min={960}
          max={1600}
          step={20}
          value={themeSettings.containerWidth}
          onChange={(v) => update("containerWidth", v)}
        />
        <Select label="Section spacing" value={themeSettings.sectionSpacing} onChange={(e) => update("sectionSpacing", e.target.value as ThemeSettings["sectionSpacing"])}>
          <option value="compact">Compact</option>
          <option value="comfortable">Comfortable</option>
          <option value="spacious">Spacious</option>
        </Select>
        <Select label="Product card style" value={themeSettings.productCardStyle} onChange={(e) => update("productCardStyle", e.target.value as ThemeSettings["productCardStyle"])}>
          <option value="minimal">Minimal</option>
          <option value="bordered">Bordered</option>
          <option value="shadow">Shadow</option>
        </Select>
      </Section>

      <Section title="Buttons">
        <Select label="Button style" value={themeSettings.buttonStyle} onChange={(e) => update("buttonStyle", e.target.value as ThemeSettings["buttonStyle"])}>
          <option value="rounded">Rounded</option>
          <option value="square">Square</option>
          <option value="pill">Pill</option>
        </Select>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border-default pb-4 last:border-b-0">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-text-primary">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border-default bg-surface-card px-2.5 py-1.5 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between text-sm">
      <span className="text-xs font-medium text-text-primary">{label}</span>
      <span className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-7 rounded border border-border-default" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 rounded-lg border border-border-default bg-surface-card px-2 py-1 text-xs text-text-primary"
        />
      </span>
    </label>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-text-primary">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-primary" />
    </label>
  );
}

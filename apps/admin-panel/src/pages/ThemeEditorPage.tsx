import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@commerceos/ui";
import { History } from "lucide-react";
import { getDraftTheme, listThemeVersions, publishTheme, restoreThemeVersion, updateDraftTheme } from "../api/theme";
import { StorefrontPreview } from "../components/StorefrontPreview";
import type { SimplifiedLayout, StorefrontVersionStatus, ThemeSettings } from "../lib/api-types";
import { ApiError } from "../lib/api-client";
import { toast } from "../components/ui/Toaster";
import { Badge } from "../components/ui/Badge";
import type { BadgeTone } from "../components/ui/Badge";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";

const VERSION_STATUS_TONE: Record<StorefrontVersionStatus, BadgeTone> = {
  DRAFT: "info",
  PUBLISHED: "success",
  OBSOLETE: "neutral",
};

// Per SRS Part 7.3/Part 22.4 - the three-column Theme Editor: left settings
// panel, center live preview rendered from the exact same draft data the
// panel edits, right version history with Restore. Same functional
// structure as before - only the presentation changed (ConfirmDialog
// instead of window.confirm, toast instead of a manually-timed message,
// new token/spacing system).
export default function ThemeEditorPage() {
  const { storeId = "" } = useParams();
  const queryClient = useQueryClient();

  const draftQuery = useQuery({ queryKey: ["theme", storeId, "draft"], queryFn: () => getDraftTheme(storeId) });
  const versionsQuery = useQuery({ queryKey: ["theme", storeId, "versions"], queryFn: () => listThemeVersions(storeId) });

  const [layout, setLayout] = useState<SimplifiedLayout | null>(null);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings | null>(null);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);

  useEffect(() => {
    if (draftQuery.data) {
      setLayout(draftQuery.data.draft.layout);
      setThemeSettings(draftQuery.data.draft.themeSettings);
    }
  }, [draftQuery.data]);

  const invalidateTheme = () => {
    queryClient.invalidateQueries({ queryKey: ["theme", storeId] });
  };

  const saveMutation = useMutation({
    mutationFn: () => updateDraftTheme(storeId, { layout: layout ?? undefined, themeSettings: themeSettings ?? undefined }),
    onSuccess: () => {
      toast.success("Draft saved");
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
      <div className="flex h-[75vh] gap-4">
        <Skeleton className="w-80 shrink-0" />
        <Skeleton className="flex-1" />
        <Skeleton className="w-72 shrink-0" />
      </div>
    );
  }
  if (draftQuery.isError) {
    return <div className="text-status-danger">Could not load this store's theme draft.</div>;
  }

  // A fixed viewport-relative height (not calc(100vh - <chrome>)) - this
  // page's chrome height varies (TopNav is always there, the
  // ImpersonationBanner is conditional), so a fraction of the viewport is
  // more robust than guessing an exact px/rem offset that only holds when
  // both are in their default state.
  return (
    <div className="flex h-[75vh] min-h-[480px] gap-4">
      {/* LEFT — settings panel */}
      <div className="w-80 shrink-0 overflow-y-auto rounded-xl border border-border-default bg-surface-card p-5 shadow-card">
        <h1 className="mb-4 text-sm font-semibold text-text-primary">Theme Editor</h1>

        <Section title="Branding">
          <TextField label="Logo URL" value={themeSettings.logoUrl ?? ""} onChange={(v) => setThemeSettings((s) => (s ? { ...s, logoUrl: v || null } : s))} />
          <TextField label="Favicon URL" value={themeSettings.faviconUrl ?? ""} onChange={(v) => setThemeSettings((s) => (s ? { ...s, faviconUrl: v || null } : s))} />
          <TextField label="Heading font" value={themeSettings.fontHeading} onChange={(v) => setThemeSettings((s) => (s ? { ...s, fontHeading: v } : s))} />
          <TextField label="Body font" value={themeSettings.fontBody} onChange={(v) => setThemeSettings((s) => (s ? { ...s, fontBody: v } : s))} />
          <RangeField
            label={`Corner radius (${themeSettings.cornerRadius}px)`}
            min={0}
            max={24}
            value={themeSettings.cornerRadius}
            onChange={(v) => setThemeSettings((s) => (s ? { ...s, cornerRadius: v } : s))}
          />
        </Section>

        <Section title="Colors">
          <ColorField label="Primary" value={themeSettings.colorPrimary} onChange={(v) => setThemeSettings((s) => (s ? { ...s, colorPrimary: v } : s))} />
          <ColorField label="Secondary" value={themeSettings.colorSecondary} onChange={(v) => setThemeSettings((s) => (s ? { ...s, colorSecondary: v } : s))} />
          <ColorField label="Accent" value={themeSettings.colorAccent} onChange={(v) => setThemeSettings((s) => (s ? { ...s, colorAccent: v } : s))} />
          <ColorField label="Background" value={themeSettings.colorBackground} onChange={(v) => setThemeSettings((s) => (s ? { ...s, colorBackground: v } : s))} />
        </Section>

        <Section title="Homepage (simplified layout)">
          <TextField label="Hero heading" value={layout.heroHeading} onChange={(v) => setLayout((s) => (s ? { ...s, heroHeading: v } : s))} />
          <TextField label="Hero subheading" value={layout.heroSubheading} onChange={(v) => setLayout((s) => (s ? { ...s, heroSubheading: v } : s))} />
          <TextField label="Hero image URL" value={layout.heroImageUrl ?? ""} onChange={(v) => setLayout((s) => (s ? { ...s, heroImageUrl: v || null } : s))} />
          <label className="mt-2 flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={layout.showFeaturedProducts}
              onChange={(e) => setLayout((s) => (s ? { ...s, showFeaturedProducts: e.target.checked } : s))}
              className="h-4 w-4 rounded border-border-default text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            Show featured products section
          </label>
        </Section>

        <p className="mb-2 mt-4 text-xs text-text-secondary">
          Simplified layout for this milestone (hero + featured-products toggle only) - stands in for Part 7.2's full drag-and-drop section builder.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <Button variant="ghost" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            Save Draft
          </Button>
          <Button variant="primary" loading={publishMutation.isPending} onClick={() => setPublishConfirmOpen(true)}>
            Publish
          </Button>
        </div>
      </div>

      {/* CENTER — live preview, same rendering path as what will publish */}
      <div className="flex-1 overflow-hidden rounded-xl border border-border-default bg-surface-card shadow-card">
        <StorefrontPreview layout={layout} themeSettings={themeSettings} />
      </div>

      {/* RIGHT — version history */}
      <div className="w-72 shrink-0 overflow-y-auto rounded-xl border border-border-default bg-surface-card p-5 shadow-card">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Version History</h2>
        {versionsQuery.isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
        {versionsQuery.data?.versions.length === 0 && <EmptyState icon={<History size={18} aria-hidden="true" />} title="No versions yet" />}
        <ul className="space-y-2">
          {versionsQuery.data?.versions.map((version) => (
            <li key={version.id} className="rounded-lg border border-border-default p-3">
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
            </li>
          ))}
        </ul>
      </div>

      <ConfirmDialog
        open={publishConfirmOpen}
        onOpenChange={setPublishConfirmOpen}
        title="Publish this draft?"
        description="It immediately becomes what customers see on the live storefront."
        confirmLabel="Publish"
        loading={publishMutation.isPending}
        onConfirm={() => publishMutation.mutate()}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 border-b border-border-default pb-4 last:border-b-0">
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

function RangeField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-text-primary">{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-primary" />
    </label>
  );
}

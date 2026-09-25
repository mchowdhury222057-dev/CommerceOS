import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, Save } from "lucide-react";
import { getPlatformSettings, updatePlatformSettings } from "../api/settings";
import { toast } from "../components/ui/Toaster";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Input, Textarea } from "../components/ui/Input";
import { Skeleton } from "../components/ui/Skeleton";
import { ApiError } from "../lib/api-client";
import type { PlatformSettings } from "../lib/api-types";

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25, delay, ease: "easeOut" as const },
  };
}

type FormState = Pick<PlatformSettings, "platformName" | "platformLogoUrl" | "platformDescription" | "maintenanceMode" | "maintenanceMessage">;

// Admin Panel "Platform Settings" milestone. Only two sections are built:
// GENERAL and MAINTENANCE, each backed by a real PlatformSettings column
// (platform-settings.service.ts) that's actually read somewhere (the
// Sidebar's brand name reads platformName; Maintenance Mode actually gates
// the public storefront - see storefront.routes.ts). SECURITY/PLATFORM/
// SYSTEM PREFERENCES sections from the original brief are intentionally
// NOT built: session/security settings would mean touching the existing
// auth architecture's hardcoded JWT config (explicitly out of scope), and
// there's no existing hook for "default store configuration" or generic
// system preferences to attach real behavior to - adding toggles for those
// would be exactly the "meaningless switches that do nothing" this
// milestone said not to build.
export default function SettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: ["platform-settings"], queryFn: getPlatformSettings });
  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    if (settingsQuery.data && !form) {
      const { platformName, platformLogoUrl, platformDescription, maintenanceMode, maintenanceMessage } = settingsQuery.data;
      setForm({ platformName, platformLogoUrl, platformDescription, maintenanceMode, maintenanceMessage });
    }
  }, [settingsQuery.data, form]);

  const saveMutation = useMutation({
    mutationFn: (input: FormState) => updatePlatformSettings(input),
    onSuccess: (updated) => {
      queryClient.setQueryData(["platform-settings"], updated);
      toast.success("Platform settings saved");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not save settings"),
  });

  function handleSave() {
    if (!form) return;
    saveMutation.mutate(form);
  }

  if (settingsQuery.isLoading || !form) {
    return (
      <div>
        <SectionHeader title="Settings" description="CommerceOS platform configuration." />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (settingsQuery.isError) {
    return (
      <div>
        <SectionHeader title="Settings" description="CommerceOS platform configuration." />
        <p role="alert" className="rounded-lg bg-status-danger/10 px-3.5 py-2.5 text-sm text-status-danger">
          Could not load platform settings. Retry shortly.
        </p>
      </div>
    );
  }

  return (
    <div>
      <motion.div {...fadeUp(0)}>
        <SectionHeader
          title="Settings"
          description="CommerceOS platform configuration - distinct from your personal Profile."
          actions={
            <button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              <Save size={15} aria-hidden="true" />
              {saveMutation.isPending ? "Saving…" : "Save Changes"}
            </button>
          }
        />
      </motion.div>

      <div className="space-y-6">
        <motion.div {...fadeUp(0.05)}>
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <Input
                label="Platform Name"
                value={form.platformName}
                onChange={(e) => setForm((f) => (f ? { ...f, platformName: e.target.value } : f))}
                hint="Shown in the Admin Panel sidebar."
                maxLength={100}
                required
              />
              <Input
                label="Platform Logo URL"
                type="url"
                value={form.platformLogoUrl ?? ""}
                onChange={(e) => setForm((f) => (f ? { ...f, platformLogoUrl: e.target.value || null } : f))}
                placeholder="https://…"
                hint="Optional - a hosted image URL, same pattern as store theme logos."
              />
              <Textarea
                label="Platform Description"
                value={form.platformDescription ?? ""}
                onChange={(e) => setForm((f) => (f ? { ...f, platformDescription: e.target.value || null } : f))}
                rows={3}
                maxLength={500}
              />
            </CardBody>
          </Card>
        </motion.div>

        <motion.div {...fadeUp(0.1)}>
          <Card>
            <CardHeader>
              <CardTitle>Maintenance</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              {form.maintenanceMode && (
                <div className="flex items-start gap-2.5 rounded-lg bg-status-caution/10 px-3.5 py-2.5 text-sm text-status-caution">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  Maintenance Mode is ON - every store's public storefront is currently returning a 503 to customers.
                </div>
              )}
              <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <input
                  type="checkbox"
                  checked={form.maintenanceMode}
                  onChange={(e) => setForm((f) => (f ? { ...f, maintenanceMode: e.target.checked } : f))}
                  className="h-4 w-4 rounded border-border-default text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                />
                Maintenance Mode
              </label>
              <p className="-mt-2 text-xs text-text-secondary">
                When enabled, every store's customer-facing storefront returns a maintenance response. The Admin Panel and Store Dashboard stay accessible so you can turn this back off.
              </p>
              <Textarea
                label="Maintenance Message"
                value={form.maintenanceMessage ?? ""}
                onChange={(e) => setForm((f) => (f ? { ...f, maintenanceMessage: e.target.value || null } : f))}
                rows={2}
                maxLength={500}
                placeholder="This store is temporarily unavailable for maintenance. Please check back soon."
                hint="Shown to customers on the storefront while Maintenance Mode is on."
              />
            </CardBody>
          </Card>
        </motion.div>

        <motion.div {...fadeUp(0.15)} className="text-xs text-text-secondary">
          Last updated {new Date(settingsQuery.data!.updatedAt).toLocaleString()}
        </motion.div>
      </div>
    </div>
  );
}

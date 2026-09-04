import { useQuery } from "@tanstack/react-query";
import { Globe, Hash, Store } from "lucide-react";
import { getMyStore } from "../api/store";
import { useAuthStore } from "../stores/auth.store";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import type { BadgeTone } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import type { StoreStatus } from "../lib/api-types";

const STATUS_TONE: Record<StoreStatus, BadgeTone> = {
  PENDING: "caution",
  APPROVED: "success",
  SUSPENDED: "danger",
  REJECTED: "danger",
  ARCHIVED: "neutral",
};

// Read-only store information sourced from the same GET /api/store/:storeId
// endpoint the Dashboard already uses - no new backend surface. Deeper
// settings management (delivery areas, staff roles, etc.) already exist as
// their own dedicated flows elsewhere; this page doesn't duplicate them.
export default function SettingsPage() {
  const storeId = useAuthStore((s) => s.user?.storeId) as string;
  const storeQuery = useQuery({ queryKey: ["my-store", storeId], queryFn: () => getMyStore(storeId) });

  return (
    <div>
      <SectionHeader title="Settings" description="Your store's basic information." />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Store Information</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          {storeQuery.isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-5 w-1/4" />
            </div>
          )}
          {storeQuery.isError && <p className="text-sm text-status-danger">Could not load store information.</p>}
          {storeQuery.data && (
            <>
              <SettingRow icon={<Store size={16} aria-hidden="true" />} label="Store name" value={storeQuery.data.store.name} />
              <SettingRow icon={<Globe size={16} aria-hidden="true" />} label="Slug" value={storeQuery.data.store.slug} />
              <SettingRow
                icon={<Hash size={16} aria-hidden="true" />}
                label="Status"
                value={<Badge tone={STATUS_TONE[storeQuery.data.store.status]}>{storeQuery.data.store.status.replace("_", " ")}</Badge>}
              />
              <SettingRow label="Created" value={new Date(storeQuery.data.store.createdAt).toLocaleDateString()} />
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function SettingRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border-default pb-3 last:border-b-0 last:pb-0">
      <span className="flex items-center gap-2 text-sm text-text-secondary">
        {icon}
        {label}
      </span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  );
}

import { prisma } from "../lib/prisma.js";
import { writeAuditLog } from "../lib/audit.js";
import type { RequestUser } from "../middleware/auth.js";

const SINGLETON_ID = "singleton";

export interface PlatformSettingsView {
  platformName: string;
  platformLogoUrl: string | null;
  platformDescription: string | null;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  updatedAt: string;
}

function toView(row: { platformName: string; platformLogoUrl: string | null; platformDescription: string | null; maintenanceMode: boolean; maintenanceMessage: string | null; updatedAt: Date }): PlatformSettingsView {
  return {
    platformName: row.platformName,
    platformLogoUrl: row.platformLogoUrl,
    platformDescription: row.platformDescription,
    maintenanceMode: row.maintenanceMode,
    maintenanceMessage: row.maintenanceMessage,
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Platform Settings - a single row, created on first read/write (upsert on
// the fixed "singleton" id, matching the schema's own @default("singleton")
// so there is never more than one row by construction). No separate
// "does the row exist yet" branch needed anywhere else in the codebase.
export async function getPlatformSettings(): Promise<PlatformSettingsView> {
  const row = await prisma.platformSettings.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID },
  });
  return toView(row);
}

export interface UpdatePlatformSettingsInput {
  platformName?: string;
  platformLogoUrl?: string | null;
  platformDescription?: string | null;
  maintenanceMode?: boolean;
  maintenanceMessage?: string | null;
}

// Who changed platform settings is tracked via the existing AuditLog
// (reused, not a bespoke updatedBy column on PlatformSettings itself) -
// same mechanism every other Master Admin action already goes through.
export async function updatePlatformSettings(input: UpdatePlatformSettingsInput, actor: RequestUser): Promise<PlatformSettingsView> {
  const row = await prisma.platformSettings.upsert({
    where: { id: SINGLETON_ID },
    update: input,
    create: { id: SINGLETON_ID, ...input },
  });

  await writeAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    action: "UpdatePlatformSettings",
    metadata: { ...input },
  });

  return toView(row);
}

// Reused by the public storefront routes (maintenance-mode gate) - a
// narrower read than getPlatformSettings since customer-facing code has no
// business reading the rest of the platform config, only whether the site
// is up and what message to show if not.
export async function getMaintenanceStatus(): Promise<{ maintenanceMode: boolean; maintenanceMessage: string | null }> {
  const row = await prisma.platformSettings.findUnique({
    where: { id: SINGLETON_ID },
    select: { maintenanceMode: true, maintenanceMessage: true },
  });
  return { maintenanceMode: row?.maintenanceMode ?? false, maintenanceMessage: row?.maintenanceMessage ?? null };
}

import { api } from "../lib/api-client";
import type { PlatformSettings, UpdatePlatformSettingsInput } from "../lib/api-types";

export function getPlatformSettings(): Promise<PlatformSettings> {
  return api.get<PlatformSettings>("/api/admin/settings");
}

export function updatePlatformSettings(input: UpdatePlatformSettingsInput): Promise<PlatformSettings> {
  return api.put<PlatformSettings>("/api/admin/settings", input);
}

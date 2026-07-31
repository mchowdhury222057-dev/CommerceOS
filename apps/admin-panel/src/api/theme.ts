import { api } from "../lib/api-client";
import type { SimplifiedLayout, StorefrontVersion, ThemeSettings } from "../lib/api-types";

export function getDraftTheme(storeId: string): Promise<{ draft: StorefrontVersion }> {
  return api.get<{ draft: StorefrontVersion }>(`/api/admin/stores/${storeId}/theme`);
}

export interface UpdateDraftInput {
  layout?: Partial<SimplifiedLayout>;
  themeSettings?: Partial<ThemeSettings>;
}

export function updateDraftTheme(storeId: string, input: UpdateDraftInput): Promise<{ draft: StorefrontVersion }> {
  return api.put<{ draft: StorefrontVersion }>(`/api/admin/stores/${storeId}/theme`, input);
}

export function publishTheme(storeId: string): Promise<{ published: StorefrontVersion }> {
  return api.post<{ published: StorefrontVersion }>(`/api/admin/stores/${storeId}/theme/publish`);
}

export function listThemeVersions(storeId: string): Promise<{ versions: StorefrontVersion[] }> {
  return api.get<{ versions: StorefrontVersion[] }>(`/api/admin/stores/${storeId}/theme/versions`);
}

export function restoreThemeVersion(storeId: string, versionId: string): Promise<{ draft: StorefrontVersion }> {
  return api.post<{ draft: StorefrontVersion }>(`/api/admin/stores/${storeId}/theme/versions/${versionId}/restore`);
}

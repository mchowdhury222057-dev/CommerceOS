import { api } from "../lib/api-client";
import type { PreviewProduct, SimplifiedLayout, StoreThemeSummary, StorefrontVersion, ThemeSettings } from "../lib/api-types";

export function getDraftTheme(storeId: string): Promise<{ draft: StorefrontVersion }> {
  return api.get<{ draft: StorefrontVersion }>(`/api/admin/stores/${storeId}/theme`);
}

export interface ListStoreThemesResult {
  themes: StoreThemeSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export function listStoreThemes(params: { search?: string; page?: number; pageSize?: number } = {}): Promise<ListStoreThemesResult> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  const qs = query.toString();
  return api.get<ListStoreThemesResult>(`/api/admin/themes${qs ? `?${qs}` : ""}`);
}

export function getThemePreviewProducts(storeId: string): Promise<{ products: PreviewProduct[] }> {
  return api.get<{ products: PreviewProduct[] }>(`/api/admin/stores/${storeId}/theme/preview-products`);
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

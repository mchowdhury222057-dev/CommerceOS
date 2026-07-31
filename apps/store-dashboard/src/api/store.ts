import { api } from "../lib/api-client";
import type { StoreDetail } from "../lib/api-types";

export function getMyStore(storeId: string): Promise<{ store: StoreDetail }> {
  return api.get<{ store: StoreDetail }>(`/api/store/${storeId}`);
}

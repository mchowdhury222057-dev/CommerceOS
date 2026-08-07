import { ShieldAlert } from "lucide-react";
import type { AuditLogEntry } from "../lib/api-types";

const ROLE_LABEL: Record<string, string> = {
  MASTER_ADMIN: "Master Admin",
  STORE_OWNER: "Store Owner",
  STORE_MANAGER: "Store Manager",
  INVENTORY_MANAGER: "Inventory Manager",
  ORDER_MANAGER: "Order Manager",
  CUSTOMER_SUPPORT: "Customer Support",
};

// Per Part 7.5/18.2 - the Store Activity view's whole point is to make
// "who did what" legible at a glance rather than requiring the reader to
// decode a raw action string + JSON metadata blob. Falls back to the raw
// action name for anything not covered here, so a future action type never
// renders blank.
function describeEntry(entry: AuditLogEntry): string {
  const who = ROLE_LABEL[entry.actorRole] ?? entry.actorRole;
  const meta = (entry.metadata ?? {}) as Record<string, unknown>;
  const productName = typeof meta.productName === "string" ? meta.productName : "a product";

  switch (entry.action) {
    case "ProductCreated":
      return `${who} created product "${productName}"`;
    case "ProductUpdated":
      return `${who} updated product "${productName}"`;
    case "ProductDeactivated":
      return `${who} removed "${productName}" from the storefront`;
    case "ProductStockAdjusted":
      return `${who} adjusted stock for "${productName}"${meta.sku ? ` (${meta.sku})` : ""}: ${meta.previousStock ?? "?"} → ${meta.newStock ?? "?"}`;
    case "ProductImageUploaded":
      return `${who} uploaded an image to "${productName}"`;
    case "ProductImageRemoved":
      return `${who} removed an image from "${productName}"`;
    case "OrderStatusChanged":
      return `${who} updated an order's status`;
    case "StoreThemePublished":
      return `${who} published a new theme`;
    case "StoreThemeRolledBack":
      return `${who} restored a previous theme version`;
    case "StoreSuspended":
      return `${who} suspended this store`;
    case "StoreReactivated":
      return `${who} reactivated this store`;
    case "StoreApproved":
      return `${who} approved this store`;
    case "StoreCreated":
      return `${who} created this store`;
    case "StoreSelfSignedUp":
      return `${who} signed up and created this store`;
    case "StaffInvited":
      return `${who} invited a new staff member`;
    case "ImpersonationSessionStarted":
      return `${who} started an impersonation session`;
    case "ImpersonationSessionEnded":
      return `${who} ended an impersonation session`;
    default:
      return entry.action;
  }
}

export function AuditLogTable({
  entries,
  isLoading,
  isError,
}: {
  entries: AuditLogEntry[] | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-default bg-surface-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-sunken text-xs uppercase tracking-wide text-text-secondary">
          <tr>
            <th className="px-4 py-3">When</th>
            <th className="px-4 py-3">Who</th>
            <th className="px-4 py-3">What</th>
            <th className="px-4 py-3">Target</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-text-secondary">
                Loading…
              </td>
            </tr>
          )}
          {isError && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-status-danger">
                Could not load activity.
              </td>
            </tr>
          )}
          {!isLoading && !isError && entries?.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-text-secondary">
                No entries match your filters.
              </td>
            </tr>
          )}
          {entries?.map((entry) => {
            const isImpersonated = Boolean(entry.impersonationSessionId);
            return (
              <tr
                key={entry.id}
                className={`border-t border-border-default transition-colors hover:bg-surface-sunken/60 ${isImpersonated ? "border-l-4 border-l-amber-impersonation bg-amber-impersonation/5" : ""}`}
              >
                <td className="whitespace-nowrap px-4 py-3 text-text-secondary">{new Date(entry.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-text-secondary">
                  <div className="font-medium text-text-primary">{entry.actor.name}</div>
                  <div className="text-xs">{ROLE_LABEL[entry.actorRole] ?? entry.actorRole}</div>
                </td>
                <td className="px-4 py-3 font-medium text-text-primary">
                  <div className="flex items-center gap-1.5">
                    {isImpersonated && <ShieldAlert size={14} className="shrink-0 text-amber-impersonation" aria-hidden="true" />}
                    {describeEntry(entry)}
                  </div>
                  {isImpersonated && (
                    <span className="text-xs font-normal text-amber-impersonation">
                      during impersonation session {entry.impersonationSessionId}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-secondary">{entry.targetResource ?? entry.targetStoreId ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

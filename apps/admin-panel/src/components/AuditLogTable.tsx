import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { Badge } from "./ui/Badge";
import type { BadgeTone } from "./ui/Badge";
import { Table, TBody, TD, TH, THead, TR, TableState } from "./ui/Table";
import { TableRowSkeleton } from "./ui/Skeleton";
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

// A category badge per action - purely a display grouping (prefix match
// on the same real `action` string already stored), not a new field.
function categoryOf(action: string): { label: string; tone: BadgeTone } {
  if (action.startsWith("Product")) return { label: "Product", tone: "info" };
  if (action.startsWith("Order")) return { label: "Order", tone: "primary" };
  if (action.startsWith("StoreTheme")) return { label: "Theme", tone: "caution" };
  if (action.startsWith("Store")) return { label: "Store", tone: "success" };
  if (action.startsWith("Impersonation")) return { label: "Impersonation", tone: "danger" };
  if (action.startsWith("Staff")) return { label: "Staff", tone: "neutral" };
  return { label: "Other", tone: "neutral" };
}

export function AuditLogTable({
  entries,
  isLoading,
  isError,
  footer,
}: {
  entries: AuditLogEntry[] | undefined;
  isLoading: boolean;
  isError: boolean;
  footer?: ReactNode;
}) {
  return (
    <Table footer={footer}>
      <THead>
        <tr>
          <TH>When</TH>
          <TH>Who</TH>
          <TH>Type</TH>
          <TH>What</TH>
          <TH>Target</TH>
        </tr>
      </THead>
      <TBody>
        {isLoading && Array.from({ length: 6 }, (_, i) => <TableRowSkeleton key={i} columns={5} />)}
        {isError && (
          <TableState colSpan={5} tone="danger">
            Could not load activity.
          </TableState>
        )}
        {!isLoading && !isError && entries?.length === 0 && <TableState colSpan={5}>No entries match your filters.</TableState>}
        {entries?.map((entry) => {
          const isImpersonated = Boolean(entry.impersonationSessionId);
          const category = categoryOf(entry.action);
          return (
            <TR key={entry.id} className={isImpersonated ? "border-l-4 border-l-amber-impersonation bg-amber-impersonation/5" : undefined}>
              <TD className="whitespace-nowrap text-text-secondary">{new Date(entry.createdAt).toLocaleString()}</TD>
              <TD className="text-text-secondary">
                <div className="font-medium text-text-primary">{entry.actor.name}</div>
                <div className="text-xs">{ROLE_LABEL[entry.actorRole] ?? entry.actorRole}</div>
              </TD>
              <TD>
                <Badge tone={category.tone} size="sm">
                  {category.label}
                </Badge>
              </TD>
              <TD className="font-medium">
                <div className="flex items-center gap-1.5">
                  {isImpersonated && <ShieldAlert size={14} className="shrink-0 text-amber-impersonation" aria-hidden="true" />}
                  {describeEntry(entry)}
                </div>
                {isImpersonated && <span className="text-xs font-normal text-amber-impersonation">during impersonation session {entry.impersonationSessionId}</span>}
              </TD>
              <TD className="text-text-secondary">{entry.targetResource ?? entry.targetStoreId ?? "—"}</TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}

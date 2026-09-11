import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@commerceos/ui";
import { ExternalLink, Palette, Paintbrush2 } from "lucide-react";
import { listStoreThemes } from "../api/theme";
import { SectionHeader } from "../components/ui/SectionHeader";
import { SearchBar } from "../components/ui/SearchBar";
import { Table, TBody, TD, TH, THead, TR, TableState } from "../components/ui/Table";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { Pagination } from "../components/ui/Pagination";
import { Badge } from "../components/ui/Badge";
import type { BadgeTone } from "../components/ui/Badge";
import type { StoreThemeStatus } from "../lib/api-types";

const STOREFRONT_URL = (import.meta.env.VITE_STOREFRONT_URL as string | undefined) ?? "http://localhost:5175";

const STATUS_LABEL: Record<StoreThemeStatus, string> = {
  PUBLISHED: "Published",
  DRAFT_ONLY: "Draft only",
  DEFAULT: "Default theme",
};

const STATUS_TONE: Record<StoreThemeStatus, BadgeTone> = {
  PUBLISHED: "success",
  DRAFT_ONLY: "caution",
  DEFAULT: "neutral",
};

const PAGE_SIZE = 15;

// Per Section 3 - Theme Management: every store, its currently-relevant
// preset name, and whether that's actually live (Published) or still
// sitting in Draft. Customize opens the full Theme Editor (Section 4);
// Preview opens the real public storefront in a new tab - there's no
// separate "preview mode" to build (Section 33), the live site already IS
// the preview once something's published, and the editor's own live
// preview covers the draft case.
export default function ThemeManagementPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["themes", search, page],
    queryFn: () => listStoreThemes({ search: search || undefined, page, pageSize: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });

  return (
    <div>
      <SectionHeader title="Theme Management" description="Customize each store's storefront design - colors, layout, and homepage sections." />

      <SearchBar
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder="Search stores…"
        className="mb-4 max-w-sm"
      />

      <Table footer={data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />}>
        <THead>
          <tr>
            <TH>Store</TH>
            <TH>Theme</TH>
            <TH>Status</TH>
            <TH className="text-right">Actions</TH>
          </tr>
        </THead>
        <TBody>
          {isLoading && Array.from({ length: 5 }, (_, i) => <TableRowSkeleton key={i} columns={4} />)}
          {isError && (
            <TableState colSpan={4} tone="danger">
              Could not load themes. Retry shortly.
            </TableState>
          )}
          {!isLoading && !isError && data?.themes.length === 0 && (
            <TableState colSpan={4}>{search ? "No stores match your search." : "No stores yet."}</TableState>
          )}
          {data?.themes.map((theme) => (
            <TR key={theme.storeId} clickable onClick={() => navigate(`/stores/${theme.storeId}/theme`)}>
              <TD>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary" aria-hidden="true">
                    <Palette size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-text-primary">{theme.storeName}</div>
                    <div className="text-xs text-text-secondary">{theme.storeSlug}</div>
                  </div>
                </div>
              </TD>
              <TD className="capitalize text-text-primary">{theme.presetName}</TD>
              <TD>
                <Badge tone={STATUS_TONE[theme.status]}>{STATUS_LABEL[theme.status]}</Badge>
              </TD>
              <TD>
                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <a
                    href={`${STOREFRONT_URL}/${theme.storeSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Preview live storefront"
                    aria-label={`Preview ${theme.storeName}'s live storefront`}
                    className="rounded-md p-2 text-text-secondary transition-colors hover:bg-surface-sunken hover:text-primary"
                  >
                    <ExternalLink size={16} aria-hidden="true" />
                  </a>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/stores/${theme.storeId}/theme`)}>
                    <Paintbrush2 size={14} aria-hidden="true" />
                    Customize
                  </Button>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

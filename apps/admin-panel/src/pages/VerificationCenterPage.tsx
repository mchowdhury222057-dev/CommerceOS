import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@commerceos/ui";
import { Clock, ClipboardCheck, ShieldCheck, XCircle } from "lucide-react";
import { listVerifications } from "../api/verifications";
import { StatCard } from "../components/ui/StatCard";
import { SectionHeader } from "../components/ui/SectionHeader";
import { SearchBar } from "../components/ui/SearchBar";
import { Select } from "../components/ui/Input";
import { Table, TBody, TD, TH, THead, TR, TableState } from "../components/ui/Table";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { Pagination } from "../components/ui/Pagination";
import { Badge } from "../components/ui/Badge";
import type { BadgeTone } from "../components/ui/Badge";
import type { VerificationStatus } from "../lib/api-types";

const STATUS_LABEL: Record<VerificationStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  VERIFIED: "Approved",
  REJECTED: "Rejected",
};

const STATUS_TONE: Record<VerificationStatus, BadgeTone> = {
  NOT_STARTED: "neutral",
  IN_PROGRESS: "neutral",
  SUBMITTED: "caution",
  UNDER_REVIEW: "info",
  VERIFIED: "success",
  REJECTED: "danger",
};

const PAGE_SIZE = 15;

// Per Section 14 - the Verification Center: status cards (Pending/Under
// Review/Approved/Rejected, matching the section's exact card set) plus a
// searchable/filterable table of every store verification application.
// Clicking a row opens the Review page (Section 15), the same URL the
// admin-notification email's "Review Application" button links to.
export default function VerificationCenterPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["verifications", search, statusFilter, dateFrom, dateTo, page],
    queryFn: () =>
      listVerifications({
        search: search || undefined,
        status: statusFilter ? [statusFilter] : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: (prev) => prev,
  });

  function resetToFirstPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  const counts = data?.counts;

  return (
    <div>
      <SectionHeader title="Verification Center" description="Review store applications submitted for identity and business verification." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending" value={counts?.SUBMITTED ?? 0} icon={<Clock size={16} aria-hidden="true" />} tone="caution" loading={isLoading} />
        <StatCard label="Under Review" value={counts?.UNDER_REVIEW ?? 0} icon={<ClipboardCheck size={16} aria-hidden="true" />} tone="info" loading={isLoading} />
        <StatCard label="Approved" value={counts?.VERIFIED ?? 0} icon={<ShieldCheck size={16} aria-hidden="true" />} tone="success" loading={isLoading} />
        <StatCard label="Rejected" value={counts?.REJECTED ?? 0} icon={<XCircle size={16} aria-hidden="true" />} tone="danger" loading={isLoading} />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchBar
          value={search}
          onChange={(e) => resetToFirstPage(setSearch)(e.target.value)}
          placeholder="Search by store or owner…"
          className="w-full max-w-sm"
        />
        <Select value={statusFilter} onChange={(e) => resetToFirstPage(setStatusFilter)(e.target.value as VerificationStatus | "")} className="w-48">
          <option value="">All statuses</option>
          {(Object.keys(STATUS_LABEL) as VerificationStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <label className="mb-2.5 flex items-center gap-2 text-sm text-text-secondary">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => resetToFirstPage(setDateFrom)(e.target.value)}
            className="rounded-lg border border-border-default bg-surface-card px-2.5 py-2 text-sm text-text-primary"
          />
        </label>
        <label className="mb-2.5 flex items-center gap-2 text-sm text-text-secondary">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => resetToFirstPage(setDateTo)(e.target.value)}
            className="rounded-lg border border-border-default bg-surface-card px-2.5 py-2 text-sm text-text-primary"
          />
        </label>
      </div>

      <Table footer={data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />}>
        <THead>
          <tr>
            <TH>Store</TH>
            <TH>Owner</TH>
            <TH>Email</TH>
            <TH>Submitted</TH>
            <TH>Status</TH>
            <TH className="text-right">Action</TH>
          </tr>
        </THead>
        <TBody>
          {isLoading && Array.from({ length: 5 }, (_, i) => <TableRowSkeleton key={i} columns={6} />)}
          {isError && (
            <TableState colSpan={6} tone="danger">
              Could not load verification applications. Retry shortly.
            </TableState>
          )}
          {!isLoading && !isError && data?.verifications.length === 0 && (
            <TableState colSpan={6}>{search || statusFilter ? "No applications match your filters." : "No verification applications yet."}</TableState>
          )}
          {data?.verifications.map((v) => (
            <TR key={v.id} clickable onClick={() => navigate(`/verifications/${v.id}`)}>
              <TD>
                <div className="font-medium text-text-primary">{v.store.name}</div>
                <div className="text-xs text-text-secondary">{v.store.slug}</div>
              </TD>
              <TD>{v.owner.name}</TD>
              <TD className="text-text-secondary">{v.owner.email}</TD>
              <TD className="text-text-secondary">{v.submittedAt ? new Date(v.submittedAt).toLocaleDateString() : "—"}</TD>
              <TD>
                <Badge tone={STATUS_TONE[v.status]}>{STATUS_LABEL[v.status]}</Badge>
              </TD>
              <TD className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/verifications/${v.id}`);
                  }}
                >
                  Review
                </Button>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

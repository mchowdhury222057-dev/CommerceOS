import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Search, ShieldAlert, ShieldX, Users } from "lucide-react";
import { getRiskLevelDistribution, listCustomers } from "../api/customers";
import { useAuthStore } from "../stores/auth.store";
import { StatCard } from "../components/ui/StatCard";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Select } from "../components/ui/Input";
import { Table, TBody, TD, TH, THead, TR, TableState } from "../components/ui/Table";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { Pagination } from "../components/ui/Pagination";
import { RiskBadge } from "../components/RiskBadge";
import type { RiskLevel } from "../lib/api-types";

const PAGE_SIZE = 15;

// Per SRS Part 22.14 - a "restyle only" page: the risk-level computation,
// filtering, and RiskBadge component are untouched. Only the surrounding
// table/card chrome and the risk-distribution summary strip are new.
export default function CustomersPage() {
  const storeId = useAuthStore((s) => s.user?.storeId) as string;
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const riskFilter = (searchParams.get("risk") as RiskLevel | "") ?? "";
  const page = Number(searchParams.get("page") ?? "1");

  const distributionQuery = useQuery({
    queryKey: ["customers", "risk-summary", storeId],
    queryFn: () => getRiskLevelDistribution(storeId),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["customers", storeId, search, riskFilter, page],
    queryFn: () =>
      listCustomers(storeId, {
        search: search || undefined,
        riskLevel: riskFilter ? [riskFilter] : undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: (prev) => prev,
  });

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next);
  }

  const dist = distributionQuery.data?.distribution;

  return (
    <div>
      <SectionHeader title="Customers" description="Everyone who has ordered from your storefront." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Customers" value={dist ? dist.NONE + dist.CAUTION + dist.HIGH_RISK : 0} icon={<Users size={16} aria-hidden="true" />} tone="primary" loading={distributionQuery.isLoading} />
        <StatCard label="Caution" value={dist?.CAUTION ?? 0} icon={<ShieldAlert size={16} aria-hidden="true" />} tone="caution" loading={distributionQuery.isLoading} />
        <StatCard label="High Risk" value={dist?.HIGH_RISK ?? 0} icon={<ShieldX size={16} aria-hidden="true" />} tone="danger" loading={distributionQuery.isLoading} />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => updateParam("search", e.target.value)}
            placeholder="Search by name or phone…"
            className="w-full rounded-lg border border-border-default bg-surface-card py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-disabled focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
        </div>
        <Select value={riskFilter} onChange={(e) => updateParam("risk", e.target.value)} className="sm:w-48">
          <option value="">All risk levels</option>
          <option value="NONE">None</option>
          <option value="CAUTION">Caution</option>
          <option value="HIGH_RISK">High Risk</option>
        </Select>
      </div>

      <Table>
        <THead>
          <tr>
            <TH>Name</TH>
            <TH>Phone</TH>
            <TH>Risk</TH>
            <TH className="text-right">Total Orders</TH>
            <TH className="text-right">Delivered</TH>
            <TH className="text-right">Refused</TH>
          </tr>
        </THead>
        <TBody>
          {isLoading && Array.from({ length: 6 }, (_, i) => <TableRowSkeleton key={i} columns={6} />)}
          {isError && (
            <TableState colSpan={6} tone="danger">
              Could not load customers. Retry shortly.
            </TableState>
          )}
          {!isLoading && !isError && data?.customers.length === 0 && (
            <TableState colSpan={6}>{search || riskFilter ? "No customers match your filters." : "No customers yet."}</TableState>
          )}
          {data?.customers.map((customer) => (
            <TR key={customer.id}>
              <TD className="font-medium">{customer.name}</TD>
              <TD className="text-text-secondary">{customer.phone}</TD>
              <TD>
                {customer.riskLevel === "NONE" ? <span className="text-xs text-text-disabled">—</span> : <RiskBadge level={customer.riskLevel} />}
              </TD>
              <TD className="text-right text-text-secondary">{customer.totalOrders}</TD>
              <TD className="text-right text-text-secondary">{customer.deliveredOrders}</TD>
              <TD className="text-right text-text-secondary">{customer.refusedOrders}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={(p) => updateParam("page", String(p))} />}
    </div>
  );
}

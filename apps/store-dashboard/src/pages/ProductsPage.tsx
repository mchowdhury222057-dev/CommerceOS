import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@commerceos/ui";
import { ArrowDown, ArrowUp, ArrowUpDown, ImageOff, Package, Pencil, Search } from "lucide-react";
import { toast } from "../components/ui/Toaster";
import { archiveProduct, listProducts, updateProduct } from "../api/products";
import { useAuthStore } from "../stores/auth.store";
import { Badge } from "../components/ui/Badge";
import type { BadgeTone } from "../components/ui/Badge";
import { Select } from "../components/ui/Input";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Table, TBody, TD, TH, THead, TR, TableState } from "../components/ui/Table";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Pagination } from "../components/ui/Pagination";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { ApiError } from "../lib/api-client";
import type { Product, ProductStatus } from "../lib/api-types";

const STATUS_TONE: Record<ProductStatus, BadgeTone> = {
  DRAFT: "neutral",
  ACTIVE: "success",
  ARCHIVED: "danger",
};

const PAGE_SIZE = 10;
type SortKey = "name" | "price" | "stock";
type SortDir = "asc" | "desc";

function formatMoney(value: number): string {
  return `৳${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function priceDisplay(product: Product): string {
  const activeVariants = product.variants.filter((v) => v.isActive);
  const prices = activeVariants.map((v) => (v.priceOverride != null ? Number(v.priceOverride) : Number(product.basePrice)));
  const distinct = new Set(prices);
  if (distinct.size <= 1) return formatMoney(Number(product.basePrice));
  return `from ${formatMoney(Math.min(...prices))}`;
}

function firstPrice(product: Product): number {
  const activeVariants = product.variants.filter((v) => v.isActive);
  const prices = activeVariants.map((v) => (v.priceOverride != null ? Number(v.priceOverride) : Number(product.basePrice)));
  return prices.length ? Math.min(...prices) : Number(product.basePrice);
}

function firstImageUrl(product: Product): string | null {
  if (product.images.length === 0) return null;
  return [...product.images].sort((a, b) => a.displayOrder - b.displayOrder)[0].url;
}

function stockSummary(product: Product): { total: number; lowStock: boolean } {
  const activeVariants = product.variants.filter((v) => v.isActive);
  const total = activeVariants.reduce((sum, v) => sum + v.stock, 0);
  const lowStock = activeVariants.some((v) => v.stock > 0 && v.stock <= product.lowStockThreshold);
  return { total, lowStock };
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const storeId = useAuthStore((s) => s.user?.storeId) as string;
  const queryClient = useQueryClient();

  const search = searchParams.get("search") ?? "";
  const statusFilter = (searchParams.get("status") as ProductStatus | "") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);
  const [toDeactivate, setToDeactivate] = useState<Product | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["products", storeId, search, statusFilter, page],
    queryFn: () =>
      listProducts(storeId, {
        search: search || undefined,
        status: statusFilter ? [statusFilter] : undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: (prev) => prev,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["products", storeId] });

  const deactivateMutation = useMutation({
    mutationFn: (productId: string) => archiveProduct(storeId, productId),
    onSuccess: () => {
      invalidate();
      toast.success("Product removed from storefront");
      setToDeactivate(null);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update product"),
  });

  const reactivateMutation = useMutation({
    mutationFn: (productId: string) => updateProduct(storeId, productId, { status: "ACTIVE" }),
    onSuccess: () => {
      invalidate();
      toast.success("Product reactivated");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update product"),
  });

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next);
  }

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  const sortedProducts = useMemo(() => {
    const list = data?.products ?? [];
    if (!sort) return list;
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sort.key === "name") return a.name.localeCompare(b.name) * factor;
      if (sort.key === "price") return (firstPrice(a) - firstPrice(b)) * factor;
      return (stockSummary(a).total - stockSummary(b).total) * factor;
    });
  }, [data?.products, sort]);

  return (
    <div>
      <SectionHeader
        title="Products"
        description="Your product catalog, stock levels, and pricing."
        actions={
          <Button variant="primary" onClick={() => navigate("/products/new")}>
            + Add Product
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => updateParam("search", e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-lg border border-border-default bg-surface-card py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-disabled focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => updateParam("status", e.target.value)} className="sm:w-48">
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </Select>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block">
        <Table>
          <THead>
            <tr>
              <TH>Product</TH>
              <SortableTH label="SKU" />
              <SortableTH label="Price" active={sort?.key === "price"} dir={sort?.dir} onClick={() => toggleSort("price")} />
              <SortableTH label="Stock" active={sort?.key === "stock"} dir={sort?.dir} onClick={() => toggleSort("stock")} />
              <TH>Status</TH>
              <TH>Variants</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading && Array.from({ length: 5 }, (_, i) => <TableRowSkeleton key={i} columns={7} />)}
            {isError && (
              <TableState colSpan={7} tone="danger">
                Could not load products. Retry shortly.
              </TableState>
            )}
            {!isLoading && !isError && sortedProducts.length === 0 && (
              <TableState colSpan={7}>{search || statusFilter ? "No products match your filters." : "No products yet. Add your first product to get started."}</TableState>
            )}
            {sortedProducts.map((product) => (
              <ProductTableRow
                key={product.id}
                product={product}
                onEdit={() => navigate(`/products/${product.id}/edit`)}
                onDeactivate={() => setToDeactivate(product)}
                onReactivate={() => reactivateMutation.mutate(product.id)}
                reactivating={reactivateMutation.isPending}
              />
            ))}
          </TBody>
        </Table>
        {data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={(p) => updateParam("page", String(p))} />}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 sm:hidden">
        {isLoading && Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-sunken" />)}
        {!isLoading && sortedProducts.length === 0 && (
          <EmptyState icon={<Package size={20} aria-hidden="true" />} title="No products found" />
        )}
        {sortedProducts.map((product) => {
          const { total, lowStock } = stockSummary(product);
          const imageUrl = firstImageUrl(product);
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => navigate(`/products/${product.id}/edit`)}
              className="flex w-full items-center gap-3 rounded-xl border border-border-default bg-surface-card p-3.5 text-left shadow-card"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-sunken">
                {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : <ImageOff size={16} className="text-text-secondary" aria-hidden="true" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-text-primary">{product.name}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-text-secondary">
                  <span>{priceDisplay(product)}</span>
                  <span className={lowStock ? "font-medium text-status-caution" : ""}>· {total} in stock</span>
                </div>
              </div>
              <Badge tone={STATUS_TONE[product.status]} size="sm">
                {product.status}
              </Badge>
            </button>
          );
        })}
        {data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={(p) => updateParam("page", String(p))} />}
      </div>

      <ConfirmDialog
        open={Boolean(toDeactivate)}
        onOpenChange={(open) => !open && setToDeactivate(null)}
        title="Remove from storefront?"
        description={toDeactivate ? `"${toDeactivate.name}" will no longer be visible to customers. You can reactivate it later.` : undefined}
        confirmLabel="Remove"
        destructive
        loading={deactivateMutation.isPending}
        onConfirm={() => toDeactivate && deactivateMutation.mutate(toDeactivate.id)}
      />
    </div>
  );
}

function SortableTH({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active?: boolean;
  dir?: SortDir;
  onClick?: () => void;
}) {
  if (!onClick) return <TH>{label}</TH>;
  return (
    <TH>
      <button type="button" onClick={onClick} className="flex items-center gap-1 transition-colors hover:text-text-primary">
        {label}
        {active ? dir === "asc" ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" /> : <ArrowUpDown size={12} className="opacity-40" aria-hidden="true" />}
      </button>
    </TH>
  );
}

function ProductTableRow({
  product,
  onEdit,
  onDeactivate,
  onReactivate,
  reactivating,
}: {
  product: Product;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  reactivating: boolean;
}) {
  const { total, lowStock } = stockSummary(product);
  const imageUrl = firstImageUrl(product);
  const activeVariants = product.variants.filter((v) => v.isActive);
  const primarySku = activeVariants[0]?.sku;

  return (
    <TR>
      <TD>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-sunken">
            {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : <ImageOff size={16} className="text-text-secondary" aria-hidden="true" />}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium text-text-primary">{product.name}</div>
            {product.category && <div className="text-xs text-text-secondary">{product.category.name}</div>}
          </div>
        </div>
      </TD>
      <TD className="font-mono text-xs text-text-secondary">
        {primarySku ?? "—"}
        {activeVariants.length > 1 && <span className="ml-1 text-text-disabled">+{activeVariants.length - 1}</span>}
      </TD>
      <TD>{priceDisplay(product)}</TD>
      <TD>
        <span className={lowStock ? "font-medium text-status-caution" : ""}>{total}</span>
        {lowStock && <span className="ml-1 text-xs text-status-caution">low</span>}
        {total === 0 && <span className="ml-1 text-xs text-status-danger">out of stock</span>}
      </TD>
      <TD>
        <Badge tone={STATUS_TONE[product.status]} size="sm">
          {product.status}
        </Badge>
      </TD>
      <TD className="text-text-secondary">{product.variants.length}</TD>
      <TD>
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onEdit}>
            <Pencil size={13} aria-hidden="true" />
            Edit
          </Button>
          {product.status === "ARCHIVED" ? (
            <Button variant="secondary" size="sm" loading={reactivating} onClick={onReactivate}>
              Reactivate
            </Button>
          ) : (
            <Button variant="destructive" size="sm" onClick={onDeactivate}>
              Deactivate
            </Button>
          )}
        </div>
      </TD>
    </TR>
  );
}

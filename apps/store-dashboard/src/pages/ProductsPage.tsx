import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, StatusBadge } from "@commerceos/ui";
import type { StatusTone } from "@commerceos/ui";
import { ImageOff } from "lucide-react";
import { archiveProduct, listProducts, updateProduct } from "../api/products";
import { useAuthStore } from "../stores/auth.store";
import type { Product, ProductStatus } from "../lib/api-types";

const STATUS_TONE: Record<ProductStatus, StatusTone> = {
  DRAFT: "neutral",
  ACTIVE: "success",
  ARCHIVED: "danger",
};

function formatMoney(value: number): string {
  return `৳${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Per SRS Part 8.1 - if any active variant's override differs from the
// base price, the list shows a "from ৳X" range instead of a single
// misleading number.
function priceDisplay(product: Product): string {
  const activeVariants = product.variants.filter((v) => v.isActive);
  const prices = activeVariants.map((v) => (v.priceOverride != null ? Number(v.priceOverride) : Number(product.basePrice)));
  const distinct = new Set(prices);
  if (distinct.size <= 1) return formatMoney(Number(product.basePrice));
  return `from ${formatMoney(Math.min(...prices))}`;
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
  const storeId = useAuthStore((s) => s.user?.storeId) as string;
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["products", storeId],
    queryFn: () => listProducts(storeId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["products", storeId] });

  const deactivateMutation = useMutation({
    mutationFn: (productId: string) => archiveProduct(storeId, productId),
    onSuccess: invalidate,
  });

  const reactivateMutation = useMutation({
    mutationFn: (productId: string) => updateProduct(storeId, productId, { status: "ACTIVE" }),
    onSuccess: invalidate,
  });

  function handleDeactivate(product: Product) {
    if (!window.confirm(`This will remove "${product.name}" from your storefront — continue?`)) return;
    deactivateMutation.mutate(product.id);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Products</h1>
          <p className="text-sm text-text-secondary">Your product catalog, stock levels, and pricing.</p>
        </div>
        <Button variant="primary" onClick={() => navigate("/products/new")}>
          + Add Product
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border-default bg-surface-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-sunken text-xs uppercase tracking-wide text-text-secondary">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-secondary">
                  Loading products…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-status-danger">
                  Could not load products. Retry shortly.
                </td>
              </tr>
            )}
            {!isLoading && !isError && data?.products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-secondary">
                  No products yet. Add your first product to get started.
                </td>
              </tr>
            )}
            {data?.products.map((product) => {
              const { total, lowStock } = stockSummary(product);
              const imageUrl = firstImageUrl(product);
              return (
                <tr key={product.id} className="border-t border-border-default">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-sunken">
                        {imageUrl ? (
                          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ImageOff size={16} className="text-text-secondary" aria-hidden="true" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-text-primary">{product.name}</div>
                        {product.category && <div className="text-xs text-text-secondary">{product.category.name}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-primary">{priceDisplay(product)}</td>
                  <td className="px-4 py-3">
                    <span className={lowStock ? "font-medium text-status-caution" : "text-text-primary"}>{total}</span>
                    {lowStock && <span className="ml-1 text-xs text-status-caution">low stock</span>}
                    {total === 0 && <span className="ml-1 text-xs text-status-danger">out of stock</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={STATUS_TONE[product.status]} label={product.status} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/products/${product.id}/edit`)}>
                        Edit
                      </Button>
                      {product.status === "ARCHIVED" ? (
                        <Button variant="secondary" size="sm" loading={reactivateMutation.isPending} onClick={() => reactivateMutation.mutate(product.id)}>
                          Reactivate
                        </Button>
                      ) : (
                        <Button variant="destructive" size="sm" loading={deactivateMutation.isPending} onClick={() => handleDeactivate(product)}>
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

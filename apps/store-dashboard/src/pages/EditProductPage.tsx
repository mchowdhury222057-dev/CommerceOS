import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@commerceos/ui";
import { ArrowDown, ArrowUp, ImageOff, Trash2, Upload } from "lucide-react";
import {
  addVariant,
  deleteProductImage,
  deleteVariant,
  getProduct,
  listCategories,
  updateProduct,
  updateProductImage,
  updateVariant,
  uploadProductImage,
} from "../api/products";
import { useAuthStore } from "../stores/auth.store";
import { ApiError } from "../lib/api-client";
import { toast } from "../components/ui/Toaster";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { Input, Select, Textarea } from "../components/ui/Input";
import { SectionHeader } from "../components/ui/SectionHeader";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Skeleton } from "../components/ui/Skeleton";
import type { ProductImage, ProductStatus, ProductVariant } from "../lib/api-types";

export default function EditProductPage() {
  const { productId = "" } = useParams();
  const navigate = useNavigate();
  const storeId = useAuthStore((s) => s.user?.storeId) as string;
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({ queryKey: ["categories", storeId], queryFn: () => listCategories(storeId) });
  const productQuery = useQuery({ queryKey: ["product", storeId, productId], queryFn: () => getProduct(storeId, productId) });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<ProductStatus>("ACTIVE");
  const [lowStockThreshold, setLowStockThreshold] = useState("5");

  useEffect(() => {
    const product = productQuery.data?.product;
    if (!product) return;
    setName(product.name);
    setDescription(product.description);
    setBasePrice(product.basePrice);
    setCategoryId(product.categoryId ?? "");
    setStatus(product.status);
    setLowStockThreshold(String(product.lowStockThreshold));
  }, [productQuery.data]);

  const invalidateProduct = () => {
    queryClient.invalidateQueries({ queryKey: ["product", storeId, productId] });
    queryClient.invalidateQueries({ queryKey: ["products", storeId] });
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      updateProduct(storeId, productId, {
        name,
        description,
        basePrice: Number(basePrice),
        categoryId: categoryId || null,
        status,
        lowStockThreshold: Number(lowStockThreshold),
      }),
    onSuccess: () => {
      invalidateProduct();
      toast.success("Changes saved");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not save changes"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate();
  }

  if (productQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (productQuery.isError) return <div className="text-status-danger">Could not load this product.</div>;

  return (
    <div>
      <SectionHeader title="Edit Product" description={productQuery.data?.product.name} />

      <form onSubmit={handleSubmit} className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Base price (৳)" type="number" min="0.01" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} required />
            <Select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">No category</option>
              {categoriesQuery.data?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)}>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived (hidden from storefront)</option>
            </Select>
            <Input
              label="Low stock threshold"
              type="number"
              min="0"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
            />
            <div className="sm:col-span-2">
              <Textarea label="Description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </CardBody>
        </Card>

        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" variant="primary" loading={updateMutation.isPending}>
            Save Changes
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate("/products")}>
            Cancel
          </Button>
        </div>
      </form>

      {productQuery.data && (
        <div className="space-y-6">
          <ImageManager storeId={storeId} productId={productId} images={productQuery.data.product.images} onChanged={invalidateProduct} />
          <VariantManager storeId={storeId} productId={productId} variants={productQuery.data.product.variants} onChanged={invalidateProduct} />
        </div>
      )}
    </div>
  );
}

function ImageManager({
  storeId,
  productId,
  images,
  onChanged,
}: {
  storeId: string;
  productId: string;
  images: ProductImage[];
  onChanged: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toRemove, setToRemove] = useState<ProductImage | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadProductImage(storeId, productId, file),
    onSuccess: () => {
      onChanged();
      toast.success("Image uploaded");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not upload image"),
  });

  const reorderMutation = useMutation({
    mutationFn: ({ imageId, displayOrder }: { imageId: string; displayOrder: number }) =>
      updateProductImage(storeId, productId, imageId, { displayOrder }),
    onSuccess: onChanged,
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not reorder image"),
  });

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => deleteProductImage(storeId, productId, imageId),
    onSuccess: () => {
      onChanged();
      toast.success("Image removed");
      setToRemove(null);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not remove image"),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
  }

  function moveImage(index: number, direction: -1 | 1) {
    const target = images[index + direction];
    const current = images[index];
    if (!target || !current) return;
    reorderMutation.mutate({ imageId: current.id, displayOrder: target.displayOrder });
    reorderMutation.mutate({ imageId: target.id, displayOrder: current.displayOrder });
  }

  const ordered = [...images].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Images</CardTitle>
      </CardHeader>
      <CardBody>
        {ordered.length === 0 ? (
          <div className="mb-4 flex h-24 items-center justify-center rounded-lg border border-dashed border-border-default text-text-secondary">
            <div className="flex flex-col items-center gap-1 text-xs">
              <ImageOff size={20} aria-hidden="true" />
              No images yet
            </div>
          </div>
        ) : (
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ordered.map((image, i) => (
              <div key={image.id} className="overflow-hidden rounded-lg border border-border-default">
                <div className="relative aspect-square bg-surface-sunken">
                  <img src={image.url} alt={image.altText ?? ""} className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-white">First</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-1 p-1.5">
                  <button
                    type="button"
                    onClick={() => moveImage(i, -1)}
                    disabled={i === 0 || reorderMutation.isPending}
                    aria-label="Move image earlier"
                    className="rounded p-1 text-text-secondary hover:bg-surface-sunken disabled:opacity-30"
                  >
                    <ArrowUp size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(i, 1)}
                    disabled={i === ordered.length - 1 || reorderMutation.isPending}
                    aria-label="Move image later"
                    className="rounded p-1 text-text-secondary hover:bg-surface-sunken disabled:opacity-30"
                  >
                    <ArrowDown size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setToRemove(image)}
                    disabled={deleteMutation.isPending}
                    aria-label="Remove image"
                    className="rounded p-1 text-text-secondary hover:bg-status-danger/10 hover:text-status-danger disabled:opacity-30"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="product-image-upload" />
        <Button type="button" variant="secondary" size="sm" loading={uploadMutation.isPending} onClick={() => fileInputRef.current?.click()}>
          <Upload size={14} aria-hidden="true" />
          {uploadMutation.isPending ? "Uploading…" : "Upload Image"}
        </Button>
      </CardBody>

      <ConfirmDialog
        open={Boolean(toRemove)}
        onOpenChange={(open) => !open && setToRemove(null)}
        title="Remove this image?"
        confirmLabel="Remove"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => toRemove && deleteMutation.mutate(toRemove.id)}
      />
    </Card>
  );
}

interface DraftVariant {
  sku: string;
  size: string;
  color: string;
  stock: string;
  priceOverride: string;
}

function emptyVariant(): DraftVariant {
  return { sku: "", size: "", color: "", stock: "0", priceOverride: "" };
}

function toAttributes(v: DraftVariant): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (v.size.trim()) attrs.size = v.size.trim();
  if (v.color.trim()) attrs.color = v.color.trim();
  return attrs;
}

function VariantManager({
  storeId,
  productId,
  variants,
  onChanged,
}: {
  storeId: string;
  productId: string;
  variants: ProductVariant[];
  onChanged: () => void;
}) {
  const [newVariant, setNewVariant] = useState<DraftVariant>(emptyVariant());
  const [toRemove, setToRemove] = useState<ProductVariant | null>(null);

  const addMutation = useMutation({
    mutationFn: () =>
      addVariant(storeId, productId, {
        sku: newVariant.sku,
        attributes: toAttributes(newVariant),
        stock: Number(newVariant.stock),
        priceOverride: newVariant.priceOverride ? Number(newVariant.priceOverride) : null,
      }),
    onSuccess: () => {
      setNewVariant(emptyVariant());
      onChanged();
      toast.success("Variant added");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not add variant"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ variantId, stock, priceOverride }: { variantId: string; stock: number; priceOverride: number | null }) =>
      updateVariant(storeId, productId, variantId, { stock, priceOverride }),
    onSuccess: () => {
      onChanged();
      toast.success("Variant updated");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update variant"),
  });

  const deleteMutation = useMutation({
    mutationFn: (variantId: string) => deleteVariant(storeId, productId, variantId),
    onSuccess: (result) => {
      toast.success(
        result.deleted
          ? "Variant removed"
          : "This variant has already been ordered, so it was deactivated instead — past orders referencing it stay intact.",
      );
      onChanged();
      setToRemove(null);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not remove variant"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Variants</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {variants.map((variant) => (
          <VariantRow
            key={variant.id}
            variant={variant}
            onSave={(stock, priceOverride) => updateMutation.mutate({ variantId: variant.id, stock, priceOverride })}
            onRemove={() => setToRemove(variant)}
            saving={updateMutation.isPending}
          />
        ))}

        <div className="grid grid-cols-1 gap-3 border-t border-border-default pt-4 sm:grid-cols-12 sm:items-end">
          <div className="sm:col-span-3">
            <Input label="SKU" value={newVariant.sku} onChange={(e) => setNewVariant((s) => ({ ...s, sku: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Input label="Size" value={newVariant.size} onChange={(e) => setNewVariant((s) => ({ ...s, size: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Input label="Color" value={newVariant.color} onChange={(e) => setNewVariant((s) => ({ ...s, color: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Input label="Stock" type="number" value={newVariant.stock} onChange={(e) => setNewVariant((s) => ({ ...s, stock: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Price override"
              type="number"
              placeholder="optional"
              value={newVariant.priceOverride}
              onChange={(e) => setNewVariant((s) => ({ ...s, priceOverride: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-1">
            <Button type="button" variant="secondary" size="sm" loading={addMutation.isPending} disabled={!newVariant.sku} onClick={() => addMutation.mutate()}>
              Add
            </Button>
          </div>
        </div>
      </CardBody>

      <ConfirmDialog
        open={Boolean(toRemove)}
        onOpenChange={(open) => !open && setToRemove(null)}
        title="Remove this variant?"
        description={toRemove ? `"${toRemove.sku}" will be removed if it's never been ordered, or deactivated if it has.` : undefined}
        confirmLabel="Remove"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => toRemove && deleteMutation.mutate(toRemove.id)}
      />
    </Card>
  );
}

function VariantRow({
  variant,
  onSave,
  onRemove,
  saving,
}: {
  variant: ProductVariant;
  onSave: (stock: number, priceOverride: number | null) => void;
  onRemove: () => void;
  saving: boolean;
}) {
  const [stock, setStock] = useState(String(variant.stock));
  const [priceOverride, setPriceOverride] = useState(variant.priceOverride ?? "");

  const label = Object.entries(variant.attributes)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  return (
    <div
      className={`grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-12 sm:items-end ${
        variant.isActive ? "border-border-default" : "border-border-default bg-surface-sunken opacity-60"
      }`}
    >
      <div className="sm:col-span-3 text-sm">
        <div className="font-medium text-text-primary">{variant.sku}</div>
        <div className="text-xs text-text-secondary">{label || "—"}</div>
        {!variant.isActive && <div className="text-xs text-status-danger">Inactive (hidden from storefront)</div>}
      </div>
      <div className="sm:col-span-3">
        <Input label="Stock" type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
      </div>
      <div className="sm:col-span-3">
        <Input label="Price override" type="number" placeholder="optional" value={String(priceOverride)} onChange={(e) => setPriceOverride(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <Button type="button" variant="secondary" size="sm" loading={saving} onClick={() => onSave(Number(stock), priceOverride ? Number(priceOverride) : null)}>
          Save
        </Button>
      </div>
      <div className="flex justify-end sm:col-span-1">
        <button type="button" onClick={onRemove} aria-label={`Remove variant ${variant.sku}`} className="rounded-md p-2 text-text-secondary hover:bg-status-danger/10 hover:text-status-danger">
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

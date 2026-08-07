import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@commerceos/ui";
import { ArrowDown, ArrowUp, ImageOff, Trash2, Upload } from "lucide-react";
import {
  addVariant,
  createProduct,
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
import type { ProductImage, ProductStatus, ProductVariant } from "../lib/api-types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

// Per SRS Part 8.1 - one page handles both Create and Edit. Create keeps
// variants as pure local rows submitted together (the only shape the
// backend's create endpoint accepts); Edit manages each existing variant
// against its own dedicated endpoint immediately (add/update/remove), since
// there is no bulk-replace endpoint for an existing product's variants.
export default function ProductFormPage() {
  const { productId } = useParams();
  const isEdit = Boolean(productId);
  const navigate = useNavigate();
  const storeId = useAuthStore((s) => s.user?.storeId) as string;
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({ queryKey: ["categories", storeId], queryFn: () => listCategories(storeId) });
  const productQuery = useQuery({
    queryKey: ["product", storeId, productId],
    queryFn: () => getProduct(storeId, productId as string),
    enabled: isEdit,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<ProductStatus>("ACTIVE");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [draftVariants, setDraftVariants] = useState<DraftVariant[]>([emptyVariant()]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const product = productQuery.data?.product;
    if (!product) return;
    setName(product.name);
    setDescription(product.description);
    setBasePrice(product.basePrice);
    setCategoryId(product.categoryId ?? "");
    setStatus(product.status);
    setSlug(product.slug);
  }, [productQuery.data]);

  function handleNameChange(value: string) {
    setName(value);
    if (!isEdit && !slugTouched) setSlug(slugify(value));
  }

  const invalidateProduct = () => {
    queryClient.invalidateQueries({ queryKey: ["product", storeId, productId] });
    queryClient.invalidateQueries({ queryKey: ["products", storeId] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createProduct(storeId, {
        name,
        description,
        basePrice: Number(basePrice),
        categoryId: categoryId || null,
        status,
        slug,
        variants: draftVariants.map((v) => ({
          sku: v.sku,
          attributes: toAttributes(v),
          stock: Number(v.stock),
          priceOverride: v.priceOverride ? Number(v.priceOverride) : null,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", storeId] });
      navigate("/products");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not create product"),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateProduct(storeId, productId as string, {
        name,
        description,
        basePrice: Number(basePrice),
        categoryId: categoryId || null,
        status,
      }),
    onSuccess: invalidateProduct,
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not save changes"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (isEdit) updateMutation.mutate();
    else createMutation.mutate();
  }

  function updateDraftVariant(index: number, patch: Partial<DraftVariant>) {
    setDraftVariants((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addDraftVariantRow() {
    setDraftVariants((rows) => [...rows, emptyVariant()]);
  }

  function removeDraftVariantRow(index: number) {
    setDraftVariants((rows) => rows.filter((_, i) => i !== index));
  }

  if (isEdit && productQuery.isLoading) return <div className="text-text-secondary">Loading…</div>;
  if (isEdit && productQuery.isError) return <div className="text-status-danger">Could not load this product.</div>;

  return (
    <div className="max-w-3xl">
      <button type="button" onClick={() => navigate("/products")} className="mb-4 text-sm text-text-secondary hover:text-text-primary">
        ← Back to Products
      </button>
      <h1 className="mb-6 text-xl font-semibold text-text-primary">{isEdit ? "Edit Product" : "Add Product"}</h1>

      <form onSubmit={handleSubmit} className="mb-8 rounded-lg border border-border-default bg-surface-card p-5">
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Name" value={name} onChange={handleNameChange} required />
          <TextField
            label="Base price (৳)"
            type="number"
            value={basePrice}
            onChange={setBasePrice}
            required
            min="0.01"
            step="0.01"
          />
          {!isEdit && <TextField label="Slug" value={slug} onChange={(v) => { setSlugTouched(true); setSlug(slugify(v)); }} required />}
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-text-primary">Category</span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
            >
              <option value="">No category</option>
              {categoriesQuery.data?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-text-primary">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProductStatus)}
              className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived (hidden from storefront)</option>
            </select>
          </label>
        </div>

        <label className="mt-4 block text-sm">
          <span className="mb-1 block font-medium text-text-primary">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-border-default px-3 py-2 text-sm"
          />
        </label>

        {!isEdit && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-text-primary">Variants</h2>
            <div className="space-y-3">
              {draftVariants.map((v, i) => (
                <div key={i} className="grid grid-cols-12 items-end gap-2 rounded-md border border-border-default p-3">
                  <div className="col-span-3">
                    <MiniField label="SKU" value={v.sku} onChange={(val) => updateDraftVariant(i, { sku: val })} required />
                  </div>
                  <div className="col-span-2">
                    <MiniField label="Size" value={v.size} onChange={(val) => updateDraftVariant(i, { size: val })} />
                  </div>
                  <div className="col-span-2">
                    <MiniField label="Color" value={v.color} onChange={(val) => updateDraftVariant(i, { color: val })} />
                  </div>
                  <div className="col-span-2">
                    <MiniField label="Stock" type="number" value={v.stock} onChange={(val) => updateDraftVariant(i, { stock: val })} required />
                  </div>
                  <div className="col-span-2">
                    <MiniField
                      label="Price override"
                      type="number"
                      value={v.priceOverride}
                      onChange={(val) => updateDraftVariant(i, { priceOverride: val })}
                      placeholder="optional"
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => removeDraftVariantRow(i)}
                      disabled={draftVariants.length === 1}
                      aria-label="Remove variant row"
                      className="rounded-md p-2 text-text-secondary hover:bg-surface-sunken hover:text-status-danger disabled:opacity-30"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={addDraftVariantRow}>
              + Add variant row
            </Button>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-status-danger">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" loading={createMutation.isPending || updateMutation.isPending} className="mt-6">
          {isEdit ? "Save Changes" : "Create Product"}
        </Button>
      </form>

      {isEdit && productQuery.data && (
        <>
          <ImageManager storeId={storeId} productId={productId as string} images={productQuery.data.product.images} onChanged={invalidateProduct} />
          <div className="mt-6">
            <VariantManager storeId={storeId} productId={productId as string} variants={productQuery.data.product.variants} onChanged={invalidateProduct} />
          </div>
        </>
      )}
    </div>
  );
}

// Per SRS Part 8.1 - upload only exists for an already-created product
// (mirrors VariantManager's own edit-only placement); each image is managed
// against its own endpoint immediately, no batching. Variant-specific
// images (e.g. a different photo per color) are a plausible future
// enhancement, not built this round - this is product-level only.
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
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadProductImage(storeId, productId, file),
    onSuccess: () => {
      onChanged();
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not upload image"),
  });

  const reorderMutation = useMutation({
    mutationFn: ({ imageId, displayOrder }: { imageId: string; displayOrder: number }) =>
      updateProductImage(storeId, productId, imageId, { displayOrder }),
    onSuccess: onChanged,
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not reorder image"),
  });

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => deleteProductImage(storeId, productId, imageId),
    onSuccess: onChanged,
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not remove image"),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
  }

  function moveImage(index: number, direction: -1 | 1) {
    const target = images[index + direction];
    const current = images[index];
    if (!target || !current) return;
    // Swap displayOrder between the two adjacent images.
    reorderMutation.mutate({ imageId: current.id, displayOrder: target.displayOrder });
    reorderMutation.mutate({ imageId: target.id, displayOrder: current.displayOrder });
  }

  function handleRemove(image: ProductImage) {
    if (!window.confirm("Remove this image?")) return;
    deleteMutation.mutate(image.id);
  }

  const ordered = [...images].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="mb-6 rounded-lg border border-border-default bg-surface-card p-5">
      <h2 className="mb-3 text-sm font-semibold text-text-primary">Images</h2>

      {error && (
        <p role="alert" className="mb-3 rounded-md bg-status-danger/10 px-3 py-2 text-xs text-status-danger">
          {error}
        </p>
      )}

      {ordered.length === 0 ? (
        <div className="mb-4 flex h-24 items-center justify-center rounded-md border border-dashed border-border-default text-text-secondary">
          <div className="flex flex-col items-center gap-1 text-xs">
            <ImageOff size={20} aria-hidden="true" />
            No images yet
          </div>
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ordered.map((image, i) => (
            <div key={image.id} className="overflow-hidden rounded-md border border-border-default">
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
                  onClick={() => handleRemove(image)}
                  disabled={deleteMutation.isPending}
                  aria-label="Remove image"
                  className="rounded p-1 text-text-secondary hover:bg-surface-sunken hover:text-status-danger disabled:opacity-30"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="product-image-upload" />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        loading={uploadMutation.isPending}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={14} aria-hidden="true" />
        {uploadMutation.isPending ? "Uploading…" : "Upload Image"}
      </Button>
    </div>
  );
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
  const [message, setMessage] = useState<string | null>(null);

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
    },
    onError: (err) => setMessage(err instanceof ApiError ? err.message : "Could not add variant"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ variantId, stock, priceOverride }: { variantId: string; stock: number; priceOverride: number | null }) =>
      updateVariant(storeId, productId, variantId, { stock, priceOverride }),
    onSuccess: onChanged,
    onError: (err) => setMessage(err instanceof ApiError ? err.message : "Could not update variant"),
  });

  const deleteMutation = useMutation({
    mutationFn: (variantId: string) => deleteVariant(storeId, productId, variantId),
    onSuccess: (result) => {
      setMessage(
        result.deleted
          ? "Variant removed."
          : "This variant has already been ordered, so it was deactivated instead of deleted — it no longer appears on your storefront, but past orders referencing it stay intact.",
      );
      onChanged();
    },
    onError: (err) => setMessage(err instanceof ApiError ? err.message : "Could not remove variant"),
  });

  function handleRemove(variant: ProductVariant) {
    if (!window.confirm(`Remove variant "${variant.sku}"?`)) return;
    deleteMutation.mutate(variant.id);
  }

  return (
    <div className="rounded-lg border border-border-default bg-surface-card p-5">
      <h2 className="mb-3 text-sm font-semibold text-text-primary">Variants</h2>
      {message && <p className="mb-3 rounded-md bg-primary-subtle p-3 text-xs text-text-primary">{message}</p>}

      <div className="space-y-3">
        {variants.map((variant) => (
          <VariantRow
            key={variant.id}
            variant={variant}
            onSave={(stock, priceOverride) => updateMutation.mutate({ variantId: variant.id, stock, priceOverride })}
            onRemove={() => handleRemove(variant)}
            saving={updateMutation.isPending}
          />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-12 items-end gap-2 border-t border-border-default pt-4">
        <div className="col-span-3">
          <MiniField label="SKU" value={newVariant.sku} onChange={(v) => setNewVariant((s) => ({ ...s, sku: v }))} />
        </div>
        <div className="col-span-2">
          <MiniField label="Size" value={newVariant.size} onChange={(v) => setNewVariant((s) => ({ ...s, size: v }))} />
        </div>
        <div className="col-span-2">
          <MiniField label="Color" value={newVariant.color} onChange={(v) => setNewVariant((s) => ({ ...s, color: v }))} />
        </div>
        <div className="col-span-2">
          <MiniField label="Stock" type="number" value={newVariant.stock} onChange={(v) => setNewVariant((s) => ({ ...s, stock: v }))} />
        </div>
        <div className="col-span-2">
          <MiniField
            label="Price override"
            type="number"
            value={newVariant.priceOverride}
            onChange={(v) => setNewVariant((s) => ({ ...s, priceOverride: v }))}
            placeholder="optional"
          />
        </div>
        <div className="col-span-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={addMutation.isPending}
            disabled={!newVariant.sku}
            onClick={() => addMutation.mutate()}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
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
    <div className={`grid grid-cols-12 items-end gap-2 rounded-md border p-3 ${variant.isActive ? "border-border-default" : "border-border-default bg-surface-sunken opacity-60"}`}>
      <div className="col-span-3 text-sm">
        <div className="font-medium text-text-primary">{variant.sku}</div>
        <div className="text-xs text-text-secondary">{label || "—"}</div>
        {!variant.isActive && <div className="text-xs text-status-danger">Inactive (hidden from storefront)</div>}
      </div>
      <div className="col-span-3">
        <MiniField label="Stock" type="number" value={stock} onChange={setStock} />
      </div>
      <div className="col-span-3">
        <MiniField label="Price override" type="number" value={String(priceOverride)} onChange={setPriceOverride} placeholder="optional" />
      </div>
      <div className="col-span-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={saving}
          onClick={() => onSave(Number(stock), priceOverride ? Number(priceOverride) : null)}
        >
          Save
        </Button>
      </div>
      <div className="col-span-1">
        <button type="button" onClick={onRemove} aria-label={`Remove variant ${variant.sku}`} className="rounded-md p-2 text-text-secondary hover:bg-surface-sunken hover:text-status-danger">
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function TextField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  min?: string;
  step?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-text-primary">{props.label}</span>
      <input
        type={props.type ?? "text"}
        required={props.required}
        min={props.min}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded-md border border-border-default px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      />
    </label>
  );
}

function MiniField(props: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; placeholder?: string }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-text-secondary">{props.label}</span>
      <input
        type={props.type ?? "text"}
        required={props.required}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded-md border border-border-default px-2 py-1.5 text-sm"
      />
    </label>
  );
}

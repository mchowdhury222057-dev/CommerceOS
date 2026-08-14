import { useEffect, useState } from "react";
import { useNavigate, useBlocker } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";
import { Button } from "@commerceos/ui";
import { ImageOff, Plus, Trash2 } from "lucide-react";
import { createProduct, listCategories } from "../api/products";
import { useAuthStore } from "../stores/auth.store";
import { ApiError } from "../lib/api-client";
import { toast } from "../components/ui/Toaster";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { Input, Select, Textarea } from "../components/ui/Input";
import { SectionHeader } from "../components/ui/SectionHeader";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import type { ProductStatus } from "../lib/api-types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface VariantFormRow {
  sku: string;
  size: string;
  color: string;
  stock: string;
  priceOverride: string;
}

interface ProductFormValues {
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  basePrice: string;
  status: ProductStatus;
  lowStockThreshold: string;
  variants: VariantFormRow[];
}

const DEFAULT_VALUES: ProductFormValues = {
  name: "",
  slug: "",
  description: "",
  categoryId: "",
  basePrice: "",
  status: "ACTIVE",
  lowStockThreshold: "5",
  variants: [{ sku: "", size: "", color: "", stock: "0", priceOverride: "" }],
};

function toAttributes(v: VariantFormRow): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (v.size.trim()) attrs.size = v.size.trim();
  if (v.color.trim()) attrs.color = v.color.trim();
  return attrs;
}

export default function AddProductPage() {
  const navigate = useNavigate();
  const storeId = useAuthStore((s) => s.user?.storeId) as string;
  const [slugTouched, setSlugTouched] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const categoriesQuery = useQuery({ queryKey: ["categories", storeId], queryFn: () => listCategories(storeId) });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProductFormValues>({ defaultValues: DEFAULT_VALUES });

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });
  const values = watch();

  // Unsaved-changes protection: a real in-app navigation blocker (not just
  // beforeunload, which only covers tab close/refresh) via React Router's
  // useBlocker, plus beforeunload for that other case.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => isDirty && !isSubmitting && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirty) return;
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const createMutation = useMutation({
    mutationFn: (input: ProductFormValues) =>
      createProduct(storeId, {
        name: input.name,
        description: input.description,
        basePrice: Number(input.basePrice),
        categoryId: input.categoryId || null,
        status: input.status,
        slug: input.slug,
        lowStockThreshold: input.lowStockThreshold ? Number(input.lowStockThreshold) : undefined,
        variants: input.variants.map((v) => ({
          sku: v.sku,
          attributes: toAttributes(v),
          stock: Number(v.stock),
          priceOverride: v.priceOverride ? Number(v.priceOverride) : null,
        })),
      }),
    onSuccess: () => {
      toast.success("Product created");
      navigate("/products");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not create product"),
  });

  function handleNameChange(value: string) {
    setValue("name", value, { shouldDirty: true });
    if (!slugTouched) setValue("slug", slugify(value), { shouldDirty: true });
  }

  const previewPrice = values.basePrice ? Number(values.basePrice) : 0;
  const previewVariant = values.variants[0];

  return (
    <div>
      <SectionHeader title="Add Product" description="Create a new product for your storefront." />

      <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
            </CardHeader>
            <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Product name"
                required
                error={errors.name?.message}
                {...register("name", { required: "Product name is required" })}
                onChange={(e) => handleNameChange(e.target.value)}
              />
              <Input
                label="Slug"
                required
                hint="Used in the storefront URL"
                error={errors.slug?.message}
                {...register("slug", { required: "Slug is required" })}
                onChange={(e) => {
                  setSlugTouched(true);
                  setValue("slug", slugify(e.target.value), { shouldDirty: true });
                }}
              />
              <Select label="Category" {...register("categoryId")}>
                <option value="">No category</option>
                {categoriesQuery.data?.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Select label="Status" {...register("status")}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived (hidden from storefront)</option>
              </Select>
              <div className="sm:col-span-2">
                <Textarea label="Description" rows={4} {...register("description")} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardBody>
              <Input
                label="Base price (৳)"
                type="number"
                min="0.01"
                step="0.01"
                required
                error={errors.basePrice?.message}
                {...register("basePrice", { required: "Base price is required", min: { value: 0.01, message: "Must be greater than 0" } })}
                className="max-w-xs"
              />
              <p className="mt-2 text-xs text-text-secondary">A variant's own price override, if set, takes precedence over this base price.</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Variants</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-1 gap-3 rounded-lg border border-border-default p-3 sm:grid-cols-12 sm:items-end">
                  <div className="sm:col-span-3">
                    <Input label="SKU" required {...register(`variants.${i}.sku`, { required: true })} />
                  </div>
                  <div className="sm:col-span-2">
                    <Input label="Size" {...register(`variants.${i}.size`)} />
                  </div>
                  <div className="sm:col-span-2">
                    <Input label="Color" {...register(`variants.${i}.color`)} />
                  </div>
                  <div className="sm:col-span-2">
                    <Input label="Stock" type="number" required {...register(`variants.${i}.stock`, { required: true })} />
                  </div>
                  <div className="sm:col-span-2">
                    <Input label="Price override" type="number" placeholder="optional" {...register(`variants.${i}.priceOverride`)} />
                  </div>
                  <div className="flex justify-end sm:col-span-1">
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      disabled={fields.length === 1}
                      aria-label="Remove variant row"
                      className="rounded-md p-2 text-text-secondary transition-colors hover:bg-status-danger/10 hover:text-status-danger disabled:opacity-30"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => append({ sku: "", size: "", color: "", stock: "0", priceOverride: "" })}
              >
                <Plus size={14} aria-hidden="true" />
                Add variant row
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
            </CardHeader>
            <CardBody>
              <Input
                label="Low stock threshold"
                type="number"
                min="0"
                hint="Products at or below this stock level are flagged as low stock."
                {...register("lowStockThreshold")}
                className="max-w-xs"
              />
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-20">
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="mb-3 flex aspect-square items-center justify-center rounded-lg bg-surface-sunken text-text-disabled">
                  <ImageOff size={28} aria-hidden="true" />
                </div>
                <div className="truncate text-sm font-semibold text-text-primary">{values.name || "Product name"}</div>
                <div className="mt-1 text-lg font-bold text-text-primary">৳{previewPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                {previewVariant?.size || previewVariant?.color ? (
                  <div className="mt-1 text-xs text-text-secondary">
                    {[previewVariant.size, previewVariant.color].filter(Boolean).join(" · ")}
                  </div>
                ) : null}
                <p className="mt-3 text-xs text-text-secondary">Images can be added after the product is created.</p>
              </CardBody>
            </Card>
          </div>
        </div>
      </form>

      {/* Sticky save bar - `sticky` (not `fixed`) so it naturally respects
          the sidebar's current width, expanded or collapsed, without
          needing to know that width in pixels. */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-border-default bg-surface-card px-4 py-3 shadow-popover sm:-mx-6 lg:-mx-8">
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => (isDirty ? setCancelConfirmOpen(true) : navigate("/products"))}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={createMutation.isPending} onClick={handleSubmit((v) => createMutation.mutate(v))}>
            Create Product
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={cancelConfirmOpen || blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open) {
            setCancelConfirmOpen(false);
            if (blocker.state === "blocked") blocker.reset?.();
          }
        }}
        title="Discard unsaved changes?"
        description="You have unsaved changes to this product. Leaving now will discard them."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          if (blocker.state === "blocked") blocker.proceed?.();
          else navigate("/products");
        }}
      />
    </div>
  );
}

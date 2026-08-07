export interface ThemeSettings {
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorBackground: string;
  fontHeading: string;
  fontBody: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  cornerRadius: number;
}

export interface StorefrontLayout {
  heroHeading: string;
  heroSubheading: string;
  heroImageUrl: string | null;
  showFeaturedProducts: boolean;
}

export interface PublicStore {
  id: string;
  name: string;
  slug: string;
  theme: ThemeSettings;
  layout: StorefrontLayout;
}

export interface ProductVariant {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  stock: number;
  priceOverride: string | null;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  displayOrder: number;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string;
  basePrice: string;
  images: ProductImage[];
  slug: string;
  variants: ProductVariant[];
  category: { id: string; name: string } | null;
}

export type OrderStatus = "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "RETURNED" | "CANCELLED";

export interface OrderItemView {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: string;
  product: { id: string; name: string };
  variant: { id: string; sku: string; attributes: Record<string, string> };
}

export interface OrderView {
  id: string;
  status: OrderStatus;
  total: string;
  deliveryAddress: string;
  customerNote: string | null;
  courierName: string | null;
  courierTrackingId: string | null;
  createdAt: string;
  items: OrderItemView[];
}

export interface AppErrorBody {
  error: { code: string; message: string; details?: unknown };
}

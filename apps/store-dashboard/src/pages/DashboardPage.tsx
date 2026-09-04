import type { ReactNode } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ImageOff, PackagePlus, PackageX, PhoneCall, ShoppingBag, ShoppingCart, Users, Wallet } from "lucide-react";
import { getStoreDashboardSummary } from "../api/dashboard";
import { listProducts } from "../api/products";
import { useAuthStore } from "../stores/auth.store";
import { StatCard } from "../components/ui/StatCard";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { SalesTrendChart } from "../components/SalesTrendChart";
import { RiskBadge } from "../components/RiskBadge";
import type { BadgeTone } from "../components/ui/Badge";
import type { OrderStatus, Product, StoreDetail } from "../lib/api-types";

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
};

const ORDER_STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  PENDING: "caution",
  CONFIRMED: "info",
  PROCESSING: "info",
  SHIPPED: "info",
  DELIVERED: "success",
  RETURNED: "danger",
  CANCELLED: "neutral",
};

function formatMoney(value: string): string {
  const n = Number(value);
  return `৳${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25, delay, ease: "easeOut" as const },
  };
}

export default function DashboardPage() {
  const store = useOutletContext<StoreDetail>();
  const storeId = useAuthStore((s) => s.user?.storeId);

  const summaryQuery = useQuery({
    queryKey: ["store-dashboard", storeId],
    queryFn: () => getStoreDashboardSummary(storeId as string),
    enabled: Boolean(storeId),
  });

  const productsQuery = useQuery({
    queryKey: ["products", storeId],
    queryFn: () => listProducts(storeId as string),
    enabled: Boolean(storeId),
  });

  const summary = summaryQuery.data;
  const products = productsQuery.data?.products ?? [];
  const recentProducts = [...products].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5);
  const lowStockProducts = products
    .filter((p) => p.variants.some((v) => v.isActive && v.stock > 0 && v.stock <= p.lowStockThreshold))
    .slice(0, 5);

  return (
    <div>
      <motion.div {...fadeUp(0)} className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Welcome back{store?.name ? `, ${store.name}` : ""} 👋
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">Here's what's happening with your store today.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <QuickAction to="/products/new" icon={<PackagePlus size={15} aria-hidden="true" />} label="Add Product" />
          <QuickAction to="/orders" icon={<ShoppingCart size={15} aria-hidden="true" />} label="View Orders" />
          <QuickAction to="/customers" icon={<Users size={15} aria-hidden="true" />} label="Customers" />
        </div>
      </motion.div>

      {summaryQuery.isError && (
        <p role="alert" className="mb-4 text-sm text-status-danger">
          Could not load dashboard data. Retry shortly.
        </p>
      )}

      <motion.div {...fadeUp(0.05)} className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Orders Today"
          value={summary?.ordersToday ?? 0}
          icon={<ShoppingBag size={16} aria-hidden="true" />}
          tone="primary"
          loading={summaryQuery.isLoading}
        />
        <StatCard
          label="Revenue This Month"
          value={formatMoney(summary?.revenueThisMonth ?? "0")}
          icon={<Wallet size={16} aria-hidden="true" />}
          tone="success"
          loading={summaryQuery.isLoading}
        />
        <StatCard
          label="Pending COD Confirmations"
          value={summary?.pendingCodConfirmations ?? 0}
          icon={<PhoneCall size={16} aria-hidden="true" />}
          tone="caution"
          loading={summaryQuery.isLoading}
        />
        <StatCard
          label="Low Stock Products"
          value={summary?.lowStockProductCount ?? 0}
          icon={<PackageX size={16} aria-hidden="true" />}
          tone="danger"
          loading={summaryQuery.isLoading}
        />
      </motion.div>

      <motion.div {...fadeUp(0.1)} className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales Overview — Last 14 Days</CardTitle>
          </CardHeader>
          <CardBody>
            {summaryQuery.isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <SalesTrendChart data={summary?.salesTrend ?? []} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardBody>
            {summaryQuery.isLoading && <Skeleton className="h-40 w-full" />}
            {summary?.recentOrders.length === 0 && (
              <p className="text-sm text-text-secondary">No activity yet.</p>
            )}
            <ol className="space-y-4">
              {summary?.recentOrders.slice(0, 6).map((order) => (
                <li key={order.id} className="relative pl-5">
                  <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                  <span className="absolute bottom-0 left-[3px] top-4 w-px bg-border-default last:hidden" aria-hidden="true" />
                  <p className="text-sm text-text-primary">
                    New order from <span className="font-medium">{order.customer.name}</span>
                  </p>
                  <p className="text-xs text-text-secondary">
                    {formatMoney(order.total)} · {relativeTime(order.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </motion.div>

      <motion.div {...fadeUp(0.15)} className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <Link to="/orders" className="text-xs font-medium text-primary hover:underline">
              View all →
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {summaryQuery.isLoading && (
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            )}
            {summary?.recentOrders.length === 0 && (
              <EmptyState icon={<ShoppingCart size={20} aria-hidden="true" />} title="No orders yet" description="Orders placed on your storefront will show up here." />
            )}
            <ul className="divide-y divide-border-default">
              {summary?.recentOrders.map((order) => (
                <li key={order.id} className="px-5 py-3">
                  <Link to={`/orders/${order.id}`} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-text-primary">{order.customer.name}</span>
                        <RiskBadge level={order.customer.riskLevel} />
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <Badge tone={ORDER_STATUS_TONE[order.status as OrderStatus]} size="sm">
                          {ORDER_STATUS_LABEL[order.status] ?? order.status}
                        </Badge>
                        <span className="text-xs text-text-secondary">{formatMoney(order.total)}</span>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-text-secondary">{relativeTime(order.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Products</CardTitle>
            <Link to="/products" className="text-xs font-medium text-primary hover:underline">
              View all →
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {productsQuery.isLoading && (
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            )}
            {recentProducts.length === 0 && !productsQuery.isLoading && (
              <EmptyState icon={<PackagePlus size={20} aria-hidden="true" />} title="No products yet" description="Add your first product to see it here." />
            )}
            <ul className="divide-y divide-border-default">
              {recentProducts.map((product) => (
                <ProductRow key={product.id} product={product} />
              ))}
            </ul>
          </CardBody>
        </Card>
      </motion.div>

      <motion.div {...fadeUp(0.2)}>
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Products</CardTitle>
            <Link to="/products" className="text-xs font-medium text-primary hover:underline">
              Manage inventory →
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {lowStockProducts.length === 0 && !productsQuery.isLoading && (
              <EmptyState
                icon={<PackageX size={20} aria-hidden="true" />}
                title="Nothing running low"
                description="Every active product is above its low-stock threshold."
              />
            )}
            <ul className="divide-y divide-border-default">
              {lowStockProducts.map((product) => {
                const stock = product.variants.filter((v) => v.isActive).reduce((s, v) => s + v.stock, 0);
                return (
                  <li key={product.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <Link to={`/products/${product.id}/edit`} className="min-w-0 text-sm font-medium text-text-primary hover:text-primary">
                      {product.name}
                    </Link>
                    <Badge tone="danger" size="sm">
                      {stock} left
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
}

function QuickAction({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-surface-card px-3.5 py-2 text-sm font-medium text-text-primary shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      {icon}
      {label}
    </Link>
  );
}

function ProductRow({ product }: { product: Product }) {
  const imageUrl = product.images[0]?.url;
  return (
    <li className="px-5 py-3">
      <Link to={`/products/${product.id}/edit`} className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-sunken">
          {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : <ImageOff size={14} className="text-text-disabled" aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-text-primary">{product.name}</div>
          <div className="text-xs text-text-secondary">৳{Number(product.basePrice).toLocaleString()}</div>
        </div>
      </Link>
    </li>
  );
}

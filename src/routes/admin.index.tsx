import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  DollarSign,
  PackageSearch,
  ShoppingBag,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { fetchAdminDashboard, AdminApiError } from "@/api/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { displayPrice } from "@/lib/utils";
import { ORDER_STATUS_VARIANT } from "@/lib/orderStatus";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard - Admin - Burney Boyz" }] }),
  component: AdminDashboardPage,
});

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold md:text-3xl">{value}</p>
    </div>
  );
}

function AdminDashboardPage() {
  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({ queryKey: ["admin", "dashboard"], queryFn: fetchAdminDashboard });

  if (isLoading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="mt-6 h-72 w-full rounded-2xl" />
      </section>
    );
  }

  if (isError) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Alert variant="destructive" className="max-w-xl">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Couldn't load the dashboard</AlertTitle>
          <AlertDescription className="mt-1 flex flex-col items-start gap-3">
            <span>{error instanceof AdminApiError ? error.message : "Something went wrong."}</span>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </section>
    );
  }

  if (!stats) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue" value={displayPrice(stats.revenue)} icon={DollarSign} />
        <StatCard label="Orders" value={String(stats.ordersCount)} icon={ShoppingBag} />
        <StatCard label="Products" value={String(stats.productsCount)} icon={PackageSearch} />
        <StatCard label="Customers" value={String(stats.customersCount)} icon={Users} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="rounded-2xl border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent Orders</h2>
            <Link to="/admin/orders" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="divide-y">
              {stats.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    to="/admin/orders/$id"
                    params={{ id: order.id }}
                    className="flex items-center justify-between gap-3 py-3 text-sm hover:text-primary"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{order.orderNumber}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {order.customerName || order.customerEmail}
                      </p>
                    </div>
                    <Badge
                      variant={ORDER_STATUS_VARIANT[order.status]}
                      className="flex-none capitalize"
                    >
                      {order.status}
                    </Badge>
                    <span className="flex-none font-semibold">{displayPrice(order.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top Products */}
        <div className="rounded-2xl border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-bold">Top Products</h2>
          </div>
          {stats.topProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No sales yet - top products will show up here once orders come in.
            </p>
          ) : (
            <ul className="divide-y">
              {stats.topProducts.map((product) => (
                <li key={product.productId} className="flex items-center gap-3 py-3 text-sm">
                  <div className="h-10 w-10 flex-none overflow-hidden rounded-lg bg-muted">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.quantitySold} sold</p>
                  </div>
                  <span className="flex-none font-semibold">{displayPrice(product.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Featured Products */}
        <div className="rounded-2xl border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-bold">Featured Products</h2>
          </div>
          {stats.featuredProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No products are featured yet. Mark products as featured from{" "}
              <Link to="/admin/products" className="text-primary hover:underline">
                Products
              </Link>
              .
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.featuredProducts.map((product) => (
                <li key={product.id} className="text-center">
                  <div className="aspect-square overflow-hidden rounded-xl bg-muted">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs font-medium">{product.name}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Charts placeholder */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 p-6 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary-soft">
            <BarChart3 className="h-7 w-7 text-primary" />
          </div>
          <p className="mt-3 font-semibold">Charts coming soon</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Revenue and order trend charts will appear here in a future update.
          </p>
        </div>
      </div>
    </section>
  );
}

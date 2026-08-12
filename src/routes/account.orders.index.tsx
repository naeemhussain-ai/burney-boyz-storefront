import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight, PackageSearch } from "lucide-react";
import { listMyOrders, AuthApiError } from "@/api/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { displayPrice } from "@/lib/utils";
import { ORDER_STATUS_VARIANT } from "@/lib/orderStatus";

export const Route = createFileRoute("/account/orders/")({
  head: () => ({ meta: [{ title: "Orders - My Account - Burney Boyz" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const {
    data: orders,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["account", "orders"],
    queryFn: listMyOrders,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Couldn't load your orders</AlertTitle>
        <AlertDescription className="mt-1 flex flex-col items-start gap-3">
          <span>{error instanceof AuthApiError ? error.message : "Something went wrong."}</span>
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => refetch()}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-16 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-muted">
          <PackageSearch className="h-9 w-9 text-muted-foreground/50" />
        </div>
        <div>
          <p className="font-semibold">No orders yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Orders placed with this email address will show up here.
          </p>
        </div>
        <Button asChild className="rounded-full">
          <Link to="/shop">Browse Shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Link
          key={order.id}
          to="/account/orders/$id"
          params={{ id: order.id }}
          className="flex items-center gap-4 rounded-2xl border bg-card p-5 transition hover:border-primary/40 hover:shadow-soft"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{order.orderNumber}</p>
              <Badge variant={ORDER_STATUS_VARIANT[order.status]} className="capitalize">
                {order.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(order.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              · {order.items.length} item{order.items.length === 1 ? "" : "s"}
            </p>
          </div>
          <p className="flex-none font-bold">{displayPrice(order.total)}</p>
          <ChevronRight className="h-4 w-4 flex-none text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}

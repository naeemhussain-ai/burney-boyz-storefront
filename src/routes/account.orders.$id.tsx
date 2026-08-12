import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, MapPin, PackageCheck, Truck } from "lucide-react";
import { getMyOrder, AuthApiError } from "@/api/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { displayPrice } from "@/lib/utils";
import { ORDER_STATUS_VARIANT } from "@/lib/orderStatus";

export const Route = createFileRoute("/account/orders/$id")({
  head: () => ({ meta: [{ title: "Order Detail - My Account - Burney Boyz" }] }),
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { id } = Route.useParams();

  const {
    data: order,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["account", "orders", id],
    queryFn: () => getMyOrder(id),
  });

  return (
    <div>
      <Link
        to="/account/orders"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Orders
      </Link>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Couldn't load this order</AlertTitle>
          <AlertDescription className="mt-1 flex flex-col items-start gap-3">
            <span>{error instanceof AuthApiError ? error.message : "Something went wrong."}</span>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : order ? (
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <p className="text-lg font-bold">{order.orderNumber}</p>
              <p className="text-sm text-muted-foreground">
                Placed{" "}
                {new Date(order.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <Badge variant={ORDER_STATUS_VARIANT[order.status]} className="capitalize">
              {order.status}
            </Badge>
          </div>

          <div className="mt-4 divide-y">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3 text-sm">
                <div className="h-14 w-14 flex-none overflow-hidden rounded-lg bg-muted">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name}</p>
                  {item.variantLabel && (
                    <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {displayPrice(item.unitPrice)} each
                  </p>
                </div>
                <p className="text-muted-foreground">× {item.quantity}</p>
                <p className="w-20 flex-none text-right font-semibold">
                  {displayPrice(item.lineTotal)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{displayPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping ({order.shippingMethodLabel})</span>
              <span>{displayPrice(order.shippingCost)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-bold">
              <span>Total</span>
              <span>{displayPrice(order.total)}</span>
            </div>
          </div>

          {order.cjOrderId && (
            <div className="mt-4 rounded-2xl bg-muted/40 p-5 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <Truck className="h-4 w-4 text-primary" /> Shipping Status
              </p>
              <p className="mt-1 text-muted-foreground">
                {order.cjOrderStatus || "Preparing your order"}
              </p>
              {order.cjTrackingNumber && (
                <p className="mt-2">
                  <span className="text-muted-foreground">Tracking number: </span>
                  <span className="font-medium">{order.cjTrackingNumber}</span>
                  {order.cjShippingCarrier && (
                    <span className="text-muted-foreground"> via {order.cjShippingCarrier}</span>
                  )}
                </p>
              )}
            </div>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-muted/40 p-5 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <PackageCheck className="h-4 w-4 text-primary" /> Shipping Address
              </p>
              <p className="mt-1 text-muted-foreground">
                {order.shippingFullName}
                <br />
                {order.shippingAddressLine1}
                {order.shippingAddressLine2 ? `, ${order.shippingAddressLine2}` : ""}
                <br />
                {order.shippingCity}, {order.shippingState} {order.shippingPostalCode}
                <br />
                {order.shippingCountry}
              </p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-5 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <MapPin className="h-4 w-4 text-primary" /> Billing Address
              </p>
              <p className="mt-1 text-muted-foreground">
                {order.billingFullName}
                <br />
                {order.billingAddressLine1}
                {order.billingAddressLine2 ? `, ${order.billingAddressLine2}` : ""}
                <br />
                {order.billingCity}, {order.billingState} {order.billingPostalCode}
                <br />
                {order.billingCountry}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

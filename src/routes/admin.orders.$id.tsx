import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  MapPin,
  PackageCheck,
  RefreshCw,
  Send,
  Truck,
} from "lucide-react";
import {
  fetchAdminOrder,
  updateAdminOrderStatus,
  syncAdminOrderTracking,
  sendAdminOrderToCj,
  AdminApiError,
} from "@/api/admin";
import type { OrderStatus } from "@/api/order";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { displayPrice } from "@/lib/utils";
import { ORDER_STATUS_VARIANT, ORDER_STATUSES } from "@/lib/orderStatus";

export const Route = createFileRoute("/admin/orders/$id")({
  head: () => ({ meta: [{ title: "Order Detail - Admin - Burney Boyz" }] }),
  component: AdminOrderDetailPage,
});

function AdminOrderDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);

  const {
    data: order,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin", "orders", id],
    queryFn: () => fetchAdminOrder(id),
  });

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => updateAdminOrderStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(["admin", "orders", id], updated);
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      toast.success(`Order marked as ${updated.status}`);
      setPendingStatus(null);
    },
    onError: (err) => {
      toast.error(err instanceof AdminApiError ? err.message : "Couldn't update the order status.");
      setPendingStatus(null);
    },
  });

  const trackingMutation = useMutation({
    mutationFn: () => syncAdminOrderTracking(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(["admin", "orders", id], updated);
      toast.success("CJ tracking refreshed");
    },
    onError: (err) => {
      toast.error(err instanceof AdminApiError ? err.message : "Couldn't refresh CJ tracking.");
    },
  });

  // Sprint 10 / Step 24 - CJ Order Flow. Manual push only - the backend
  // rejects this for a still-'pending' (unpaid) order, so it can never
  // auto-send. See cjOrder.service.js#createCjOrderForOrder.
  const sendToCjMutation = useMutation({
    mutationFn: () => sendAdminOrderToCj(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(["admin", "orders", id], updated);
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      toast.success(`Sent to CJ - CJ order ${updated.cjOrderId}`);
    },
    onError: (err) => {
      toast.error(err instanceof AdminApiError ? err.message : "Couldn't send this order to CJ.");
    },
  });

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        to="/admin/orders"
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
            <span>{error instanceof AdminApiError ? error.message : "Something went wrong."}</span>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : order ? (
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
            <div>
              <p className="text-lg font-bold">{order.orderNumber}</p>
              <p className="text-sm text-muted-foreground">
                Placed{" "}
                {new Date(order.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}{" "}
                by {order.customerName || order.customerEmail}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={ORDER_STATUS_VARIANT[order.status]} className="capitalize">
                {order.status}
              </Badge>
              <Select
                value={pendingStatus ?? order.status}
                onValueChange={(v) => {
                  const next = v as OrderStatus;
                  setPendingStatus(next);
                  statusMutation.mutate(next);
                }}
                disabled={statusMutation.isPending}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {statusMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="mt-4 space-y-1 text-sm text-muted-foreground">
            <p>
              Contact: {order.customerEmail}
              {order.customerPhone ? ` · ${order.customerPhone}` : ""}
            </p>
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
                  {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
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

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          <div className="mt-4 rounded-2xl bg-muted/40 p-5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-semibold">
                <Truck className="h-4 w-4 text-primary" /> CJ Fulfillment
              </p>
              {order.cjOrderId && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={trackingMutation.isPending}
                  onClick={() => trackingMutation.mutate()}
                >
                  {trackingMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Refresh tracking
                </Button>
              )}
            </div>

            {!order.cjOrderId ? (
              <div className="mt-2 space-y-3">
                <p className="text-muted-foreground">
                  {order.cjSyncError
                    ? `Not yet pushed to CJ - ${order.cjSyncError}`
                    : "Not yet pushed to CJ."}
                </p>
                {order.status === "pending" ? (
                  <p className="text-xs text-amber-700">
                    This order is still pending (unpaid) - mark it as paid above before sending it
                    to CJ.
                  </p>
                ) : (
                  <Button
                    size="sm"
                    disabled={sendToCjMutation.isPending}
                    onClick={() => sendToCjMutation.mutate()}
                  >
                    {sendToCjMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Send to CJ
                  </Button>
                )}
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">CJ Order ID</p>
                  <p className="font-medium">{order.cjOrderId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CJ Status</p>
                  <p className="font-medium">{order.cjOrderStatus ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tracking Number</p>
                  <p className="font-medium">{order.cjTrackingNumber ?? "Not shipped yet"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Shipping Carrier</p>
                  <p className="font-medium">{order.cjShippingCarrier ?? "-"}</p>
                </div>
                {order.cjLastSyncedAt && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">
                      Last synced {new Date(order.cjLastSyncedAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {order.cjSyncError && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-destructive">{order.cjSyncError}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

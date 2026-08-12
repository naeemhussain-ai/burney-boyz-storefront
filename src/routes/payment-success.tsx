import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { AlertTriangle, CheckCircle2, Loader2, PackageCheck } from "lucide-react";
import { confirmStripeOrder, fetchOrder, OrderApiError, type Order } from "@/api/order";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { displayPrice } from "@/lib/utils";

const searchSchema = z.object({
  session_id: z.string().optional(),
  // Sprint 10 / Step 24 - Order Flow (Stripe temporarily off). Set instead
  // of session_id when checkout.tsx placed a direct/pending order (no
  // Stripe involved) - see the branch below.
  order_id: z.string().optional(),
});

export const Route = createFileRoute("/payment-success")({
  head: () => ({
    meta: [
      { title: "Payment Successful - Burney Boyz" },
      { name: "description", content: "Your payment was successful. View your order details." },
    ],
    links: [{ rel: "canonical", href: "/payment-success" }],
  }),
  validateSearch: zodValidator(searchSchema),
  component: PaymentSuccessPage,
});

function PaymentSuccessPage() {
  const { session_id: sessionId, order_id: orderId } = Route.useSearch();
  const queryClient = useQueryClient();
  // Stripe redirects here once, but React (StrictMode, fast refresh) can
  // re-run effects - guard so we only ever fire the confirm call once per
  // page load. The backend call itself is also idempotent as a second layer.
  const attempted = useRef(false);

  const stripeMutation = useMutation<Order, OrderApiError, string>({
    mutationFn: confirmStripeOrder,
    onSuccess: () => {
      // The order is created server-side by clearing the cart it came
      // from - refresh the cached cart so the header/drawer update too.
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  useEffect(() => {
    if (sessionId && !attempted.current) {
      attempted.current = true;
      stripeMutation.mutate(sessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Sprint 10 / Step 24 - Order Flow (Stripe temporarily off). checkout.tsx
  // sends order_id instead of session_id when it placed a direct/pending
  // order - the cart was already cleared and invalidated there, so this is
  // a plain read, not a mutation.
  const directOrderQuery = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrder(orderId as string),
    enabled: Boolean(orderId) && !sessionId,
  });

  if (!sessionId && !orderId) {
    return (
      <section className="mx-auto max-w-xl px-4 py-24 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">No order found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is only reachable right after completing checkout.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/shop">Back to Shop</Link>
        </Button>
      </section>
    );
  }

  const isPending = sessionId
    ? stripeMutation.isPending || stripeMutation.isIdle
    : directOrderQuery.isPending;
  const isError = sessionId ? stripeMutation.isError : directOrderQuery.isError;
  const error = sessionId ? stripeMutation.error : directOrderQuery.error;
  const order = sessionId ? stripeMutation.data : directOrderQuery.data;

  if (isPending) {
    return (
      <section className="mx-auto max-w-xl px-4 py-24 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <h1 className="mt-4 text-2xl font-bold">
          {sessionId ? "Confirming your payment…" : "Loading your order…"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">This will only take a moment.</p>
      </section>
    );
  }

  if (isError || !order) {
    return (
      <section className="mx-auto max-w-xl px-4 py-24 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">
          {sessionId ? "We couldn't confirm your payment" : "We couldn't load your order"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof OrderApiError
            ? error.message
            : sessionId
              ? "Something went wrong. If you were charged, please contact support with your payment reference."
              : "Something went wrong loading your order details."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => (sessionId ? stripeMutation.mutate(sessionId) : directOrderQuery.refetch())}
          >
            Try again
          </Button>
          <Button asChild className="rounded-full">
            <Link to="/checkout">Back to Checkout</Link>
          </Button>
        </div>
      </section>
    );
  }

  const isUnpaid = order.status === "pending";

  return (
    <>
      <PageHero
        eyebrow="Thank you"
        title={isUnpaid ? "Your order has been placed!" : "Your order is confirmed!"}
        description={`Order ${order.orderNumber} - a confirmation has been sent to ${order.customerEmail}.`}
      />

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border bg-card p-8 shadow-card">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="h-7 w-7" />
          </div>

          <div className="mt-6 divide-y">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3 text-sm">
                <div className="h-12 w-12 flex-none overflow-hidden rounded-lg bg-muted">
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
                </div>
                <p className="text-muted-foreground">× {item.quantity}</p>
                <p className="w-16 text-right font-semibold">{displayPrice(item.lineTotal)}</p>
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
              <span>{isUnpaid ? "Order total" : "Total paid"}</span>
              <span>{displayPrice(order.total)}</span>
            </div>
          </div>

          {isUnpaid ? (
            <div className="mt-6 rounded-2xl bg-amber-500/10 p-5 text-sm text-amber-800">
              Payment hasn't been collected yet - we'll follow up separately to arrange it. Your
              order is saved and our team can already see it.
            </div>
          ) : null}

          <div className="mt-6 rounded-2xl bg-muted/40 p-5 text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <PackageCheck className="h-4 w-4 text-primary" /> Shipping to
            </p>
            <p className="mt-1 text-muted-foreground">
              {order.shippingFullName}, {order.shippingAddressLine1}
              {order.shippingAddressLine2 ? `, ${order.shippingAddressLine2}` : ""},{" "}
              {order.shippingCity}, {order.shippingState} {order.shippingPostalCode},{" "}
              {order.shippingCountry}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild className="rounded-full">
              <Link to="/shop">Continue shopping</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

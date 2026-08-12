import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/payment-cancel")({
  head: () => ({
    meta: [
      { title: "Payment Cancelled - Burney Boyz" },
      { name: "description", content: "Your payment was cancelled. Your cart is still saved." },
    ],
    links: [{ rel: "canonical", href: "/payment-cancel" }],
  }),
  component: PaymentCancelPage,
});

function PaymentCancelPage() {
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-muted">
        <XCircle className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="mt-6 text-2xl font-bold">Payment cancelled</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        No charge was made. Your cart is still saved - you can pick up right where you left off.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/shop">Back to Shop</Link>
        </Button>
        <Button asChild className="rounded-full">
          <Link to="/checkout">Try Checkout Again</Link>
        </Button>
      </div>
    </section>
  );
}

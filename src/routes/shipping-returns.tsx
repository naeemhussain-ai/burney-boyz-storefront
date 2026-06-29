import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/layout/PageHero";
import { Truck, Package, Globe2, MapPin, RotateCcw, FileText } from "lucide-react";

export const Route = createFileRoute("/shipping-returns")({
  head: () => ({
    meta: [
      { title: "Shipping & Returns — Burney Boyz" },
      { name: "description", content: "Shipping options, delivery times, and our 30-day return policy at Burney Boyz." },
      { property: "og:title", content: "Shipping & Returns — Burney Boyz" },
      { property: "og:url", content: "/shipping-returns" },
    ],
    links: [{ rel: "canonical", href: "/shipping-returns" }],
  }),
  component: ShippingReturns,
});

const sections = [
  {
    icon: Truck,
    title: "Shipping options & delivery times",
    body: "Standard shipping is free on orders over $50 and arrives in 5–10 business days. Express shipping (2–4 days) is available at checkout for an additional fee.",
  },
  {
    icon: Package,
    title: "Order processing",
    body: "Orders are processed within 1–2 business days. You'll receive a confirmation email when your order is on its way.",
  },
  {
    icon: Globe2,
    title: "International shipping",
    body: "We ship to 60+ countries. Import duties or taxes may apply and are the buyer's responsibility.",
  },
  {
    icon: MapPin,
    title: "Tracking your order",
    body: "Once shipped, you'll receive a tracking link by email. You can also reach our support team for status updates anytime.",
  },
  {
    icon: RotateCcw,
    title: "Returns & refunds",
    body: "We offer 30-day returns on unused items in original packaging. Refunds are issued to your original payment method within 5–7 business days of receiving the return.",
  },
  {
    icon: FileText,
    title: "How to start a return",
    body: "Email support@burneyboyz.com with your order number and we'll send you a prepaid return label and instructions.",
  },
];

function ShippingReturns() {
  return (
    <>
      <PageHero
        eyebrow="Policies"
        title="Shipping & Returns"
        description="Everything you need to know about getting your order — and sending it back if needed."
      />
      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="space-y-5">
          {sections.map((s) => (
            <div key={s.title} className="flex gap-4 rounded-2xl border bg-card p-6 shadow-card">
              <div className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-primary-soft text-primary">
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{s.title}</h2>
                <p className="mt-2 text-muted-foreground">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-xs text-muted-foreground">
          Last updated: June 29, 2026
        </p>
      </section>
    </>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/layout/PageHero";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Frequently Asked Questions — Burney Boyz" },
      { name: "description", content: "Answers to common questions about shipping, returns, payments, and tracking your Burney Boyz order." },
      { property: "og:title", content: "FAQ — Burney Boyz" },
      { property: "og:url", content: "/faq" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
  }),
  component: FAQ,
});

const faqs = [
  { q: "How long does shipping take?", a: "Most orders arrive in 5–10 business days. Express options are available at checkout." },
  { q: "Do you ship internationally?", a: "Yes — we ship to 60+ countries. Delivery times and rates vary by destination." },
  { q: "How can I track my order?", a: "Once your order ships, you'll get a tracking link by email. You can also reach out to support anytime." },
  { q: "What's your return policy?", a: "We offer 30-day no-fuss returns on most items. See our Shipping & Returns page for details." },
  { q: "What payment methods do you accept?", a: "All major credit/debit cards, Apple Pay, Google Pay, and PayPal." },
  { q: "Is my payment information secure?", a: "Absolutely. We use 256-bit SSL encryption and never store your full card details." },
  { q: "Can I change or cancel my order?", a: "Reach out within 12 hours of ordering and we'll do our best to update or cancel it." },
  { q: "What if my product arrives damaged?", a: "Contact us within 7 days with photos and we'll send a free replacement or issue a refund." },
  { q: "Do you offer bulk or wholesale pricing?", a: "Yes — email wholesale@burneyboyz.com for custom pricing on orders of 25+ units." },
  { q: "How do I contact customer support?", a: "Use the Contact page, email support@burneyboyz.com, or DM us on Instagram — we reply within 24 hours." },
];

function FAQ() {
  return (
    <>
      <PageHero
        eyebrow="Support"
        title="Frequently asked questions"
        description="Quick answers to the things customers ask us most."
      />
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="rounded-xl border bg-card px-5 shadow-card"
            >
              <AccordionTrigger className="py-4 text-left text-base font-medium hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-12 rounded-2xl bg-primary-soft p-8 text-center">
          <h2 className="text-xl font-semibold">Still have questions?</h2>
          <p className="mt-2 text-muted-foreground">Our support team is happy to help.</p>
          <Button asChild className="mt-5"><Link to="/contact">Contact us</Link></Button>
        </div>
      </section>
    </>
  );
}

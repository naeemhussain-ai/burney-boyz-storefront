import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/layout/PageHero";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Truck, CreditCard, RefreshCw, Package, Shield, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Frequently Asked Questions - Burney Boyz" },
      {
        name: "description",
        content:
          "Answers to common questions about shipping, returns, payments, and tracking your Burney Boyz order.",
      },
      { property: "og:title", content: "FAQ - Burney Boyz" },
      { property: "og:url", content: "/faq" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
  }),
  component: FAQ,
});

const faqCategories = [
  {
    icon: Truck,
    label: "Shipping",
    color: "bg-blue-50 text-blue-600",
    faqs: [
      {
        q: "How long does shipping take?",
        a: "Most orders arrive in 5–10 business days internationally. Express options (3–5 days) are available at checkout. Processing typically takes 1–2 business days.",
      },
      {
        q: "Do you ship internationally?",
        a: "Yes - we ship to 60+ countries worldwide. Delivery times and shipping rates vary by destination and will be calculated at checkout.",
      },
      {
        q: "How can I track my order?",
        a: "Once your order ships, you'll receive a tracking link by email. You can also contact our support team anytime and we'll check on your order for you.",
      },
    ],
  },
  {
    icon: RefreshCw,
    label: "Returns",
    color: "bg-green-50 text-green-600",
    faqs: [
      {
        q: "What's your return policy?",
        a: "We offer hassle-free 30-day returns on most items. Products must be unused and in original packaging. See our full Shipping & Returns page for details.",
      },
      {
        q: "Can I change or cancel my order?",
        a: "Contact us within 12 hours of placing your order and we'll do our best to update or cancel it before it ships.",
      },
      {
        q: "What if my product arrives damaged?",
        a: "We're so sorry if that happens! Contact us within 7 days with photos of the damage and we'll immediately send a free replacement or issue a full refund.",
      },
    ],
  },
  {
    icon: CreditCard,
    label: "Payments",
    color: "bg-purple-50 text-purple-600",
    faqs: [
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit and debit cards (Visa, Mastercard, Amex), Apple Pay, Google Pay, and PayPal. More options coming soon.",
      },
      {
        q: "Is my payment information secure?",
        a: "Absolutely. We use industry-standard 256-bit SSL encryption and never store your full card details on our servers. Your security is our top priority.",
      },
    ],
  },
  {
    icon: Package,
    label: "Orders & Products",
    color: "bg-orange-50 text-orange-600",
    faqs: [
      {
        q: "Do you offer bulk or wholesale pricing?",
        a: "Yes - email wholesale@burneyboyz.com for custom pricing on orders of 25+ units. We work with businesses, gift buyers, and resellers.",
      },
      {
        q: "How do I contact customer support?",
        a: "Use our Contact page, email support@burneyboyz.com, or DM us on Instagram. We reply within 24 hours, usually much faster.",
      },
    ],
  },
];

function FAQ() {
  return (
    <>
      <PageHero
        eyebrow="Help center"
        title="Frequently asked questions"
        description="Quick answers to the things our customers ask us most. Can't find what you need? We're here to help."
      />

      {/* Category icons */}
      <section className="border-b bg-card">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {faqCategories.map((cat) => (
              <div key={cat.label} className="flex items-center gap-3 rounded-xl p-3">
                <div className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl ${cat.color}`}>
                  <cat.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold">{cat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ by category */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="space-y-10">
          {faqCategories.map((cat) => (
            <div key={cat.label}>
              <div className="mb-5 flex items-center gap-3">
                <div className={`grid h-9 w-9 place-items-center rounded-xl ${cat.color}`}>
                  <cat.icon className="h-4.5 w-4.5" />
                </div>
                <h2 className="text-lg font-bold">{cat.label}</h2>
              </div>
              <Accordion type="single" collapsible className="space-y-2.5">
                {cat.faqs.map((f, i) => (
                  <AccordionItem
                    key={i}
                    value={`${cat.label}-${i}`}
                    className="rounded-2xl border bg-card px-5 shadow-card"
                  >
                    <AccordionTrigger className="py-4 text-left text-sm font-semibold hover:no-underline hover:text-primary">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        {/* Still need help */}
        <div className="mt-14 overflow-hidden rounded-3xl bg-secondary p-8 text-secondary-foreground">
          <div className="flex flex-col items-center gap-5 text-center md:flex-row md:text-left">
            <div className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-full bg-white/10">
              <MessageSquare className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">Still have questions?</h2>
              <p className="mt-1 text-secondary-foreground/75">
                Our friendly support team is available 24/7 and typically replies within an hour.
              </p>
            </div>
            <Button asChild className="flex-shrink-0 rounded-full">
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>

        {/* Trust icons */}
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { icon: Shield, text: "Secure & encrypted" },
            { icon: Truck, text: "Free shipping $50+" },
            { icon: RefreshCw, text: "30-day returns" },
            { icon: Package, text: "Tracked delivery" },
          ].map((item) => (
            <div key={item.text} className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center shadow-card">
              <item.icon className="h-5 w-5 text-primary" />
              <p className="text-xs font-medium">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

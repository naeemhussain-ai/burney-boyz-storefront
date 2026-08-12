import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/layout/PageHero";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions - Burney Boyz" },
      { name: "description", content: "Terms governing your use of the Burney Boyz website and purchases." },
      { property: "og:title", content: "Terms & Conditions - Burney Boyz" },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: Terms,
});

const sections = [
  { title: "1. Acceptance of terms", body: "By accessing or using burneyboyz.com you agree to these Terms & Conditions. If you do not agree, please do not use the site." },
  { title: "2. Use of the site", body: "You agree to use the site only for lawful purposes and in a way that does not infringe the rights of others or restrict their use of the site." },
  { title: "3. Orders & pricing", body: "All orders are subject to availability and confirmation. Prices are shown in USD and may change at any time without notice. We reserve the right to refuse or cancel orders at our discretion." },
  { title: "4. Shipping & returns", body: "Shipping, delivery, and returns are governed by our Shipping & Returns policy, which is incorporated into these terms by reference." },
  { title: "5. Intellectual property", body: "All site content - including logos, text, images, and code - is the property of Burney Boyz or its licensors and protected by intellectual property laws." },
  { title: "6. Limitation of liability", body: "To the maximum extent permitted by law, Burney Boyz is not liable for any indirect, incidental, or consequential damages arising from your use of the site or products purchased." },
  { title: "7. Governing law", body: "These terms are governed by the laws of the jurisdiction in which Burney Boyz is incorporated, without regard to conflict-of-law principles." },
  { title: "8. Contact", body: "Questions about these terms? Email legal@burneyboyz.com." },
];

function Terms() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Terms & Conditions" description="Last updated: June 29, 2026" />
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="mb-8 text-muted-foreground">
          Placeholder legal copy - please review with legal counsel before publishing.
        </p>
        <div className="space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-xl font-semibold">{s.title}</h2>
              <p className="mt-2 text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>
      </article>
    </>
  );
}

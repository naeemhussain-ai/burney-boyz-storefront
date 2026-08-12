import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/layout/PageHero";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy - Burney Boyz" },
      { name: "description", content: "How Burney Boyz collects, uses, and protects your personal information." },
      { property: "og:title", content: "Privacy Policy - Burney Boyz" },
      { property: "og:url", content: "/privacy-policy" },
    ],
    links: [{ rel: "canonical", href: "/privacy-policy" }],
  }),
  component: Privacy,
});

const sections = [
  { title: "1. Information we collect", body: "We collect information you provide directly (name, email, shipping address, payment details) and information collected automatically (device, browser, usage data) when you interact with our site." },
  { title: "2. How we use your information", body: "We use your information to process orders, communicate with you about your purchase, improve our services, prevent fraud, and (with your consent) send marketing emails you can unsubscribe from at any time." },
  { title: "3. Cookies and tracking", body: "We use cookies and similar technologies to keep you signed in, remember your preferences, analyze site performance, and deliver relevant marketing. You can control cookies through your browser settings." },
  { title: "4. Third parties", body: "We share information with trusted service providers (payment processors, shipping carriers, email platforms, analytics) only as needed to operate our business. We never sell your personal data." },
  { title: "5. Your rights", body: "Depending on your location, you may have the right to access, correct, delete, or export your personal data, and to opt out of marketing or certain processing activities. Contact us anytime to exercise these rights." },
  { title: "6. Data retention & security", body: "We retain information only as long as needed to provide our services and comply with legal obligations. We use industry-standard security measures including encryption in transit and at rest." },
  { title: "7. Contact us", body: "Questions about this policy? Email privacy@burneyboyz.com." },
];

function Privacy() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy Policy" description="Last updated: June 29, 2026" />
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="mb-8 text-muted-foreground">
          Burney Boyz ("we", "us") respects your privacy. This policy explains what information we collect,
          how we use it, and the rights you have. Placeholder copy - please review with legal counsel before publishing.
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

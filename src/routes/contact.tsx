import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Mail, Phone, MapPin, Clock, Send, MessageSquare } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().email("Please enter a valid email").max(160),
  subject: z.string().trim().min(2, "Subject is required").max(120),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(1000),
});

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — Burney Boyz" },
      {
        name: "description",
        content: "Get in touch with the Burney Boyz team — we usually reply within 24 hours.",
      },
      { property: "og:title", content: "Contact — Burney Boyz" },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: Contact,
});

const contactInfo = [
  {
    icon: Mail,
    title: "Email us",
    body: "support@burneyboyz.com",
    sub: "We reply within 24 hours",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Phone,
    title: "Call us",
    body: "+1 (800) 555-0199",
    sub: "Mon–Fri, 9am–6pm EST",
    color: "bg-green-50 text-green-600",
  },
  {
    icon: MapPin,
    title: "Our office",
    body: "1234 Market Street, Suite 500",
    sub: "Los Angeles, CA 90001",
    color: "bg-orange-50 text-orange-600",
  },
  {
    icon: Clock,
    title: "Business hours",
    body: "Mon – Fri, 9am – 6pm",
    sub: "Eastern Standard Time",
    color: "bg-purple-50 text-purple-600",
  },
];

function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const errs: typeof errors = {};
      for (const issue of result.error.issues) errs[issue.path[0] as keyof typeof form] = issue.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    setTimeout(() => {
      toast.success("Message sent!", {
        description: "Thanks! We'll get back to you within 24 hours.",
      });
      setForm({ name: "", email: "", subject: "", message: "" });
      setLoading(false);
    }, 700);
  };

  const update =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHero
        eyebrow="Contact us"
        title="We'd love to hear from you"
        description="Questions about an order, a product, or just want to say hi? Our team is here for you."
      />

      {/* Contact info cards */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {contactInfo.map((info) => (
            <div
              key={info.title}
              className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-card"
            >
              <div className={`grid h-11 w-11 place-items-center rounded-xl ${info.color}`}>
                <info.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">{info.title}</p>
                <p className="mt-0.5 text-sm font-medium text-foreground">{info.body}</p>
                <p className="text-xs text-muted-foreground">{info.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Form */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="rounded-3xl border bg-card p-7 shadow-card sm:p-10">
            <div className="mb-7 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold">Send us a message</h2>
                <p className="text-sm text-muted-foreground">Fill out the form and we'll be in touch soon.</p>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Your name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={update("name")}
                    className="mt-1.5"
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-destructive">{errors.name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={update("email")}
                    className="mt-1.5"
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-destructive">{errors.email}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="What's this about?"
                  value={form.subject}
                  onChange={update("subject")}
                  className="mt-1.5"
                />
                {errors.subject && (
                  <p className="mt-1 text-xs text-destructive">{errors.subject}</p>
                )}
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  rows={6}
                  placeholder="Tell us how we can help..."
                  value={form.message}
                  onChange={update("message")}
                  className="mt-1.5 resize-none"
                />
                {errors.message && (
                  <p className="mt-1 text-xs text-destructive">{errors.message}</p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full rounded-xl font-semibold"
                disabled={loading}
              >
                {loading ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Send Message
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* FAQ prompt */}
          <div className="flex flex-col gap-5">
            <div className="rounded-3xl bg-secondary p-8 text-secondary-foreground">
              <h3 className="text-lg font-bold">Quick answers</h3>
              <p className="mt-2 text-sm text-secondary-foreground/75">
                Before reaching out, you might find your answer in our FAQ section.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-secondary-foreground/75">
                {[
                  "Where is my order?",
                  "How do I return an item?",
                  "What payment methods do you accept?",
                  "Do you ship internationally?",
                ].map((q) => (
                  <li key={q} className="flex items-start gap-2">
                    <span className="mt-0.5 text-primary">→</span> {q}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="mt-6 w-full rounded-xl border-white/20 bg-white/10 text-secondary-foreground hover:bg-white/20">
                <a href="/faq">Visit FAQ page</a>
              </Button>
            </div>

            <div className="rounded-3xl border bg-card p-7 shadow-card">
              <h3 className="font-bold">Response times</h3>
              <div className="mt-4 space-y-3">
                {[
                  { channel: "Email", time: "Within 24 hours" },
                  { channel: "Phone", time: "Same business day" },
                  { channel: "Live chat", time: "Under 5 minutes" },
                ].map((item) => (
                  <div key={item.channel} className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3 text-sm">
                    <span className="font-medium">{item.channel}</span>
                    <span className="text-green-600 font-semibold">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

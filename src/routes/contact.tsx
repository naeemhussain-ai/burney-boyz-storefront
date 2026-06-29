import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
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
      { name: "description", content: "Get in touch with the Burney Boyz team — we usually reply within 24 hours." },
      { property: "og:title", content: "Contact — Burney Boyz" },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: Contact,
});

function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const e: typeof errors = {};
      for (const issue of result.error.issues) e[issue.path[0] as keyof typeof form] = issue.message;
      setErrors(e);
      return;
    }
    setErrors({});
    setLoading(true);
    setTimeout(() => {
      toast.success("Message sent!", { description: "We'll get back to you within 24 hours." });
      setForm({ name: "", email: "", subject: "", message: "" });
      setLoading(false);
    }, 600);
  };

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="We'd love to hear from you"
        description="Questions about an order, a product, or just want to say hi? Drop us a line."
      />
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
        <form onSubmit={submit} className="rounded-2xl border bg-card p-6 shadow-card sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={update("name")} className="mt-1.5" />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={update("email")} className="mt-1.5" />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
            </div>
          </div>
          <div className="mt-5">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={form.subject} onChange={update("subject")} className="mt-1.5" />
            {errors.subject && <p className="mt-1 text-xs text-destructive">{errors.subject}</p>}
          </div>
          <div className="mt-5">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" rows={6} value={form.message} onChange={update("message")} className="mt-1.5" />
            {errors.message && <p className="mt-1 text-xs text-destructive">{errors.message}</p>}
          </div>
          <Button type="submit" size="lg" className="mt-6 w-full sm:w-auto" disabled={loading}>
            {loading ? "Sending..." : "Send message"}
          </Button>
        </form>

        <aside className="space-y-5">
          {[
            { icon: Mail, title: "Email", body: "support@burneyboyz.com" },
            { icon: Phone, title: "Phone", body: "+1 (555) 010-2024" },
            { icon: MapPin, title: "Address", body: "1234 Market Street\nSuite 500, City, ST 00000" },
            { icon: Clock, title: "Hours", body: "Mon–Fri, 9am–6pm EST" },
          ].map((b) => (
            <div key={b.title} className="rounded-2xl border bg-card p-5 shadow-card">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-semibold">{b.title}</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{b.body}</p>
            </div>
          ))}
          <div className="overflow-hidden rounded-2xl border bg-muted shadow-card">
            <div className="grid aspect-[4/3] place-items-center text-sm text-muted-foreground">
              <MapPin className="h-8 w-8" />
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Heart,
  Sparkles,
  Globe,
  ArrowRight,
  Users,
  Package,
  Star,
  TrendingUp,
  Truck,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/layout/PageHero";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Burney Boyz - Our Story & Mission" },
      {
        name: "description",
        content:
          "Learn about Burney Boyz, a curated dropshipping store delivering the world's most exciting trending products to your door.",
      },
      { property: "og:title", content: "About Burney Boyz" },
      { property: "og:description", content: "Our story, mission, and values." },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: About,
});

const values = [
  {
    icon: Sparkles,
    title: "Curated Quality",
    desc: "Every single product on our store goes through a thorough vetting process before it reaches you. No junk, no filler - just genuinely good stuff.",
    color: "bg-yellow-50 text-yellow-600",
  },
  {
    icon: Heart,
    title: "Customer First",
    desc: "Real humans, real support, real fast. We're here 24/7 because we believe every customer deserves an experience that feels personal.",
    color: "bg-red-50 text-red-500",
  },
  {
    icon: Globe,
    title: "Worldwide Reach",
    desc: "Trusted suppliers and tracked delivery to 60+ countries. Wherever you are, Burney Boyz delivers.",
    color: "bg-blue-50 text-blue-600",
  },
];

const stats = [
  { icon: Users, value: "12,000+", label: "Happy Customers" },
  { icon: Package, value: "500+", label: "Curated Products" },
  { icon: Globe, value: "60+", label: "Countries Served" },
  { icon: Star, value: "4.8★", label: "Average Rating" },
];

const team = [
  {
    name: "Marcus B.",
    role: "Founder & CEO",
    bio: "Passionate about finding products that make everyday life better. Started Burney Boyz from a small apartment with a laptop and a dream.",
    avatar: "MB",
    color: "from-orange-400 to-orange-600",
  },
  {
    name: "Destiny R.",
    role: "Head of Curation",
    bio: "Product obsessive with a nose for quality. Reviews hundreds of products a month to make sure only the best make it to the shop.",
    avatar: "DR",
    color: "from-purple-400 to-purple-600",
  },
  {
    name: "James W.",
    role: "Customer Experience Lead",
    bio: "Believes every customer interaction is an opportunity to build a lifelong relationship. Leads our 24/7 support team with passion.",
    avatar: "JW",
    color: "from-blue-400 to-blue-600",
  },
];

function About() {
  return (
    <>
      <PageHero
        eyebrow="Our story"
        title="Trending products, picked with love"
        description="Burney Boyz started with one simple mission: cut the noise and bring the world's most interesting products to one shop you can actually trust."
      />

      {/* Brand story */}
      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <div className="relative">
          <div className="overflow-hidden rounded-3xl shadow-card">
            <img
              src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80"
              alt="Burney Boyz team collaborating"
              loading="lazy"
              decoding="async"
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
          {/* Floating card */}
          <div className="absolute -bottom-6 -right-4 hidden rounded-2xl border bg-card p-4 shadow-soft lg:block">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Since launch</p>
                <p className="font-bold">Growing every day</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Built for the modern shopper
          </div>
          <h2 className="mt-4 text-3xl font-extrabold md:text-4xl">
            We're obsessed with
            <span className="text-primary"> finding the good stuff</span>
          </h2>
          <p className="mt-5 leading-relaxed text-muted-foreground">
            We're a small team obsessed with finding the gear, gadgets, and goods that make
            everyday life a little better. From smart home upgrades to fitness essentials,
            we hand-pick every item to make sure it's worth your money - and your time.
          </p>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            With partners across the globe, we keep shipping fast and prices fair, so you
            can shop the latest trends without the markup. Every product you see on our
            store has been tested, reviewed, and approved by our team before it ever goes live.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="rounded-full">
              <Link to="/shop">
                Explore the shop <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/contact">Get in touch</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-secondary py-16 text-secondary-foreground">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-white/10">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-4xl font-extrabold text-primary">{s.value}</p>
                <p className="mt-1 text-sm text-secondary-foreground/70">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Our values
            </div>
            <h2 className="mt-4 text-3xl font-extrabold md:text-4xl">What we stand for</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {values.map((v) => (
              <div
                key={v.title}
                className="rounded-3xl border bg-card p-8 shadow-card transition hover:-translate-y-1 hover:shadow-soft"
              >
                <div className={`grid h-14 w-14 place-items-center rounded-2xl ${v.color}`}>
                  <v.icon className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-xl font-bold">{v.title}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Meet the team
            </div>
            <h2 className="mt-4 text-3xl font-extrabold md:text-4xl">The people behind it all</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {team.map((member) => (
              <div
                key={member.name}
                className="rounded-3xl border bg-card p-8 text-center shadow-card transition hover:-translate-y-1 hover:shadow-soft"
              >
                <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br ${member.color} text-xl font-extrabold text-white shadow-lg`}>
                  {member.avatar}
                </div>
                <h3 className="mt-5 text-lg font-bold">{member.name}</h3>
                <p className="text-sm font-medium text-primary">{member.role}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-4 rounded-3xl border bg-card p-8 sm:grid-cols-3 shadow-card">
          {[
            { icon: Truck, title: "Fast worldwide shipping", desc: "Free over $50, tracked to your door" },
            { icon: ShieldCheck, title: "Secure checkout", desc: "256-bit encryption on every order" },
            { icon: Heart, title: "Easy 30-day returns", desc: "Don't love it? Send it back, no fuss" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-4">
              <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary-soft/40 py-20">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold md:text-4xl">
            Ready to find your next favourite thing?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Join thousands of happy customers and discover why Burney Boyz is the store
            everyone's talking about.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="w-full rounded-full sm:w-auto">
              <Link to="/shop">Shop Now <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full rounded-full sm:w-auto">
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Sparkles, Globe, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/layout/PageHero";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Burney Boyz — Our Story & Mission" },
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

function About() {
  return (
    <>
      <PageHero
        eyebrow="Our story"
        title="Trending products, picked with love"
        description="Burney Boyz started with a simple idea: cut the noise and bring the world's most interesting products to one shop you can actually trust."
      />

      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
        <img
          src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80"
          alt="Burney Boyz team collaborating"
          className="rounded-3xl object-cover shadow-card"
        />
        <div className="flex flex-col justify-center">
          <h2 className="text-3xl font-bold">Built for the modern shopper</h2>
          <p className="mt-4 text-muted-foreground">
            We're a small team obsessed with finding the gear, gadgets, and goods that make
            everyday life a little better. From smart home upgrades to fitness essentials,
            we hand-pick every item to make sure it's worth your money — and your time.
          </p>
          <p className="mt-4 text-muted-foreground">
            With partners across the globe, we keep shipping fast and prices fair, so you can
            shop the latest trends without the markup.
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link to="/shop">Explore the shop <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-muted/40 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold">What we stand for</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { icon: Sparkles, title: "Curated quality", desc: "Every product is vetted by our team before it hits the shop." },
              { icon: Heart, title: "Customer-first", desc: "Real humans, real support, real fast — every single time." },
              { icon: Globe, title: "Worldwide reach", desc: "Trusted suppliers and tracked delivery to 60+ countries." },
            ].map((v) => (
              <div key={v.title} className="rounded-2xl border bg-card p-6 text-center shadow-card">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary-soft text-primary">
                  <v.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 rounded-3xl bg-secondary p-10 text-center text-secondary-foreground md:grid-cols-4">
          {[
            ["12k+", "Happy customers"],
            ["500+", "Curated products"],
            ["60+", "Countries served"],
            ["4.8★", "Average rating"],
          ].map(([k, v]) => (
            <div key={v}>
              <p className="text-4xl font-extrabold text-primary">{k}</p>
              <p className="mt-1 text-sm opacity-80">{v}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

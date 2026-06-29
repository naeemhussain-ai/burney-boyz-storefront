import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Truck, ShieldCheck, RefreshCw, Headphones, Star } from "lucide-react";
import { products } from "@/data/products";
import { categories } from "@/data/categories";
import { ProductCard } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Burney Boyz — Shop Trending Products Online" },
      {
        name: "description",
        content:
          "Discover trending gadgets, home, beauty, fashion, fitness, and pet products at Burney Boyz. Fast shipping, secure checkout, easy returns.",
      },
      { property: "og:title", content: "Burney Boyz — Shop Trending Products Online" },
      {
        property: "og:description",
        content: "Trending products across every category. Curated, affordable, delivered.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Home,
});

const valueProps = [
  { icon: Truck, title: "Fast Worldwide Shipping", desc: "Free over $50, tracked to your door." },
  { icon: ShieldCheck, title: "Secure Checkout", desc: "256-bit encrypted, trusted by thousands." },
  { icon: RefreshCw, title: "Easy 30-Day Returns", desc: "Don't love it? Send it back, no fuss." },
  { icon: Headphones, title: "24/7 Customer Support", desc: "We're here whenever you need us." },
];

const testimonials = [
  { name: "Amara K.", quote: "Loved everything about my order — fast shipping and the quality is real.", rating: 5 },
  { name: "Jordan P.", quote: "Burney Boyz is my new go-to for gifts. The packaging alone is *chef's kiss*.", rating: 5 },
  { name: "Riley M.", quote: "Customer service actually replied within an hour. So rare these days.", rating: 5 },
];

function Home() {
  const trending = products.filter((p) => p.trending).slice(0, 8);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-soft via-background to-background">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> New drops weekly
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              Trending products,
              <span className="block text-primary">delivered worldwide.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              From clever gadgets to everyday essentials — Burney Boyz curates the items
              everyone's talking about, so you don't have to scroll for hours.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full">
                <Link to="/shop">
                  Shop Now <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link to="/categories">Browse Categories</Link>
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-5 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              <span>
                <strong className="text-foreground">4.8/5</strong> from 2,400+ happy customers
              </span>
            </div>
          </div>
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              {trending.slice(0, 4).map((p, i) => (
                <div
                  key={p.id}
                  className={`overflow-hidden rounded-2xl bg-card shadow-card ${i % 2 ? "translate-y-6" : ""}`}
                >
                  <img src={p.image} alt={p.name} className="aspect-square w-full object-cover" />
                </div>
              ))}
            </div>
            <div className="absolute -bottom-6 -left-6 hidden rounded-2xl bg-card p-4 shadow-card lg:block">
              <p className="text-xs text-muted-foreground">This week</p>
              <p className="text-2xl font-bold">+2,140 orders</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trending */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Trending now
            </p>
            <h2 className="mt-1 text-3xl font-bold md:text-4xl">Hot picks this week</h2>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/shop">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {trending.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="bg-muted/40 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Shop by category
            </p>
            <h2 className="mt-1 text-3xl font-bold md:text-4xl">Find what you love</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <Link
                key={c.slug}
                to="/category/$slug"
                params={{ slug: c.slug }}
                className="group relative overflow-hidden rounded-2xl shadow-card"
              >
                <img
                  src={c.image}
                  alt={c.name}
                  className="aspect-[5/3] w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <h3 className="text-xl font-bold">{c.name}</h3>
                  <p className="mt-1 text-sm opacity-90">{c.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {valueProps.map((v) => (
            <div key={v.title} className="rounded-2xl border bg-card p-6 shadow-card">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary-soft text-primary">
                <v.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold">{v.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-muted/40 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Reviews</p>
            <h2 className="mt-1 text-3xl font-bold md:text-4xl">Loved by thousands</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="rounded-2xl border bg-card p-6 shadow-card">
                <div className="mb-3 flex">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <blockquote className="text-foreground">"{t.quote}"</blockquote>
                <figcaption className="mt-4 text-sm font-medium text-muted-foreground">
                  — {t.name}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-secondary p-8 text-secondary-foreground md:p-14">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl font-bold md:text-4xl">Get 10% off your first order</h2>
            <p className="mt-3 max-w-xl text-secondary-foreground/80">
              Join the newsletter for early drops, exclusive deals, and a welcome discount.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                (e.currentTarget as HTMLFormElement).reset();
                toast.success("You're in!", { description: "Check your inbox for your code." });
              }}
              className="mt-6 flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <Input
                type="email"
                required
                placeholder="you@email.com"
                className="border-white/20 bg-white/10 text-secondary-foreground placeholder:text-secondary-foreground/60"
              />
              <Button type="submit" size="lg">Subscribe</Button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}

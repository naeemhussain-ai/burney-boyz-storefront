import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Truck,
  ShieldCheck,
  RefreshCw,
  Headphones,
  Star,
  Zap,
  TrendingUp,
  Award,
  Package,
  ChevronRight,
  BadgePercent,
  Globe,
} from "lucide-react";
import { products } from "@/data/products";
import { searchShopProducts } from "@/api/shop";
import { useShopCategoryGroups } from "@/hooks/useShopCategoryGroups";
import { ShopProductCard } from "@/components/shop/ShopProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Burney Boyz - Shop Trending Products Online" },
      {
        name: "description",
        content:
          "Discover trending gadgets, home, beauty, fashion, fitness, and pet products at Burney Boyz. Fast shipping, secure checkout, easy returns.",
      },
      { property: "og:title", content: "Burney Boyz - Shop Trending Products Online" },
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
  {
    icon: Truck,
    title: "Fast Worldwide Shipping",
    desc: "Free shipping on orders over $50. Tracked delivery to your door.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: ShieldCheck,
    title: "Secure Checkout",
    desc: "256-bit encryption. Your payment info is always safe with us.",
    color: "bg-green-50 text-green-600",
  },
  {
    icon: RefreshCw,
    title: "Easy 30-Day Returns",
    desc: "Not happy? Send it back hassle-free within 30 days.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: Headphones,
    title: "24/7 Customer Support",
    desc: "Real humans ready to help whenever you need us.",
    color: "bg-orange-50 text-orange-600",
  },
];

const testimonials = [
  {
    name: "Amara K.",
    location: "New York, USA",
    quote:
      "Loved everything about my order - super fast shipping and the quality is even better than I expected. Will definitely be ordering again!",
    rating: 5,
    product: "Wireless Earbuds Pro",
    avatar: "AK",
  },
  {
    name: "Jordan P.",
    location: "London, UK",
    quote:
      "Burney Boyz is my new go-to for gifts. The packaging alone is *chef's kiss*. My friend was absolutely blown away when she opened it.",
    rating: 5,
    product: "Galaxy Star Projector",
    avatar: "JP",
  },
  {
    name: "Riley M.",
    location: "Sydney, AU",
    quote:
      "Customer service actually replied within an hour. So rare these days. The team really cares about their customers - incredible experience.",
    rating: 5,
    product: "Smart Fitness Tracker",
    avatar: "RM",
  },
];

const tickerItems = [
  "Free shipping on orders $50+",
  "New drops every week",
  "30-day easy returns",
  "Trusted by 12,000+ customers",
  "Secure & encrypted checkout",
  "Ships to 60+ countries",
];

const stats = [
  { label: "Happy Customers", value: "12,000+", icon: TrendingUp },
  { label: "Products Curated", value: "500+", icon: Award },
  { label: "Countries Served", value: "60+", icon: Globe },
  { label: "Average Rating", value: "4.8★", icon: Star },
];

function Home() {
  const featuredDeal = products.find((p) => p.compareAtPrice) ?? products[0];

  // Hero mosaic - real catalog data, latest products that aren't already
  // shown as Featured or New Arrival elsewhere on this page.
  const { data: heroResult } = useQuery({
    queryKey: ["shop", "hero-mosaic"],
    queryFn: () =>
      searchShopProducts({ featured: false, newArrival: false, sort: "newest", limit: 4 }),
    staleTime: 5 * 60_000,
  });
  const heroProducts = heroResult?.products ?? [];

  // Hot picks this week - real catalog data, curated via the "Featured"
  // toggle on Admin > Products (same flag the Shop page's "Featured only"
  // filter uses). Separate from `trending` above, which still backs the
  // hero mosaic and stays on static demo data.
  const { data: featuredResult, isLoading: featuredLoading } = useQuery({
    queryKey: ["shop", "featured-home"],
    queryFn: () => searchShopProducts({ featured: true, limit: 12 }),
    staleTime: 5 * 60_000,
  });
  const featuredProducts = featuredResult?.products;

  const { data: categoryGroups, isLoading: categoryGroupsLoading } = useShopCategoryGroups();

  // New Arrivals - curated via the "New Arrival" toggle on Admin > Products
  // (set right after CJ import, same place/pattern as "Featured").
  const { data: newArrivalsResult, isLoading: newArrivalsLoading } = useQuery({
    queryKey: ["shop", "new-arrivals-home"],
    queryFn: () => searchShopProducts({ newArrival: true, limit: 4, sort: "newest" }),
    staleTime: 5 * 60_000,
  });
  const newArrivals = newArrivalsResult?.products;

  return (
    <>
      {/* Announcement ticker */}
      <div className="overflow-hidden bg-secondary py-2.5 text-secondary-foreground">
        <div className="flex animate-marquee gap-0 whitespace-nowrap">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-6 text-xs font-medium">
              <span className="h-1 w-1 rounded-full bg-primary" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-soft via-background to-background" />
        <div className="absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-[400px] w-[400px] rounded-full bg-primary/8 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-28">
          {/* Left - copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
              <Zap className="h-3.5 w-3.5 fill-primary" />
              New drops every week
            </div>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:text-7xl">
              Trending
              <br />
              products,
              <br />
              <span className="text-primary">delivered</span>
              <span className="text-muted-foreground/40">.</span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Burney Boyz hand-picks the gadgets, goods, and gear everyone's talking about -
              so you can skip the scroll and shop the best, right now.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-8 shadow-glow">
                <Link to="/shop">
                  Shop Now <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-8">
                <Link to="/categories">Browse Categories</Link>
              </Button>
            </div>

            {/* Social proof */}
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex -space-x-2">
                {["AK", "JP", "RM", "TL", "SW"].map((initials, i) => (
                  <div
                    key={i}
                    className="grid h-9 w-9 place-items-center rounded-full border-2 border-background bg-gradient-to-br from-primary to-primary/60 text-[10px] font-bold text-white shadow-sm"
                  >
                    {initials}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">4.8/5</span> from 2,400+ reviews
                </p>
              </div>
            </div>
          </div>

          {/* Right - product mosaic */}
          <div className="relative hidden lg:block">
            <div className="grid grid-cols-2 gap-4">
              {heroProducts.map((p, i) => {
                const price = Number(p.myPrice) || 0;
                const comparePrice = p.comparePrice ? Number(p.comparePrice) : null;
                return (
                  <Link
                    key={p.id}
                    to="/shop/$slug"
                    params={{ slug: p.slug }}
                    className={`group overflow-hidden rounded-2xl bg-card shadow-card transition hover:shadow-soft ${
                      i % 2 ? "translate-y-6" : ""
                    }`}
                  >
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      {p.image && (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      )}
                      {comparePrice && comparePrice > price && (
                        <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                          SALE
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-xs font-medium">{p.name}</p>
                      <p className="mt-0.5 text-sm font-bold text-primary">${price.toFixed(2)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Floating stat card */}
            <div className="absolute -bottom-4 -left-8 rounded-2xl border bg-card p-4 shadow-soft">
              <p className="text-xs font-medium text-muted-foreground">Orders this week</p>
              <p className="mt-0.5 text-2xl font-extrabold">+2,140</p>
              <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
                <TrendingUp className="h-3 w-3" /> 23% vs last week
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -right-4 top-4 rounded-2xl border bg-card p-3 shadow-soft">
              <Package className="h-5 w-5 text-primary" />
              <p className="mt-1 text-xs font-semibold">Fast Delivery</p>
              <p className="text-[10px] text-muted-foreground">3-7 business days</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y bg-card">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-4">
                <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending products */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <TrendingUp className="h-3.5 w-3.5" /> Trending now
            </div>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">Hot picks this week</h2>
            <p className="mt-2 text-muted-foreground">The products everyone's buying right now</p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/shop">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        {featuredLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4.5] w-full animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : featuredProducts && featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {featuredProducts.map((p) => (
              <ShopProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
            No featured products yet. Mark products as "Featured" in Admin → Products to show them here.
          </div>
        )}
        <div className="mt-8 text-center sm:hidden">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/shop">View all products <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* Featured Deal banner */}
      {featuredDeal.compareAtPrice && (
        <section className="bg-secondary py-16 text-secondary-foreground">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white">
                  <BadgePercent className="h-3.5 w-3.5" /> Limited Time Deal
                </div>
                <h2 className="mt-4 text-3xl font-extrabold md:text-4xl">
                  {featuredDeal.name}
                </h2>
                <p className="mt-2 max-w-lg text-secondary-foreground/75">
                  {featuredDeal.description.slice(0, 120)}...
                </p>
                <div className="mt-4 flex items-baseline gap-3">
                  <span className="text-4xl font-extrabold text-primary">
                    ${featuredDeal.price.toFixed(2)}
                  </span>
                  <span className="text-xl text-secondary-foreground/50 line-through">
                    ${featuredDeal.compareAtPrice.toFixed(2)}
                  </span>
                  <span className="rounded-full bg-green-500 px-3 py-1 text-sm font-bold text-white">
                    Save ${(featuredDeal.compareAtPrice - featuredDeal.price).toFixed(2)}
                  </span>
                </div>
                <Button asChild size="lg" className="mt-6 rounded-full">
                  <Link to="/product/$id" params={{ id: featuredDeal.id }}>
                    Grab This Deal <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="relative w-full max-w-xs flex-shrink-0">
                <div className="overflow-hidden rounded-3xl shadow-glow">
                  <img
                    src={featuredDeal.image}
                    alt={featuredDeal.name}
                    className="aspect-square w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Shop by category
            </div>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">Find what you love</h2>
            <p className="mt-2 text-muted-foreground">
              Explore our hand-picked collections, fresh from the catalog
            </p>
          </div>
          {categoryGroupsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] w-full animate-pulse rounded-3xl bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(categoryGroups ?? []).map((g, i) => (
                <Link
                  key={g.label}
                  to="/shop"
                  search={{ cat: g.ids.join(",") }}
                  className={`group relative overflow-hidden rounded-3xl bg-muted shadow-card ${
                    i === 0 ? "sm:col-span-2 lg:col-span-1" : ""
                  }`}
                >
                  {g.image ? (
                    <img
                      src={g.image}
                      alt={g.label}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="aspect-[4/3] w-full" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                    <span className="rounded-full bg-primary/90 px-2.5 py-0.5 text-[10px] font-bold text-white">
                      {g.count} products
                    </span>
                    <h3 className="mt-3 text-xl font-extrabold tracking-tight">{g.label}</h3>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      Shop now <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* New Arrivals */}
      <section className="bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Zap className="h-3.5 w-3.5 fill-primary" /> Just landed
              </div>
              <h2 className="mt-3 text-3xl font-bold md:text-4xl">New Arrivals</h2>
              <p className="mt-2 text-muted-foreground">Fresh picks added to the collection</p>
            </div>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/shop">
                See all <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          {newArrivalsLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[3/4.5] w-full animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : newArrivals && newArrivals.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {newArrivals.map((p) => (
                <ShopProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
              No new arrivals yet. Mark products as "New Arrival" in Admin → Products to show them here.
            </div>
          )}
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Why shop with us?</h2>
          <p className="mt-3 text-muted-foreground">
            We make it easy to get the products you love, delivered with confidence
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {valueProps.map((v) => (
            <div
              key={v.title}
              className="group rounded-3xl border bg-card p-7 shadow-card transition hover:-translate-y-1 hover:shadow-soft"
            >
              <div className={`grid h-14 w-14 place-items-center rounded-2xl ${v.color}`}>
                <v.icon className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-base font-bold">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Star className="h-3.5 w-3.5 fill-primary" /> Customer reviews
            </div>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">Loved by thousands</h2>
            <p className="mt-2 text-muted-foreground">
              Real reviews from real customers across the globe
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure
                key={t.name}
                className="flex flex-col rounded-3xl border bg-card p-7 shadow-card transition hover:-translate-y-1 hover:shadow-soft"
              >
                <div className="mb-4 flex">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <blockquote className="flex-1 text-sm leading-relaxed text-foreground">
                  "{t.quote}"
                </blockquote>
                <div className="mt-6 flex items-center gap-3 border-t pt-5">
                  <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-xs font-bold text-white">
                    {t.avatar}
                  </div>
                  <div>
                    <figcaption className="text-sm font-semibold">{t.name}</figcaption>
                    <p className="text-xs text-muted-foreground">{t.location}</p>
                    <p className="text-xs text-primary">Purchased: {t.product}</p>
                  </div>
                </div>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-secondary p-10 text-secondary-foreground md:p-16">
          {/* Decorative blobs */}
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />

          <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold">
                <BadgePercent className="h-3.5 w-3.5 text-primary" /> Exclusive offer
              </div>
              <h2 className="mt-4 text-3xl font-extrabold md:text-4xl">
                Get 10% off your first order
              </h2>
              <p className="mt-3 text-secondary-foreground/75">
                Join the Burney Boyz newsletter and get early access to new drops, exclusive member
                discounts, and a welcome code in your inbox.
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-secondary-foreground/75">
                {["Early access to new arrivals", "Exclusive member-only deals", "No spam, unsubscribe anytime"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  (e.currentTarget as HTMLFormElement).reset();
                  toast.success("You're in!", { description: "Check your inbox for your 10% off code." });
                }}
                className="flex flex-col gap-3"
              >
                <Input
                  type="email"
                  required
                  placeholder="Enter your email address"
                  className="h-13 border-white/20 bg-white/10 text-secondary-foreground placeholder:text-secondary-foreground/50 focus-visible:ring-primary"
                />
                <Button type="submit" size="lg" className="w-full rounded-xl">
                  Subscribe & Get 10% Off
                </Button>
                <p className="text-center text-xs text-secondary-foreground/50">
                  By subscribing you agree to our Privacy Policy. Unsubscribe anytime.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

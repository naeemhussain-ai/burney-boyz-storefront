import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { categories } from "@/data/categories";
import { products } from "@/data/products";
import { PageHero } from "@/components/layout/PageHero";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Shop by Category - Burney Boyz" },
      {
        name: "description",
        content:
          "Browse Burney Boyz by category: electronics, home, beauty, fashion, fitness, and pet supplies.",
      },
      { property: "og:title", content: "Shop by Category - Burney Boyz" },
      { property: "og:url", content: "/categories" },
    ],
    links: [{ rel: "canonical", href: "/categories" }],
  }),
  component: Categories,
});

function Categories() {
  return (
    <>
      <PageHero
        eyebrow="Browse categories"
        title="Find your next favourite thing"
        description="Six hand-picked collections covering everything trending right now - from tech to pet supplies and beyond."
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Featured large grid */}
        <div className="mb-5 grid gap-5 sm:grid-cols-2">
          {categories.slice(0, 2).map((c) => {
            const count = products.filter((p) => p.category === c.slug).length;
            return (
              <Link
                key={c.slug}
                to="/category/$slug"
                params={{ slug: c.slug }}
                className="group relative overflow-hidden rounded-3xl shadow-card"
              >
                <img
                  src={c.image}
                  alt={c.name}
                  className="aspect-[16/9] w-full object-cover transition duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-7">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="rounded-full bg-primary/90 px-3 py-1 text-xs font-bold text-white">
                        {count} products
                      </span>
                      <h3 className="mt-3 text-2xl font-extrabold text-white">{c.name}</h3>
                      <p className="mt-1.5 text-sm text-white/75">{c.description}</p>
                    </div>
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition group-hover:bg-primary">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Smaller grid for remaining */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.slice(2).map((c) => {
            const count = products.filter((p) => p.category === c.slug).length;
            return (
              <Link
                key={c.slug}
                to="/category/$slug"
                params={{ slug: c.slug }}
                className="group relative overflow-hidden rounded-3xl shadow-card"
              >
                <img
                  src={c.image}
                  alt={c.name}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <span className="rounded-full bg-primary/90 px-2.5 py-0.5 text-[10px] font-bold text-white">
                    {count} products
                  </span>
                  <h3 className="mt-2 text-base font-extrabold text-white">{c.name}</h3>
                  <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary">
                    Shop now <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}

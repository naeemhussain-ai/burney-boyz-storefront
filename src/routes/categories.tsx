import { createFileRoute, Link } from "@tanstack/react-router";
import { categories } from "@/data/categories";
import { products } from "@/data/products";
import { PageHero } from "@/components/layout/PageHero";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Shop by Category — Burney Boyz" },
      {
        name: "description",
        content:
          "Browse Burney Boyz by category: electronics, home, beauty, fashion, fitness, and pet supplies.",
      },
      { property: "og:title", content: "Shop by Category — Burney Boyz" },
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
        eyebrow="Categories"
        title="Find your next favorite thing"
        description="Six handpicked collections covering everything trending right now."
      />
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => {
            const count = products.filter((p) => p.category === c.slug).length;
            return (
              <Link
                key={c.slug}
                to="/category/$slug"
                params={{ slug: c.slug }}
                className="group overflow-hidden rounded-2xl border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-soft"
              >
                <div className="relative aspect-[5/3] overflow-hidden">
                  <img
                    src={c.image}
                    alt={c.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{c.name}</h3>
                    <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                      {count}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}

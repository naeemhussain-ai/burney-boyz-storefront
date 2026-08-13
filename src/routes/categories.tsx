import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useShopCategoryGroups } from "@/hooks/useShopCategoryGroups";
import { PageHero } from "@/components/layout/PageHero";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Shop by Category - Burney Boyz" },
      {
        name: "description",
        content: "Browse the full Burney Boyz catalog by category.",
      },
      { property: "og:title", content: "Shop by Category - Burney Boyz" },
      { property: "og:url", content: "/categories" },
    ],
    links: [{ rel: "canonical", href: "/categories" }],
  }),
  component: Categories,
});

function Categories() {
  const { data: groups, isLoading } = useShopCategoryGroups();
  const featured = groups?.slice(0, 2) ?? [];
  const rest = groups?.slice(2) ?? [];

  return (
    <>
      <PageHero
        eyebrow="Browse categories"
        title="Find your next favourite thing"
        description="Every category, straight from the live catalog - browse and shop the full range."
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] w-full animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        ) : !groups || groups.length === 0 ? (
          <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
            No categories yet.
          </div>
        ) : (
          <>
            {/* Featured large grid */}
            <div className="mb-5 grid gap-5 sm:grid-cols-2">
              {featured.map((g) => (
                <Link
                  key={g.label}
                  to="/shop"
                  search={{ cat: g.ids.join(",") }}
                  className="group relative overflow-hidden rounded-3xl bg-muted shadow-card"
                >
                  {g.image ? (
                    <img
                      src={g.image}
                      alt={g.label}
                      className="aspect-[16/9] w-full object-cover transition duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="aspect-[16/9] w-full" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-7">
                    <div className="flex items-end justify-between">
                      <div>
                        <span className="rounded-full bg-primary/90 px-3 py-1 text-xs font-bold text-white">
                          {g.count} products
                        </span>
                        <h3 className="mt-3 text-2xl font-extrabold text-white">{g.label}</h3>
                      </div>
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition group-hover:bg-primary">
                        <ChevronRight className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Smaller grid for remaining */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {rest.map((g) => (
                <Link
                  key={g.label}
                  to="/shop"
                  search={{ cat: g.ids.join(",") }}
                  className="group relative overflow-hidden rounded-3xl bg-muted shadow-card"
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <span className="rounded-full bg-primary/90 px-2.5 py-0.5 text-[10px] font-bold text-white">
                      {g.count} products
                    </span>
                    <h3 className="mt-2 text-base font-extrabold text-white">{g.label}</h3>
                    <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary">
                      Shop now <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}

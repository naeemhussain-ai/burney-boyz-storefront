import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { getRecentlyViewed, type RecentlyViewedEntry } from "@/lib/recentlyViewed";

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  // Read after mount, not during render - localStorage isn't available
  // during SSR and reading it live keeps this in sync with the page the
  // visitor just came from.
  const [items, setItems] = useState<RecentlyViewedEntry[]>([]);

  useEffect(() => {
    setItems(getRecentlyViewed(excludeId));
  }, [excludeId]);

  if (items.length === 0) return null;

  return (
    <section className="border-t bg-muted/20 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-2xl font-bold md:text-3xl">Recently Viewed</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {items.slice(0, 6).map((item) => (
            <Link key={item.id} to="/shop/$slug" params={{ slug: item.slug }} className="group">
              <div className="aspect-square overflow-hidden rounded-xl bg-muted">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : null}
              </div>
              <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug group-hover:text-primary">
                {item.name}
              </p>
              <p className="text-sm font-bold">${(Number(item.myPrice) || 0).toFixed(2)}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { products } from "@/data/products";
import { categories } from "@/data/categories";
import { ProductCard } from "@/components/shop/ProductCard";
import { PageHero } from "@/components/layout/PageHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";

const searchSchema = z.object({
  q: z.string().optional(),
  cat: z.string().optional(),
  sort: z.enum(["featured", "price-asc", "price-desc", "newest", "rating"]).optional(),
});

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop All Trending Products — Burney Boyz" },
      {
        name: "description",
        content:
          "Browse the full Burney Boyz catalog: filter by category, price, and rating to find the trending products you love.",
      },
      { property: "og:title", content: "Shop — Burney Boyz" },
      { property: "og:url", content: "/shop" },
    ],
    links: [{ rel: "canonical", href: "/shop" }],
  }),
  validateSearch: zodValidator(searchSchema),
  component: Shop,
});

const PAGE_SIZE = 8;

function Shop() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });

  const [query, setQuery] = useState(search.q ?? "");
  const [price, setPrice] = useState<[number, number]>([0, 200]);
  const [selectedCats, setSelectedCats] = useState<string[]>(search.cat ? [search.cat] : []);
  const [sort, setSort] = useState(search.sort ?? "featured");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    let list = [...products];
    const q = (query || search.q || "").toLowerCase().trim();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    if (selectedCats.length) list = list.filter((p) => selectedCats.includes(p.category));
    list = list.filter((p) => p.price >= price[0] && p.price <= price[1]);
    switch (sort) {
      case "price-asc": list.sort((a, b) => a.price - b.price); break;
      case "price-desc": list.sort((a, b) => b.price - a.price); break;
      case "newest": list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break;
      case "rating": list.sort((a, b) => b.rating - a.rating); break;
    }
    return list;
  }, [query, search.q, selectedCats, price, sort]);

  const visibleItems = filtered.slice(0, visible);

  const toggleCat = (slug: string) =>
    setSelectedCats((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );

  const FiltersInner = (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold">Category</h3>
        <ul className="space-y-2">
          {categories.map((c) => (
            <li key={c.slug} className="flex items-center gap-2">
              <Checkbox
                id={`cat-${c.slug}`}
                checked={selectedCats.includes(c.slug)}
                onCheckedChange={() => toggleCat(c.slug)}
              />
              <label htmlFor={`cat-${c.slug}`} className="text-sm cursor-pointer">
                {c.name}
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold">
          Price: ${price[0]} – ${price[1]}
        </h3>
        <Slider
          min={0}
          max={200}
          step={5}
          value={price}
          onValueChange={(v) => setPrice([v[0], v[1]] as [number, number])}
        />
      </div>
      {(selectedCats.length > 0 || query) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedCats([]);
            setQuery("");
            setPrice([0, 200]);
            navigate({ search: {} });
          }}
        >
          <X className="h-4 w-4" /> Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <>
      <PageHero
        eyebrow="All products"
        title="Shop the Burney Boyz collection"
        description="Filter, search, and sort our full catalog of trending products."
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              className="pl-9"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="rating">Best Rating</SelectItem>
            </SelectContent>
          </Select>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden">
                <SlidersHorizontal className="h-4 w-4" /> Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">{FiltersInner}</div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-24">{FiltersInner}</div>
          </aside>

          <div>
            <p className="mb-4 text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "product" : "products"}
            </p>
            {filtered.length === 0 ? (
              <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
                No products match your filters.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {visibleItems.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
                {visible < filtered.length && (
                  <div className="mt-10 flex justify-center">
                    <Button size="lg" variant="outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                      Load more
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

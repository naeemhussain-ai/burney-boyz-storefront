import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { fetchShopCategories, searchShopProducts, type ShopSort } from "@/api/shop";
import { ShopProductCard } from "@/components/shop/ShopProductCard";
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
  sort: z.enum(["newest", "price-asc", "price-desc", "best-selling", "highest-rated"]).optional(),
});

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop All Trending Products - Burney Boyz" },
      {
        name: "description",
        content:
          "Browse the full Burney Boyz catalog: filter by category, price, and rating to find the trending products you love.",
      },
      { property: "og:title", content: "Shop - Burney Boyz" },
      { property: "og:url", content: "/shop" },
    ],
    links: [{ rel: "canonical", href: "/shop" }],
  }),
  validateSearch: zodValidator(searchSchema),
  component: Shop,
});

const PAGE_SIZE = 12;
const MAX_PRICE = 200;

const SORT_OPTIONS: { value: ShopSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "best-selling", label: "Best Selling" },
  { value: "highest-rated", label: "Highest Rated" },
];

function Shop() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });

  // Text input is local + debounced before it drives the query/URL - avoids
  // a request (and a URL/history entry) on every keystroke.
  const [queryInput, setQueryInput] = useState(search.q ?? "");
  const [keyword, setKeyword] = useState(search.q ?? "");
  const [selectedCats, setSelectedCats] = useState<string[]>(search.cat ? search.cat.split(",") : []);
  const sort = search.sort ?? "newest";

  // Price is drag-live locally, only committed to the query on pointer-up -
  // dragging a slider must not fire a request per pixel.
  const [priceDraft, setPriceDraft] = useState<[number, number]>([0, MAX_PRICE]);
  const [price, setPrice] = useState<[number, number]>([0, MAX_PRICE]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(queryInput.trim());
      navigate({ search: (prev) => ({ ...prev, q: queryInput.trim() || undefined }) });
    }, 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryInput]);

  const { data: categories } = useQuery({
    queryKey: ["shop", "categories"],
    queryFn: fetchShopCategories,
    staleTime: 5 * 60_000,
  });

  const filters = {
    keyword,
    category: selectedCats.join(","),
    sort,
    minPrice: price[0],
    maxPrice: price[1] < MAX_PRICE ? price[1] : undefined,
    availability: inStockOnly ? ("in_stock" as const) : undefined,
    featured: featuredOnly ? true : undefined,
  };

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["shop", "search", filters],
    queryFn: ({ pageParam }) =>
      searchShopProducts({
        search: filters.keyword || undefined,
        category: filters.category || undefined,
        sort: filters.sort,
        minPrice: filters.minPrice > 0 ? filters.minPrice : undefined,
        maxPrice: filters.maxPrice,
        availability: filters.availability,
        featured: filters.featured,
        page: pageParam,
        limit: PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
  });

  const products = useMemo(() => data?.pages.flatMap((p) => p.products) ?? [], [data]);
  const total = data?.pages[0]?.pagination.total ?? 0;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // CJ category names are full paths ("Jewelry & Watches > Mens Watches >
  // Quartz Watches"); the filter only ever showed the first segment, so
  // distinct categoryIds whose paths share a top-level name (common - CJ
  // splits most categories into several leaf subcategories) rendered as
  // visually identical duplicate checkboxes. Grouped here into one checkbox
  // per top-level name, toggling every categoryId under it together - the
  // backend already accepts a comma-separated categoryId list.
  const categoryGroups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of categories ?? []) {
      const label = c.name?.split(" > ")[0]?.trim() || "Unknown";
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(c.id);
    }
    return Array.from(map.entries()).map(([label, ids]) => ({ label, ids }));
  }, [categories]);

  const toggleCatGroup = (ids: string[]) => {
    const allSelected = ids.every((id) => selectedCats.includes(id));
    const next = allSelected
      ? selectedCats.filter((id) => !ids.includes(id))
      : [...new Set([...selectedCats, ...ids])];
    setSelectedCats(next);
    navigate({ search: (prev) => ({ ...prev, cat: next.length ? next.join(",") : undefined }) });
  };

  const hasActiveFilters =
    selectedCats.length > 0 ||
    keyword ||
    price[0] > 0 ||
    price[1] < MAX_PRICE ||
    inStockOnly ||
    featuredOnly;

  const clearFilters = () => {
    setSelectedCats([]);
    setQueryInput("");
    setKeyword("");
    setPriceDraft([0, MAX_PRICE]);
    setPrice([0, MAX_PRICE]);
    setInStockOnly(false);
    setFeaturedOnly(false);
    navigate({ search: {} });
  };

  const FiltersInner = (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold">Category</h3>
        <ul className="space-y-2">
          {categoryGroups.map((g) => (
            <li key={g.label} className="flex items-center gap-2">
              <Checkbox
                id={`cat-${g.label}`}
                checked={g.ids.every((id) => selectedCats.includes(id))}
                onCheckedChange={() => toggleCatGroup(g.ids)}
              />
              <label htmlFor={`cat-${g.label}`} className="text-sm cursor-pointer">
                {g.label}
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold">
          Price: ${priceDraft[0]} – ${priceDraft[1]}
          {priceDraft[1] >= MAX_PRICE ? "+" : ""}
        </h3>
        <Slider
          min={0}
          max={MAX_PRICE}
          step={5}
          value={priceDraft}
          onValueChange={(v) => setPriceDraft([v[0], v[1]] as [number, number])}
          onValueCommit={(v) => setPrice([v[0], v[1]] as [number, number])}
        />
      </div>
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <Checkbox
            id="in-stock-only"
            checked={inStockOnly}
            onCheckedChange={(v) => setInStockOnly(v === true)}
          />
          <label htmlFor="in-stock-only" className="cursor-pointer text-sm">
            In stock only
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="featured-only"
            checked={featuredOnly}
            onCheckedChange={(v) => setFeaturedOnly(v === true)}
          />
          <label htmlFor="featured-only" className="cursor-pointer text-sm">
            Featured only
          </label>
        </div>
      </div>
      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={clearFilters}>
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
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search by product name or SKU..."
              className="pl-9"
            />
          </div>
          <Select
            value={sort}
            onValueChange={(v) =>
              navigate({ search: (prev) => ({ ...prev, sort: v as ShopSort }) })
            }
          >
            <SelectTrigger className="sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
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
            <div className="sticky top-28">{FiltersInner}</div>
          </aside>

          <div>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4.5] w-full animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            ) : isError ? (
              <div className="rounded-2xl border bg-card p-12 text-center">
                <p className="text-sm text-muted-foreground">
                  {error instanceof Error ? error.message : "Something went wrong."}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 rounded-full"
                  onClick={() => refetch()}
                >
                  Try again
                </Button>
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
                No products match your filters.
              </div>
            ) : (
              <>
                <p className="mb-4 text-sm text-muted-foreground">
                  {total} {total === 1 ? "product" : "products"}
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((p) => (
                    <ShopProductCard key={p.id} product={p} />
                  ))}
                </div>

                <div ref={sentinelRef} className="mt-10 flex justify-center">
                  {hasNextPage ? (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                    >
                      {isFetchingNextPage ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                        </>
                      ) : (
                        "Load more"
                      )}
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      You've reached the end of the results.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

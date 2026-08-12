import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  CjImportApiError,
  fetchCjCategories,
  importCjProduct,
  searchCjProducts,
  type CjSortField,
  type CjSortOrder,
} from "@/api/cjImport";
import { fetchAdminProducts, fetchAdminProductById, type AdminProduct } from "@/api/admin";
import { CjProductCard } from "@/components/admin/CjProductCard";
import { CjProductPreviewModal } from "@/components/admin/CjProductPreviewModal";
import { EditProductDialog } from "@/components/admin/EditProductDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/cj-import")({
  head: () => ({ meta: [{ title: "CJ Import Center - Admin - Burney Boyz" }] }),
  component: CjImportCenterPage,
});

const PAGE_SIZE = 24;

const SORT_OPTIONS: { value: string; label: string; sort: CjSortField; order: CjSortOrder }[] = [
  { value: "match-desc", label: "Best Match", sort: "match", order: "desc" },
  { value: "sales-desc", label: "Best Selling", sort: "sales", order: "desc" },
  { value: "price-asc", label: "Price: Low to High", sort: "price", order: "asc" },
  { value: "price-desc", label: "Price: High to Low", sort: "price", order: "desc" },
  { value: "newest-desc", label: "Newest", sort: "newest", order: "desc" },
  { value: "inventory-desc", label: "Most Inventory", sort: "inventory", order: "desc" },
];

function CjImportCenterPage() {
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [sortValue, setSortValue] = useState(SORT_OPTIONS[0].value);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [pricingProduct, setPricingProduct] = useState<AdminProduct | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);

  // Live search: debounce raw input before it drives the query.
  useEffect(() => {
    const timer = setTimeout(() => setKeyword(searchInput.trim()), 450);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const sortOption = SORT_OPTIONS.find((o) => o.value === sortValue) ?? SORT_OPTIONS[0];

  const { data: categories } = useQuery({
    queryKey: ["cj-import", "categories"],
    queryFn: fetchCjCategories,
    staleTime: 5 * 60_000,
  });

  // Same queryKey admin.products.tsx uses for its own products list - importing
  // here invalidates that cache too, so both pages stay in sync automatically.
  const { data: adminProducts } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: fetchAdminProducts,
  });

  const importedIds = useMemo(
    () => new Set((adminProducts ?? []).map((p) => p.cjProductId)),
    [adminProducts],
  );

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
    queryKey: ["cj-import", "search", keyword, categoryId, sortOption.sort, sortOption.order],
    queryFn: ({ pageParam }) =>
      searchCjProducts({
        keyword: keyword || undefined,
        category: categoryId === "all" ? undefined : categoryId,
        sort: sortOption.sort,
        order: sortOption.order,
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

  // Infinite scroll: auto-load the next page once the sentinel enters view.
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

  const importMutation = useMutation({
    mutationFn: (cjProductId: string) => importCjProduct(cjProductId),
    onMutate: (cjProductId) => setImportingId(cjProductId),
    onSuccess: async (result) => {
      // Refresh the shared admin products cache so import buttons everywhere
      // (this page + /admin/products) disable themselves without a reload.
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("Product imported", { description: "Configure its pricing below." });
      setPreviewId(null);
      try {
        const product = await fetchAdminProductById(result.productId);
        setPricingProduct(product);
      } catch {
        // Import already succeeded; pricing can still be edited later from
        // Admin → Products if this follow-up fetch fails.
      }
    },
    onError: (err) => {
      toast.error(err instanceof CjImportApiError ? err.message : "Failed to import product.");
    },
    onSettled: () => setImportingId(null),
  });

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">CJ Import Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search the live CJ Dropshipping catalog and import products into your store.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search CJ products by keyword..."
            className="pl-9"
          />
        </div>

        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(categories ?? []).map((top) => (
              <SelectGroup key={top.id}>
                <SelectLabel>{top.name}</SelectLabel>
                {top.children
                  .flatMap((mid) => mid.children)
                  .map((leaf) => (
                    <SelectItem key={leaf.id} value={leaf.id}>
                      {leaf.name}
                    </SelectItem>
                  ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortValue} onValueChange={setSortValue}>
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
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <Alert variant="destructive" className="max-w-xl">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Couldn't search CJ products</AlertTitle>
          <AlertDescription className="mt-1 flex flex-col items-start gap-3">
            <span>
              {error instanceof CjImportApiError ? error.message : "Something went wrong."}
            </span>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
          No CJ products match your search.
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {total.toLocaleString()} products found
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <CjProductCard
                key={product.id}
                product={product}
                imported={importedIds.has(product.id)}
                importing={importingId === product.id}
                onPreview={() => setPreviewId(product.id)}
                onImport={() => importMutation.mutate(product.id)}
              />
            ))}
          </div>

          <div ref={sentinelRef} className="mt-8 flex justify-center">
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

      <CjProductPreviewModal
        cjProductId={previewId}
        imported={previewId !== null && importedIds.has(previewId)}
        importing={importingId === previewId}
        onClose={() => setPreviewId(null)}
        onImport={(id) => importMutation.mutate(id)}
      />

      <EditProductDialog product={pricingProduct} onClose={() => setPricingProduct(null)} />
    </section>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Pencil, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  fetchAdminProducts,
  syncAdminProduct,
  syncAllAdminProducts,
  AdminApiError,
  type AdminProduct,
} from "@/api/admin";
import { EditProductDialog } from "@/components/admin/EditProductDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/admin/products")({
  head: () => ({
    meta: [{ title: "Admin - Products - Burney Boyz" }],
  }),
  component: AdminProductsPage,
});

function displayMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : "-";
}

function totalStock(product: AdminProduct): number | null {
  if (!product.variants || product.variants.length === 0) return null;
  return product.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
}

// e.g. "3 min ago", "2 hours ago" - Last Sync Time is glanced at often
// enough that a relative label is more useful than a raw timestamp.
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function SyncStatusCell({ product }: { product: AdminProduct }) {
  if (!product.lastSyncedAt) {
    return <span className="text-xs text-muted-foreground">Never synced</span>;
  }
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {product.lastSyncStatus === "error" ? (
        <XCircle className="h-3.5 w-3.5 flex-none text-destructive" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5 flex-none text-green-600" />
      )}
      <span
        className={product.lastSyncStatus === "error" ? "text-destructive" : "text-muted-foreground"}
        title={product.lastSyncError ?? undefined}
      >
        {relativeTime(product.lastSyncedAt)}
      </span>
    </div>
  );
}

function AdminProductsPage() {
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    data: products,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: fetchAdminProducts,
  });

  const syncOneMutation = useMutation({
    mutationFn: (id: string) => syncAdminProduct(id),
    onMutate: (id) => setSyncingId(id),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      if (result.status === "success") {
        toast.success(
          result.changedFields.length || result.variantChanges?.created || result.variantChanges?.updated
            ? "Product synced - CJ data updated."
            : "Product synced - already up to date.",
        );
      } else {
        toast.error(result.error || "Sync failed.");
      }
    },
    onError: (err) => {
      toast.error(err instanceof AdminApiError ? err.message : "Failed to sync product.");
    },
    onSettled: () => setSyncingId(null),
  });

  const syncAllMutation = useMutation({
    mutationFn: syncAllAdminProducts,
    onSuccess: async (summary) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success(
        `Synced ${summary.total} product(s) - ${summary.changed} changed, ${summary.unchanged} unchanged` +
          (summary.failed ? `, ${summary.failed} failed` : "") +
          ".",
      );
    },
    onError: (err) => {
      toast.error(err instanceof AdminApiError ? err.message : "Failed to sync all products.");
    },
  });

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Product Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage pricing, visibility, and content for imported products.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => syncAllMutation.mutate()}
          disabled={syncAllMutation.isPending || !products?.length}
        >
          {syncAllMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Syncing all…
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" /> Sync All Products
            </>
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <Alert variant="destructive" className="max-w-xl">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Couldn't load products</AlertTitle>
          <AlertDescription className="mt-1 flex flex-col items-start gap-3">
            <span>
              {error instanceof AdminApiError
                ? error.message
                : "Something went wrong while fetching products."}
            </span>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : !products || products.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
          No products have been imported yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>CJ Cost Price (internal)</TableHead>
                <TableHead>My Price</TableHead>
                <TableHead>Compare Price</TableHead>
                <TableHead title="CJ's reference shipping cost, used to calculate profit margin in the Pricing tab below - not the price customers pay. Checkout always charges CJ's live shipping quote for the customer's actual destination country.">
                  Shipping (cost ref.)
                </TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-md bg-muted text-[9px] text-muted-foreground">
                        No image
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <span className="line-clamp-2 font-medium">{product.name}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {displayMoney(product.price)}
                  </TableCell>
                  <TableCell className="font-semibold">{displayMoney(product.myPrice)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {displayMoney(product.comparePrice)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex flex-col gap-0.5">
                      <span>{displayMoney(product.shippingCost)}</span>
                      {product.shippingCountries && product.shippingCountries.length > 0 ? (
                        <span className="text-xs" title="Quoted for this destination only - other countries are calculated live at checkout.">
                          ref: {product.shippingCountries.join(", ")}
                        </span>
                      ) : (
                        <span className="text-xs">not quoted by CJ</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {totalStock(product) !== null ? totalStock(product)!.toLocaleString() : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.status === "published" ? "default" : "secondary"}>
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {product.featured ? (
                      <Badge variant="outline">Featured</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <SyncStatusCell product={product} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={syncingId === product.id}
                        onClick={() => syncOneMutation.mutate(product.id)}
                      >
                        {syncingId === product.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Sync
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(product)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <EditProductDialog product={editing} onClose={() => setEditing(null)} />
    </section>
  );
}

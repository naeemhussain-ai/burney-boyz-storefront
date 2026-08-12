import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  PackageX,
  RefreshCw,
  TrendingDown,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchInventoryOverview,
  fetchLowStockProducts,
  fetchOutOfStockProducts,
  fetchSyncLogs,
  retryFailedSyncs,
  InventoryApiError,
  type SyncLog,
} from "@/api/inventory";
import { syncAllAdminProducts, AdminApiError } from "@/api/admin";
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
import { displayPrice } from "@/lib/utils";

export const Route = createFileRoute("/admin/inventory")({
  head: () => ({ meta: [{ title: "Inventory - Admin - Burney Boyz" }] }),
  component: AdminInventoryPage,
});

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

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "warning" | "danger";
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div
          className={
            "grid h-9 w-9 place-items-center rounded-full " +
            (tone === "danger"
              ? "bg-destructive/10"
              : tone === "warning"
                ? "bg-amber-500/10"
                : "bg-primary-soft")
          }
        >
          <Icon
            className={
              "h-4 w-4 " +
              (tone === "danger" ? "text-destructive" : tone === "warning" ? "text-amber-600" : "text-primary")
            }
          />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold md:text-3xl">{value}</p>
    </div>
  );
}

const SYNC_LOG_TYPE_LABEL: Record<SyncLog["type"], string> = {
  manual: "Manual (bulk)",
  scheduled: "Scheduled",
  retry: "Retry",
  single: "Single product",
};

function SyncLogStatusBadge({ status }: { status: SyncLog["status"] }) {
  if (status === "success") return <Badge>Success</Badge>;
  if (status === "partial") return <Badge variant="secondary">Partial</Badge>;
  if (status === "running") return <Badge variant="outline">Running</Badge>;
  return <Badge variant="destructive">Error</Badge>;
}

function AdminInventoryPage() {
  const queryClient = useQueryClient();
  const [lowStockPage, setLowStockPage] = useState(1);
  const [outOfStockPage, setOutOfStockPage] = useState(1);

  const overviewQuery = useQuery({
    queryKey: ["admin", "inventory", "overview"],
    queryFn: fetchInventoryOverview,
  });

  const lowStockQuery = useQuery({
    queryKey: ["admin", "inventory", "low-stock", lowStockPage],
    queryFn: () => fetchLowStockProducts({ page: lowStockPage, limit: 10 }),
  });

  const outOfStockQuery = useQuery({
    queryKey: ["admin", "inventory", "out-of-stock", outOfStockPage],
    queryFn: () => fetchOutOfStockProducts({ page: outOfStockPage, limit: 10 }),
  });

  const syncLogsQuery = useQuery({
    queryKey: ["admin", "inventory", "sync-logs"],
    queryFn: () => fetchSyncLogs({ page: 1, limit: 10 }),
  });

  function invalidateInventory() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
    ]);
  }

  const syncAllMutation = useMutation({
    mutationFn: syncAllAdminProducts,
    onSuccess: async (summary) => {
      await invalidateInventory();
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

  const retryMutation = useMutation({
    mutationFn: retryFailedSyncs,
    onSuccess: async (summary) => {
      await invalidateInventory();
      toast.success(
        summary.total
          ? `Retried ${summary.total} product(s) - ${summary.succeeded} succeeded, ${summary.failed} still failing.`
          : "No failed syncs to retry.",
      );
    },
    onError: (err) => {
      toast.error(err instanceof InventoryApiError ? err.message : "Failed to retry syncs.");
    },
  });

  const overview = overviewQuery.data;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Inventory Automation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stock sync status, low/out-of-stock alerts, and sync history - powered by the same CJ sync
            used on the Products page.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => retryMutation.mutate()}
            disabled={retryMutation.isPending}
          >
            {retryMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Retry Failed Syncs
          </Button>
          <Button onClick={() => syncAllMutation.mutate()} disabled={syncAllMutation.isPending}>
            {syncAllMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Syncing all…
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" /> Sync All Now
              </>
            )}
          </Button>
        </div>
      </div>

      {overviewQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : overviewQuery.isError ? (
        <Alert variant="destructive" className="max-w-xl">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Couldn't load inventory overview</AlertTitle>
          <AlertDescription>
            {overviewQuery.error instanceof InventoryApiError
              ? overviewQuery.error.message
              : "Something went wrong."}
          </AlertDescription>
        </Alert>
      ) : overview ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Last Sync"
            value={overview.lastSync ? relativeTime(overview.lastSync.startedAt) : "Never"}
            icon={Clock}
          />
          <StatCard label="Total Products" value={String(overview.totalProducts)} icon={CheckCircle2} />
          <StatCard
            label={`Low Stock (≤ ${overview.lowStockThreshold})`}
            value={String(overview.lowStockCount)}
            icon={TrendingDown}
            tone="warning"
          />
          <StatCard
            label="Out of Stock"
            value={String(overview.outOfStockCount)}
            icon={PackageX}
            tone="danger"
          />
        </div>
      ) : null}

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low Stock */}
        <div className="rounded-2xl border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-amber-600" />
            <h2 className="text-lg font-bold">Low Stock</h2>
          </div>
          {lowStockQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : !lowStockQuery.data || lowStockQuery.data.products.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No products are running low.</p>
          ) : (
            <>
              <ul className="divide-y">
                {lowStockQuery.data.products.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-3 text-sm">
                    <div className="h-10 w-10 flex-none overflow-hidden rounded-lg bg-muted">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{displayPrice(p.myPrice)}</p>
                    </div>
                    <Badge variant="outline" className="flex-none border-amber-500/50 text-amber-700">
                      {p.totalStock} left
                    </Badge>
                  </li>
                ))}
              </ul>
              {lowStockQuery.data.pagination.totalPages > 1 ? (
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={lowStockPage <= 1}
                    onClick={() => setLowStockPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={lowStockPage >= lowStockQuery.data.pagination.totalPages}
                    onClick={() => setLowStockPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Out of Stock */}
        <div className="rounded-2xl border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <PackageX className="h-4 w-4 text-destructive" />
            <h2 className="text-lg font-bold">Out of Stock</h2>
          </div>
          {outOfStockQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : !outOfStockQuery.data || outOfStockQuery.data.products.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Everything is in stock.</p>
          ) : (
            <>
              <ul className="divide-y">
                {outOfStockQuery.data.products.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-3 text-sm">
                    <div className="h-10 w-10 flex-none overflow-hidden rounded-lg bg-muted">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{displayPrice(p.myPrice)}</p>
                    </div>
                    <Badge variant="destructive" className="flex-none">
                      Out of stock
                    </Badge>
                  </li>
                ))}
              </ul>
              {outOfStockQuery.data.pagination.totalPages > 1 ? (
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={outOfStockPage <= 1}
                    onClick={() => setOutOfStockPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={outOfStockPage >= outOfStockQuery.data.pagination.totalPages}
                    onClick={() => setOutOfStockPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Sync Logs */}
      <div className="mt-6 rounded-2xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-bold">Recent Sync Runs</h2>
        {syncLogsQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : !syncLogsQuery.data || syncLogsQuery.data.logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No syncs have run yet.</p>
        ) : (
          <div className="overflow-x-auto">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead className="text-right">Changed</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead>Triggered By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {syncLogsQuery.data.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground" title={log.startedAt}>
                    {relativeTime(log.startedAt)}
                  </TableCell>
                  <TableCell>{SYNC_LOG_TYPE_LABEL[log.type]}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {log.status === "error" ? (
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      ) : log.status === "success" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      ) : null}
                      <SyncLogStatusBadge status={log.status} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{log.totalProducts}</TableCell>
                  <TableCell className="text-right">{log.changed}</TableCell>
                  <TableCell className="text-right">{log.failed}</TableCell>
                  <TableCell className="text-muted-foreground">{log.triggeredBy || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </div>
    </section>
  );
}

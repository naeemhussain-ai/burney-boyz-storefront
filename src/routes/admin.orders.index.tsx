import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { AlertTriangle, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { fetchAdminOrders, AdminApiError } from "@/api/admin";
import type { OrderStatus } from "@/api/order";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { displayPrice } from "@/lib/utils";
import { ORDER_STATUS_VARIANT, ORDER_STATUSES } from "@/lib/orderStatus";

const searchSchema = z.object({
  q: z.string().optional(),
  status: z
    .enum(["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"])
    .optional(),
  page: z.number().int().min(1).optional(),
});

export const Route = createFileRoute("/admin/orders/")({
  head: () => ({ meta: [{ title: "Orders - Admin - Burney Boyz" }] }),
  validateSearch: zodValidator(searchSchema),
  component: AdminOrdersPage,
});

const ALL_STATUSES = "all";
const PAGE_SIZE = 20;

function AdminOrdersPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  // Local text input, committed to the URL search param on submit - avoids
  // firing a query on every keystroke.
  const [queryInput, setQueryInput] = useState(search.q ?? "");

  const page = search.page ?? 1;
  const status = search.status;

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["admin", "orders", { q: search.q, status, page }],
    queryFn: () => fetchAdminOrders({ search: search.q, status, page, limit: PAGE_SIZE }),
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      search: (prev) => ({ ...prev, q: queryInput.trim() || undefined, page: undefined }),
    });
  };

  const handleStatusChange = (value: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        status: value === ALL_STATUSES ? undefined : (value as OrderStatus),
        page: undefined,
      }),
    });
  };

  const goToPage = (nextPage: number) => {
    navigate({ search: (prev) => ({ ...prev, page: nextPage > 1 ? nextPage : undefined }) });
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search, filter, and update the status of customer orders.
        </p>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Search order #, customer email, or name…"
            className="pl-9"
          />
        </form>

        <Select value={status ?? ALL_STATUSES} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <Alert variant="destructive" className="max-w-xl">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Couldn't load orders</AlertTitle>
          <AlertDescription className="mt-1 flex flex-col items-start gap-3">
            <span>{error instanceof AdminApiError ? error.message : "Something went wrong."}</span>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : !data || data.orders.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
          No orders match your search.
        </div>
      ) : (
        <>
          <div className={`overflow-x-auto rounded-2xl border bg-card ${isFetching ? "opacity-60" : ""}`}>
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>CJ</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>
                      <p className="max-w-[220px] truncate">
                        {order.customerName || order.customerEmail}
                      </p>
                      {order.customerName && (
                        <p className="max-w-[220px] truncate text-xs text-muted-foreground">
                          {order.customerEmail}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ORDER_STATUS_VARIANT[order.status]} className="capitalize">
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {order.cjOrderId ? (
                        <div className="flex flex-col gap-0.5">
                          <span>{order.cjOrderStatus ?? "Pushed"}</span>
                          {order.cjTrackingNumber && <span>Tracking: {order.cjTrackingNumber}</span>}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {displayPrice(order.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/admin/orders/$id" params={{ id: order.id }}>
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {data.pagination.totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.totalPages} ·{" "}
                {data.pagination.total} order{data.pagination.total === 1 ? "" : "s"}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

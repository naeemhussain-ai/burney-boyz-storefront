// Sprint 9 / Step 23 - Analytics & Reports. Reuses the dashboard's stat-card
// / list-item layout (admin.index.tsx) and the shadcn recharts wrapper
// (components/ui/chart.tsx) already used elsewhere in the project.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Download, DollarSign, Loader2, ShoppingBag, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import {
  fetchAnalyticsOverview,
  fetchDailyRevenue,
  fetchMonthlyRevenue,
  fetchBestSellers,
  fetchTopCategories,
  fetchTopCustomers,
  downloadOrdersExport,
  AnalyticsApiError,
} from "@/api/analytics";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { displayPrice } from "@/lib/utils";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics - Admin - Burney Boyz" }] }),
  component: AdminAnalyticsPage,
});

const RANGE_OPTIONS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
] as const;

function rangeToFrom(days: number): string {
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return from.toISOString().slice(0, 10);
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold md:text-3xl">{value}</p>
    </div>
  );
}

// Not hsl(var(--primary)) - --primary is defined as an oklch() color (see
// styles.css), and wrapping an already-complete color function in hsl(...)
// produces invalid CSS. That silently fell back to SVG's default fill/stroke
// (black), which is why the bars/area rendered solid black instead of the
// brand orange.
const revenueChartConfig = {
  revenue: { label: "Revenue", color: "var(--primary)" },
} satisfies ChartConfig;

function AdminAnalyticsPage() {
  const [rangeDays, setRangeDays] = useState<number>(30);
  const from = rangeToFrom(rangeDays);

  const overviewQuery = useQuery({
    queryKey: ["admin", "analytics", "overview", from],
    queryFn: () => fetchAnalyticsOverview({ from }),
  });

  const dailyRevenueQuery = useQuery({
    queryKey: ["admin", "analytics", "revenue", "daily", rangeDays],
    queryFn: () => fetchDailyRevenue(rangeDays),
  });

  const monthlyRevenueQuery = useQuery({
    queryKey: ["admin", "analytics", "revenue", "monthly"],
    queryFn: () => fetchMonthlyRevenue(12),
  });

  const bestSellersQuery = useQuery({
    queryKey: ["admin", "analytics", "best-sellers", from],
    queryFn: () => fetchBestSellers({ from, limit: 8 }),
  });

  const topCategoriesQuery = useQuery({
    queryKey: ["admin", "analytics", "top-categories", from],
    queryFn: () => fetchTopCategories({ from, limit: 8 }),
  });

  const topCustomersQuery = useQuery({
    queryKey: ["admin", "analytics", "top-customers", from],
    queryFn: () => fetchTopCustomers({ from, limit: 8 }),
  });

  const overview = overviewQuery.data;

  const exportMutation = useMutation({
    mutationFn: (format: "csv" | "xlsx") => downloadOrdersExport(format, { from }),
    onError: (err) => {
      toast.error(err instanceof AnalyticsApiError ? err.message : "Couldn't export the report.");
    },
  });

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Analytics & Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Revenue, orders, and top performers - export the underlying order data as CSV or Excel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border bg-card p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                type="button"
                onClick={() => setRangeDays(opt.days)}
                className={
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors " +
                  (rangeDays === opt.days
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            disabled={exportMutation.isPending}
            onClick={() => exportMutation.mutate("csv")}
          >
            {exportMutation.isPending && exportMutation.variables === "csv" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            CSV
          </Button>
          <Button
            variant="outline"
            disabled={exportMutation.isPending}
            onClick={() => exportMutation.mutate("xlsx")}
          >
            {exportMutation.isPending && exportMutation.variables === "xlsx" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Excel
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
          <AlertTitle>Couldn't load analytics overview</AlertTitle>
          <AlertDescription>
            {overviewQuery.error instanceof AnalyticsApiError
              ? overviewQuery.error.message
              : "Something went wrong."}
          </AlertDescription>
        </Alert>
      ) : overview ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Revenue" value={displayPrice(overview.revenue)} icon={DollarSign} />
          <StatCard label="Orders" value={String(overview.totalOrders)} icon={ShoppingBag} />
          <StatCard
            label="Avg. Order Value"
            value={displayPrice(overview.averageOrderValue)}
            icon={TrendingUp}
          />
          <StatCard label="Customers" value={String(overview.customersCount)} icon={Users} />
        </div>
      ) : null}

      {/* Daily revenue chart */}
      <div className="mt-8 rounded-2xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-bold">Daily Revenue</h2>
        {dailyRevenueQuery.isLoading ? (
          <Skeleton className="aspect-video w-full rounded-xl" />
        ) : !dailyRevenueQuery.data || dailyRevenueQuery.data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No revenue in this range yet.</p>
        ) : (
          <ChartContainer config={revenueChartConfig} className="w-full">
            <AreaChart data={dailyRevenueQuery.data}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value: string) => value.slice(5)}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={48} />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <Area
                dataKey="revenue"
                type="monotone"
                fill="var(--color-revenue)"
                fillOpacity={0.15}
                stroke="var(--color-revenue)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>

      {/* Monthly revenue chart */}
      <div className="mt-6 rounded-2xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-bold">Monthly Revenue (last 12 months)</h2>
        {monthlyRevenueQuery.isLoading ? (
          <Skeleton className="aspect-video w-full rounded-xl" />
        ) : !monthlyRevenueQuery.data || monthlyRevenueQuery.data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No revenue yet.</p>
        ) : (
          <ChartContainer config={revenueChartConfig} className="w-full">
            <BarChart data={monthlyRevenueQuery.data}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={48} />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Best Sellers */}
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-bold">Best Selling Products</h2>
          {bestSellersQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : !bestSellersQuery.data || bestSellersQuery.data.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No sales in this range yet.</p>
          ) : (
            <ul className="divide-y">
              {bestSellersQuery.data.map((p) => (
                <li key={p.productId ?? p.name} className="flex items-center gap-3 py-3 text-sm">
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
                    <p className="text-xs text-muted-foreground">{p.quantitySold} sold</p>
                  </div>
                  <span className="flex-none font-semibold">{displayPrice(p.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top Categories */}
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-bold">Top Categories</h2>
          {topCategoriesQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : !topCategoriesQuery.data || topCategoriesQuery.data.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No sales in this range yet.</p>
          ) : (
            <ul className="divide-y">
              {topCategoriesQuery.data.map((c) => (
                <li key={c.category} className="flex items-center gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.category}</p>
                    <p className="text-xs text-muted-foreground">{c.quantitySold} sold</p>
                  </div>
                  <span className="flex-none font-semibold">{displayPrice(c.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top Customers */}
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-bold">Top Customers</h2>
          {topCustomersQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : !topCustomersQuery.data || topCustomersQuery.data.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No customers in this range yet.</p>
          ) : (
            <ul className="divide-y">
              {topCustomersQuery.data.map((c) => (
                <li key={c.email} className="flex items-center gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name || c.email}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.name ? c.email : `${c.ordersCount} order${c.ordersCount === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <div className="flex-none text-right">
                    <p className="font-semibold">{displayPrice(c.totalSpent)}</p>
                    {c.name ? (
                      <Badge variant="outline" className="mt-0.5">
                        {c.ordersCount} order{c.ordersCount === 1 ? "" : "s"}
                      </Badge>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

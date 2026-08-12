import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { fetchAdminReviews, setAdminReviewStatus, AdminReview, AdminApiError } from "@/api/admin";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/reviews")({
  head: () => ({ meta: [{ title: "Admin - Reviews - Burney Boyz" }] }),
  component: AdminReviewsPage,
});

function displayDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "reviews", "pending"],
    queryFn: () => fetchAdminReviews({ status: "pending", page: 1, limit: 50 }),
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) => setAdminReviewStatus(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
      toast.success("Review updated");
      await refetch();
    },
    onError: (err) => {
      toast.error(err instanceof AdminApiError ? err.message : "Failed to update review status");
    },
  });

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Review Moderation</h1>
          <p className="mt-1 text-sm text-muted-foreground">Approve or reject pending product reviews submitted by customers.</p>
        </div>
      </div>

      {isLoading ? (
        <div>Loading…</div>
      ) : isError ? (
        <div className="text-destructive">{error instanceof AdminApiError ? error.message : "Failed to load reviews"}</div>
      ) : !data || data.reviews.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">No pending reviews.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Body</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.reviews.map((r: AdminReview) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-xs">
                    <div className="font-medium">{r.productName ?? "Unknown product"}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.user ? [r.user.firstName, r.user.lastName].filter(Boolean).join(" ") || r.user.email : "guest"}
                    </div>
                  </TableCell>
                  <TableCell>{r.rating}</TableCell>
                  <TableCell className="max-w-xs">{r.title ?? "-"}</TableCell>
                  <TableCell className="max-w-xs line-clamp-2">{r.body ?? "-"}</TableCell>
                  <TableCell>{displayDate(r.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "pending" ? "secondary" : "default"}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => mutation.mutate({ id: r.id, status: "approved" })}>
                        <Check className="h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => mutation.mutate({ id: r.id, status: "rejected" })}>
                        <X className="h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

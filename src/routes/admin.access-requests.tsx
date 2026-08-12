// Sprint 10 / Step 26 - Admin Access Requests. The storefront has no
// customer accounts; every /register submission lands here for an existing
// admin to approve or decline. Same table/mutation pattern as the other
// admin list pages (admin.orders.tsx, admin.inventory.tsx).
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import {
  fetchAdminAccessRequests,
  approveAdminAccessRequest,
  declineAdminAccessRequest,
  AdminApiError,
  type AdminRequestStatus,
} from "@/api/admin";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/access-requests")({
  head: () => ({ meta: [{ title: "Access Requests - Admin - Burney Boyz" }] }),
  component: AdminAccessRequestsPage,
});

const STATUS_OPTIONS: { value: AdminRequestStatus | "all"; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
  { value: "all", label: "All" },
];

function AdminAccessRequestsPage() {
  const [status, setStatus] = useState<AdminRequestStatus | "all">("pending");
  const queryClient = useQueryClient();

  const { data: requests, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "access-requests", status],
    queryFn: () => fetchAdminAccessRequests(status),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "access-requests"] });

  const approveMutation = useMutation({
    mutationFn: approveAdminAccessRequest,
    onSuccess: (updated) => {
      invalidate();
      toast.success(`${updated.email} now has admin access`);
    },
    onError: (err) => {
      toast.error(err instanceof AdminApiError ? err.message : "Couldn't approve this request.");
    },
  });

  const declineMutation = useMutation({
    mutationFn: declineAdminAccessRequest,
    onSuccess: (updated) => {
      invalidate();
      toast.success(`Declined ${updated.email}'s request`);
    },
    onError: (err) => {
      toast.error(err instanceof AdminApiError ? err.message : "Couldn't decline this request.");
    },
  });

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Access Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Anyone who registers is requesting admin access - approve or decline them here.
          </p>
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as AdminRequestStatus | "all")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Couldn't load access requests</AlertTitle>
          <AlertDescription className="mt-1 flex flex-col items-start gap-3">
            <span>{error instanceof AdminApiError ? error.message : "Something went wrong."}</span>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : !requests || requests.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
          No {status === "all" ? "" : status} requests.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => {
                const busy =
                  (approveMutation.isPending && approveMutation.variables === r.id) ||
                  (declineMutation.isPending && declineMutation.variables === r.id);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {[r.firstName, r.lastName].filter(Boolean).join(" ") || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.adminRequestedAt
                        ? new Date(r.adminRequestedAt).toLocaleDateString()
                        : new Date(r.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.adminRequestStatus === "approved"
                            ? "default"
                            : r.adminRequestStatus === "declined"
                              ? "destructive"
                              : "secondary"
                        }
                        className="capitalize"
                      >
                        {r.adminRequestStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.adminRequestStatus === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => declineMutation.mutate(r.id)}
                          >
                            {declineMutation.isPending && declineMutation.variables === r.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <X className="h-3.5 w-3.5" />
                            )}
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => approveMutation.mutate(r.id)}
                          >
                            {approveMutation.isPending && approveMutation.variables === r.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            Approve
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {r.adminDecidedAt ? new Date(r.adminDecidedAt).toLocaleDateString() : "-"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

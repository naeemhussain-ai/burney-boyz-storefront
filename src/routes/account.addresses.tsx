import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, MapPinned, Pencil, Plus, Star, Trash2 } from "lucide-react";
import {
  listAddresses,
  deleteAddress,
  setDefaultAddress,
  AuthApiError,
  type Address,
} from "@/api/auth";
import { AddressFormDialog } from "@/components/account/AddressFormDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/account/addresses")({
  head: () => ({ meta: [{ title: "Addresses - My Account - Burney Boyz" }] }),
  component: AddressesPage,
});

function AddressesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [deleting, setDeleting] = useState<Address | null>(null);

  const {
    data: addresses,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({ queryKey: ["account", "addresses"], queryFn: listAddresses });

  const deleteMutation = useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", "addresses"] });
      toast.success("Address removed");
      setDeleting(null);
    },
    onError: (err) => {
      toast.error(err instanceof AuthApiError ? err.message : "Couldn't remove this address.");
    },
  });

  const defaultMutation = useMutation({
    mutationFn: setDefaultAddress,
    onSuccess: (updated) => {
      queryClient.setQueryData(["account", "addresses"], updated);
      toast.success("Default address updated");
    },
    onError: (err) => {
      toast.error(
        err instanceof AuthApiError ? err.message : "Couldn't update the default address.",
      );
    },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Addresses</h2>
        <Button size="sm" className="rounded-full" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> Add Address
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Couldn't load your addresses</AlertTitle>
          <AlertDescription className="mt-1 flex flex-col items-start gap-3">
            <span>{error instanceof AuthApiError ? error.message : "Something went wrong."}</span>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => refetch()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : !addresses || addresses.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-16 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-muted">
            <MapPinned className="h-9 w-9 text-muted-foreground/50" />
          </div>
          <div>
            <p className="font-semibold">No addresses saved</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add an address to speed up checkout next time.
            </p>
          </div>
          <Button className="rounded-full" onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> Add Address
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <div key={address.id} className="rounded-2xl border bg-card p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{address.label || "Address"}</p>
                  {address.isDefault && <Badge variant="outline">Default</Badge>}
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {address.fullName}
                <br />
                {address.addressLine1}
                {address.addressLine2 ? `, ${address.addressLine2}` : ""}
                <br />
                {address.city}, {address.state} {address.postalCode}
                <br />
                {address.country}
                {address.phone ? (
                  <>
                    <br />
                    {address.phone}
                  </>
                ) : null}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(address)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                {!address.isDefault && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={defaultMutation.isPending}
                    onClick={() => defaultMutation.mutate(address.id)}
                  >
                    <Star className="h-3.5 w-3.5" /> Set Default
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleting(address)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddressFormDialog address={editing} onClose={() => setEditing(null)} />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this address?</AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone. "{deleting?.label || deleting?.fullName}" will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleting) deleteMutation.mutate(deleting.id);
              }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

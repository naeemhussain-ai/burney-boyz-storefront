import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createAddress,
  updateAddress,
  AuthApiError,
  type Address,
  type AddressInput,
} from "@/api/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Same country list as checkout.tsx's AddressFields - kept local since that
// component isn't exported and this dialog has its own (label + optional
// phone) fields.
const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Pakistan",
  "India",
  "United Arab Emirates",
  "Germany",
  "France",
  "Netherlands",
];

const emptyForm: AddressInput = {
  label: "",
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  country: "",
  state: "",
  city: "",
  postalCode: "",
};

function AddressForm({ address, onClose }: { address: Address | "new"; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AddressInput>(
    address === "new"
      ? emptyForm
      : {
          label: address.label ?? "",
          fullName: address.fullName,
          phone: address.phone ?? "",
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2 ?? "",
          country: address.country,
          state: address.state,
          city: address.city,
          postalCode: address.postalCode,
        },
  );
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof AddressInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => (address === "new" ? createAddress(form) : updateAddress(address.id, form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", "addresses"] });
      toast.success(address === "new" ? "Address added" : "Address updated");
      onClose();
    },
    onError: (err) => {
      setError(err instanceof AuthApiError ? err.message : "Couldn't save this address.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="label">Label (optional)</Label>
        <Input
          id="label"
          placeholder="Home, Work, etc."
          value={form.label ?? ""}
          onChange={set("label")}
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" value={form.fullName} onChange={set("fullName")} className="mt-1.5" />
      </div>

      <div>
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input id="phone" value={form.phone ?? ""} onChange={set("phone")} className="mt-1.5" />
      </div>

      <div>
        <Label htmlFor="addressLine1">Address</Label>
        <Input
          id="addressLine1"
          placeholder="Street address"
          value={form.addressLine1}
          onChange={set("addressLine1")}
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="addressLine2">Apartment, suite, etc. (optional)</Label>
        <Input
          id="addressLine2"
          value={form.addressLine2 ?? ""}
          onChange={set("addressLine2")}
          className="mt-1.5"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="country">Country</Label>
          <Select
            value={form.country}
            onValueChange={(v) => setForm((f) => ({ ...f, country: v }))}
          >
            <SelectTrigger id="country" className="mt-1.5">
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="state">State / Province</Label>
          <Input id="state" value={form.state} onChange={set("state")} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" value={form.city} onChange={set("city")} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="postalCode">Postal code</Label>
          <Input
            id="postalCode"
            value={form.postalCode}
            onChange={set("postalCode")}
            className="mt-1.5"
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save Address"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AddressFormDialog({
  address,
  onClose,
}: {
  address: Address | "new" | null;
  onClose: () => void;
}) {
  // Reset any stale form state whenever a fresh address/"new" is opened.
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (address !== null) setKey((k) => k + 1);
  }, [address]);

  return (
    <Dialog open={address !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{address === "new" ? "Add address" : "Edit address"}</DialogTitle>
          <DialogDescription>Used for shipping and billing at checkout.</DialogDescription>
        </DialogHeader>
        {address && <AddressForm key={key} address={address} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

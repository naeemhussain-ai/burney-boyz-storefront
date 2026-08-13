import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  type AdminProduct,
  type AdminProductStatus,
  type AdminProductUpdateInput,
  AdminApiError,
  updateAdminProduct,
} from "@/api/admin";
import { PricingEngine, type PricingEngineState } from "@/components/admin/PricingEngine";
import { ProductDetailsPanel } from "@/components/admin/ProductDetailsPanel";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function EditProductForm({ product, onClose }: { product: AdminProduct; onClose: () => void }) {
  const queryClient = useQueryClient();

  const [pricing, setPricing] = useState<PricingEngineState | null>(null);
  const [featured, setFeatured] = useState(product.featured);
  const [newArrival, setNewArrival] = useState(product.newArrival);
  const [status, setStatus] = useState<AdminProductStatus>(product.status);
  const [shortDescription, setShortDescription] = useState(product.shortDescription ?? "");
  const [description, setDescription] = useState(product.description ?? "");
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (patch: AdminProductUpdateInput) => updateAdminProduct(product.id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("Product updated", { description: product.name });
      onClose();
    },
    onError: (err) => {
      setFormError(err instanceof AdminApiError ? err.message : "Failed to update product.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!pricing || !pricing.valid) {
      setFormError(pricing?.error || "Fix the pricing fields before saving.");
      return;
    }

    mutation.mutate({
      myPrice: pricing.values.sellingPrice,
      comparePrice: pricing.values.comparePrice,
      shippingCost: pricing.values.shippingCost,
      featured,
      newArrival,
      status,
      shortDescription: shortDescription.trim() || null,
      description: description.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ProductDetailsPanel product={product} />

      <PricingEngine
        costPrice={Number(product.price) || 0}
        initial={{
          shippingCost: Number(product.shippingCost) || 0,
          sellingPrice: Number(product.myPrice) || 0,
          comparePrice:
            product.comparePrice !== null && product.comparePrice !== undefined
              ? Number(product.comparePrice)
              : null,
        }}
        onChange={setPricing}
      />

      <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
        <Label htmlFor="featured" className="cursor-pointer">
          Featured
        </Label>
        <Switch id="featured" checked={featured} onCheckedChange={setFeatured} />
      </div>

      <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
        <Label htmlFor="newArrival" className="cursor-pointer">
          New Arrival
        </Label>
        <Switch id="newArrival" checked={newArrival} onCheckedChange={setNewArrival} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="status">Status</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as AdminProductStatus)}>
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="shortDescription">Short Description</Label>
        <Input
          id="shortDescription"
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          placeholder="Shown on ShopNow product cards"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
        />
      </div>

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending || !pricing?.valid}>
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function EditProductDialog({
  product,
  onClose,
}: {
  product: AdminProduct | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={product !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit product</DialogTitle>
          <DialogDescription className="line-clamp-1">{product?.name}</DialogDescription>
        </DialogHeader>
        {/* Keyed by product id so switching products resets local form state */}
        {product && <EditProductForm key={product.id} product={product} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

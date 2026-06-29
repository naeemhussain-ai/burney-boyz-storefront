import { Link } from "@tanstack/react-router";
import { Star, Eye, Plus } from "lucide-react";
import type { Product } from "@/data/products";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

export function ProductCard({ product }: { product: Product }) {
  const { addItem, openCart } = useCart();

  const handleAdd = () => {
    addItem(product, 1);
    toast.success("Added to cart", { description: product.name });
    openCart();
  };

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-card transition hover:-translate-y-0.5 hover:shadow-soft">
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="relative block aspect-square overflow-hidden bg-muted"
      >
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        {product.compareAtPrice && (
          <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
            Sale
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
          <span className="font-medium text-foreground">{product.rating}</span>
          <span>({product.reviewCount})</span>
        </div>
        <Link
          to="/product/$id"
          params={{ id: product.id }}
          className="line-clamp-2 text-sm font-medium hover:text-primary"
        >
          {product.name}
        </Link>
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="text-lg font-bold">${product.price.toFixed(2)}</span>
          {product.compareAtPrice && (
            <span className="text-sm text-muted-foreground line-through">
              ${product.compareAtPrice.toFixed(2)}
            </span>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={handleAdd} size="sm" className="flex-1">
            <Plus className="h-4 w-4" /> Add to Cart
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/product/$id" params={{ id: product.id }} aria-label="View product">
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

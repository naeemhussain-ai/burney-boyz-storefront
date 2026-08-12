import { Link } from "@tanstack/react-router";
import { Star, ShoppingCart, Eye } from "lucide-react";
import type { Product } from "@/data/products";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

export function ProductCard({ product }: { product: Product }) {
  const { addItem, openCart } = useCart();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product, 1);
    toast.success("Added to cart!", { description: product.name });
    openCart();
  };

  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : null;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
      {/* Image */}
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="relative block aspect-square overflow-hidden bg-muted"
      >
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-108"
        />

        {/* Badges */}
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
          {discount && (
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
              -{discount}%
            </span>
          )}
          {product.trending && !discount && (
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold text-secondary-foreground shadow-sm">
              Trending
            </span>
          )}
        </div>

        {/* Quick view overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-foreground shadow-lg">
            <Eye className="h-3.5 w-3.5" /> Quick View
          </span>
        </div>
      </Link>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Rating */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${i < Math.round(product.rating) ? "fill-primary text-primary" : "fill-muted text-muted"}`}
              />
            ))}
          </div>
          <span className="font-semibold text-foreground">{product.rating}</span>
          <span>({product.reviewCount})</span>
        </div>

        {/* Name */}
        <Link
          to="/product/$id"
          params={{ id: product.id }}
          className="line-clamp-2 text-sm font-semibold leading-snug hover:text-primary"
        >
          {product.name}
        </Link>

        {/* Price */}
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="text-lg font-extrabold text-foreground">${product.price.toFixed(2)}</span>
          {product.compareAtPrice && (
            <span className="text-sm text-muted-foreground line-through">
              ${product.compareAtPrice.toFixed(2)}
            </span>
          )}
        </div>

        {/* CTA */}
        <Button
          onClick={handleAdd}
          size="sm"
          className="mt-2 w-full gap-2 rounded-xl font-semibold"
        >
          <ShoppingCart className="h-4 w-4" /> Add to Cart
        </Button>
      </div>
    </article>
  );
}

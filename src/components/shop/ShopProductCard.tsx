import { Link } from "@tanstack/react-router";
import { Star, ShoppingCart, Eye, Heart } from "lucide-react";
import type { ShopProductSummary } from "@/api/shop";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

// Same card as components/shop/ProductCard.tsx (identical layout/classes),
// wired to real catalog data instead of the static demo products. Kept as a
// separate component so the homepage and category pages - still on static
// data - are completely unaffected.

export function ShopProductCard({ product }: { product: ShopProductSummary }) {
  const { addItem, openCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { isWishlisted, toggle } = useWishlist();

  const price = Number(product.myPrice) || 0;
  const comparePrice = product.comparePrice ? Number(product.comparePrice) : null;
  const rating = Number(product.avgRating) || 0;
  const reviewCount = product.reviewCount ?? 0;
  const wishlisted = isWishlisted(product.id);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({ id: product.id, name: product.name, price, image: product.image ?? "" }, 1);
    toast.success("Added to cart!", { description: product.name });
    openCart();
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Sign in to save items to your wishlist");
      return;
    }
    toggle(product.id);
    toast.success(wishlisted ? "Removed from wishlist" : "Added to wishlist", {
      description: product.name,
    });
  };

  const discount =
    comparePrice && comparePrice > price
      ? Math.round(((comparePrice - price) / comparePrice) * 100)
      : null;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
      {/* Image */}
      <Link
        to="/shop/$slug"
        params={{ slug: product.slug }}
        className="relative block aspect-square overflow-hidden bg-muted"
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-108"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
            No image available
          </div>
        )}

        {/* Badges */}
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
          {product.featured && (
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold text-secondary-foreground shadow-sm">
              Trending
            </span>
          )}
        </div>

        {/* Wishlist toggle */}
        <button
          onClick={handleToggleWishlist}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wishlisted}
          className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-sm transition hover:bg-white"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              wishlisted ? "fill-primary text-primary" : "text-muted-foreground"
            }`}
          />
        </button>

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
        {reviewCount > 0 ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${i < Math.round(rating) ? "fill-primary text-primary" : "fill-muted text-muted"}`}
                />
              ))}
            </div>
            <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
            <span>({reviewCount})</span>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No reviews yet</div>
        )}

        {/* Name */}
        <Link
          to="/shop/$slug"
          params={{ slug: product.slug }}
          className="line-clamp-2 text-sm font-semibold leading-snug hover:text-primary"
        >
          {product.name}
        </Link>

        {/* Price */}
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="text-lg font-extrabold text-foreground">${price.toFixed(2)}</span>
          {comparePrice && (
            <span className="text-sm text-muted-foreground line-through">
              ${comparePrice.toFixed(2)}
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

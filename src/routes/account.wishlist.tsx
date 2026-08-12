import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/wishlist";
import { ShopProductCard } from "@/components/shop/ShopProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/account/wishlist")({
  head: () => ({ meta: [{ title: "Wishlist - My Account - Burney Boyz" }] }),
  component: WishlistPage,
});

function WishlistPage() {
  const { items, isLoading } = useWishlist();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4.5] w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-16 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-primary-soft">
          <Heart className="h-9 w-9 text-primary" />
        </div>
        <div>
          <p className="font-semibold">Your wishlist is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap the heart on any product to save it here for later.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/shop">Browse Shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        {items.length} item{items.length === 1 ? "" : "s"} saved
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ShopProductCard key={item.id} product={item.product} />
        ))}
      </div>
    </div>
  );
}

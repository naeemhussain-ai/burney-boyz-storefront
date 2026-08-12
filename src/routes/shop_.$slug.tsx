import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Star,
  Minus,
  Plus,
  Truck,
  ShieldCheck,
  RefreshCw,
  Heart,
  Share2,
  BadgePercent,
  Package,
} from "lucide-react";
import {
  fetchShopProductBySlug,
  fetchShopProducts,
  ShopApiError,
  type ShopProductDetail,
} from "@/api/shop";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShopProductCard } from "@/components/shop/ShopProductCard";
import { ProductReviews } from "@/components/shop/ProductReviews";
import { RecentlyViewed } from "@/components/shop/RecentlyViewed";
import { recordProductView } from "@/lib/recentlyViewed";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { useAuth } from "@/lib/auth";
import { stripHtml } from "@/lib/utils";
import { toast } from "sonner";

// Real-catalog counterpart of /product/$id (which stays on static demo data
// for the homepage/category pages). Same page design, ported to Neon data -
// kept at a separate path so those other pages are unaffected.
export const Route = createFileRoute("/shop_/$slug")({
  // Product detail data doesn't change second-to-second - avoid refetching
  // on every re-visit within this window (e.g. back button from cart).
  staleTime: 60_000,
  loader: async ({ params }) => {
    let product: ShopProductDetail;
    try {
      product = await fetchShopProductBySlug(params.slug);
    } catch (err) {
      if (err instanceof ShopApiError && err.status === 404) throw notFound();
      throw err;
    }

    const related = product.categoryId
      ? (await fetchShopProducts({ category: product.categoryId, limit: 5 })).filter(
          (p) => p.id !== product.id,
        )
      : [];

    return { product, related: related.slice(0, 4) };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.product.name} - Burney Boyz` },
      { name: "description", content: loaderData?.product.shortDescription ?? undefined },
      { property: "og:title", content: loaderData?.product.name },
      { property: "og:image", content: loaderData?.product.image ?? undefined },
      { property: "og:type", content: "product" },
      { property: "og:url", content: `/shop/${loaderData?.product.slug}` },
    ],
    links: [{ rel: "canonical", href: `/shop/${loaderData?.product.slug}` }],
  }),
  component: ShopProductDetailPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl">😕</p>
      <h1 className="mt-4 text-3xl font-bold">Product not found</h1>
      <p className="mt-2 text-muted-foreground">
        This product may have been removed or doesn't exist.
      </p>
      <Button asChild className="mt-6 rounded-full">
        <Link to="/shop">Back to shop</Link>
      </Button>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-12 text-center text-muted-foreground">{error.message}</div>
  ),
});

function ShopProductDetailPage() {
  const { product, related } = Route.useLoaderData();
  const [activeImg, setActiveImg] = useState(product.image ?? "");
  const [qty, setQty] = useState(1);
  const [variantId, setVariantId] = useState<string | undefined>(product.variants[0]?.id);
  const { addItem, openCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { isWishlisted, toggle } = useWishlist();
  const wishlisted = isWishlisted(product.id);

  const selectedVariant = product.variants.find((v) => v.id === variantId);

  const price = Number(product.myPrice) || 0;
  const comparePrice = product.comparePrice ? Number(product.comparePrice) : null;
  const discount =
    comparePrice && comparePrice > price
      ? Math.round(((comparePrice - price) / comparePrice) * 100)
      : null;

  const gallery = product.images?.length ? product.images : product.image ? [product.image] : [];
  // No product-level stock signal exists - only treat it as out of stock
  // when every variant explicitly reports zero.
  const outOfStock =
    product.variants.length > 0 && product.variants.every((v) => v.stock !== null && v.stock <= 0);

  const description = stripHtml(product.description);
  const avgRating = Number(product.avgRating) || 0;
  const reviewCount = product.reviewCount ?? 0;

  useEffect(() => {
    recordProductView({
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      myPrice: product.myPrice,
    });
  }, [product.id, product.slug, product.name, product.image, product.myPrice]);

  const handleAdd = (buyNow = false) => {
    addItem(
      { id: product.id, name: product.name, price, image: product.image ?? "" },
      qty,
      variantId,
    );
    toast.success("Added to cart!", { description: `${qty}× ${product.name}` });
    if (buyNow) openCart();
  };

  const handleToggleWishlist = () => {
    if (!isAuthenticated) {
      toast.error("Sign in to save items to your wishlist");
      return;
    }
    toggle(product.id);
    toast.success(wishlisted ? "Removed from wishlist" : "Added to wishlist", {
      description: product.name,
    });
  };

  const handleShare = () => {
    navigator.share?.({ title: product.name, url: window.location.href }).catch(() => {
      navigator.clipboard?.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    });
  };

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/shop" className="hover:text-primary">
            Shop
          </Link>
          <span>/</span>
          <span className="truncate font-medium text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-12 lg:grid-cols-2">
          {/* Images */}
          <div>
            <div className="relative overflow-hidden rounded-3xl border bg-muted">
              {activeImg ? (
                <img
                  src={activeImg}
                  alt={product.name}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="grid aspect-square w-full place-items-center text-sm text-muted-foreground">
                  No image available
                </div>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {gallery.map((img) => (
                  <button
                    key={img}
                    onClick={() => setActiveImg(img)}
                    className={`overflow-hidden rounded-xl border-2 transition ${
                      activeImg === img
                        ? "border-primary shadow-glow"
                        : "border-transparent hover:border-border"
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="aspect-square w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            {/* Category */}
            {product.categoryName && (
              <Link
                to="/shop"
                search={product.categoryId ? { cat: product.categoryId } : {}}
                className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary hover:underline"
              >
                {product.categoryName}
              </Link>
            )}

            <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
              {product.name}
            </h1>

            {/* Rating */}
            {reviewCount > 0 ? (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.round(avgRating)
                          ? "fill-primary text-primary"
                          : "fill-muted text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold">{avgRating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({reviewCount} reviews)</span>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No reviews yet</p>
            )}

            {/* Price */}
            <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-3xl font-extrabold sm:text-4xl">${price.toFixed(2)}</span>
              {comparePrice && comparePrice > price && (
                <>
                  <span className="text-lg text-muted-foreground line-through sm:text-xl">
                    ${comparePrice.toFixed(2)}
                  </span>
                  <span className="rounded-full bg-green-100 px-3 py-0.5 text-sm font-bold text-green-700">
                    Save ${(comparePrice - price).toFixed(2)}
                  </span>
                </>
              )}
            </div>

            {/* In stock */}
            <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
              <Package className="h-4 w-4" />
              {outOfStock ? "Out of stock" : "In stock - ships within 1–2 business days"}
            </div>

            <p className="mt-5 leading-relaxed text-muted-foreground">
              {description || "No description available."}
            </p>

            {/* Variants */}
            {product.variants.length > 0 && (
              <div className="mt-6">
                <p className="mb-2.5 text-sm font-semibold">
                  Option:{" "}
                  <span className="font-normal text-muted-foreground">
                    {selectedVariant?.name ??
                      [selectedVariant?.option1, selectedVariant?.option2, selectedVariant?.option3]
                        .filter(Boolean)
                        .join(" · ")}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => {
                    const label =
                      [v.option1, v.option2, v.option3].filter(Boolean).join(" · ") ||
                      v.name ||
                      "Option";
                    return (
                      <button
                        key={v.id}
                        onClick={() => setVariantId(v.id)}
                        className={`rounded-full border-2 px-4 py-1.5 text-sm font-medium transition ${
                          variantId === v.id
                            ? "border-primary bg-primary-soft text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity + CTA */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <div className="flex items-center overflow-hidden rounded-full border">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="grid h-11 w-11 place-items-center hover:bg-muted transition"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-sm font-bold">{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="grid h-11 w-11 place-items-center hover:bg-muted transition"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <Button
                onClick={() => handleAdd(false)}
                size="lg"
                className="flex-1 min-w-[140px] rounded-full font-semibold"
                disabled={outOfStock}
              >
                {outOfStock ? "Out of Stock" : "Add to Cart"}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 flex-shrink-0 rounded-full"
                onClick={handleToggleWishlist}
                aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                aria-pressed={wishlisted}
              >
                <Heart className={`h-4 w-4 ${wishlisted ? "fill-primary text-primary" : ""}`} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 flex-shrink-0 rounded-full"
                onClick={handleShare}
                aria-label="Share"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>

            <Button
              onClick={() => handleAdd(true)}
              variant="outline"
              size="lg"
              className="mt-3 w-full rounded-full font-semibold"
              disabled={outOfStock}
            >
              Buy Now
            </Button>

            {/* Trust badges */}
            <div className="mt-7 grid grid-cols-3 gap-3 rounded-2xl border bg-muted/30 p-4">
              <div className="flex flex-col items-center gap-1.5 text-center">
                <Truck className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">Free shipping $50+</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 text-center">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">Secure checkout</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 text-center">
                <RefreshCw className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">30-day returns</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="description" className="mt-16">
          <div className="overflow-x-auto">
            <TabsList className="rounded-full">
              <TabsTrigger value="description" className="rounded-full">
                Description
              </TabsTrigger>
              <TabsTrigger value="shipping" className="rounded-full">
                Shipping Info
              </TabsTrigger>
              <TabsTrigger value="reviews" className="rounded-full">
                Reviews ({reviewCount})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="description" className="mt-6">
            <div className="rounded-2xl border bg-card p-6 text-sm leading-relaxed text-muted-foreground space-y-4">
              <p>{description || "No description available."}</p>
              <p>
                Crafted to last and designed to impress - this product is part of our trending
                collection, hand-selected by the Burney Boyz team for quality, value, and style.
                Every item we carry goes through a vetting process before it makes it to the shop.
              </p>
              <ul className="list-inside list-disc space-y-1">
                <li>Premium materials and build quality</li>
                <li>Backed by our 30-day return guarantee</li>
                <li>Tracked worldwide shipping included</li>
                <li>Loved by thousands of customers globally</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="shipping" className="mt-6">
            <div className="rounded-2xl border bg-card p-6 space-y-4 text-sm">
              {[
                {
                  title: "Processing time",
                  desc: "Orders are processed within 1–2 business days after payment confirmation.",
                },
                {
                  title: "Delivery",
                  desc: "Standard delivery takes 5–10 business days internationally. Expedited options available at checkout.",
                },
                {
                  title: "Free shipping",
                  desc: "All orders over $50 qualify for free standard worldwide shipping.",
                },
                {
                  title: "Returns",
                  desc: "We offer a no-fuss 30-day return policy. Items must be unused and in original packaging.",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
              <p className="mt-2 text-muted-foreground">
                For full details, see our{" "}
                <Link to="/shipping-returns" className="font-medium text-primary hover:underline">
                  Shipping & Returns policy
                </Link>
                .
              </p>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <ProductReviews
              productId={product.id}
              fallbackAvgRating={avgRating}
              fallbackReviewCount={reviewCount}
            />
          </TabsContent>
        </Tabs>
      </section>

      {/* Related products */}
      {related.length > 0 && (
        <section className="border-t bg-muted/30 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-8 text-2xl font-bold md:text-3xl">You might also like</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {related.map((p) => (
                <ShopProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <RecentlyViewed excludeId={product.id} />
    </>
  );
}

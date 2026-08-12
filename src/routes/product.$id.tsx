import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useState } from "react";
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
import { getProductById, products, type Product } from "@/data/products";
import { categories } from "@/data/categories";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductCard } from "@/components/shop/ProductCard";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$id")({
  loader: ({ params }) => {
    const product = getProductById(params.id);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.product.name} - Burney Boyz` },
      { name: "description", content: loaderData?.product.description },
      { property: "og:title", content: loaderData?.product.name },
      { property: "og:description", content: loaderData?.product.description },
      { property: "og:image", content: loaderData?.product.image },
      { property: "og:type", content: "product" },
      { property: "og:url", content: `/product/${loaderData?.product.id}` },
    ],
    links: [{ rel: "canonical", href: `/product/${loaderData?.product.id}` }],
  }),
  component: ProductPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl">😕</p>
      <h1 className="mt-4 text-3xl font-bold">Product not found</h1>
      <p className="mt-2 text-muted-foreground">This product may have been removed or doesn't exist.</p>
      <Button asChild className="mt-6 rounded-full">
        <Link to="/shop">Back to shop</Link>
      </Button>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-12 text-center text-muted-foreground">{error.message}</div>
  ),
});

const mockReviews = [
  { name: "Sarah L.", rating: 5, text: "Exactly as described and arrived faster than expected. The quality is outstanding - you can really feel the difference compared to cheaper alternatives.", date: "2 days ago" },
  { name: "Mike R.", rating: 4, text: "Solid quality for the price. Would definitely buy again. Only minor issue was packaging was slightly dented but the product itself is perfect.", date: "1 week ago" },
  { name: "Anita V.", rating: 5, text: "Obsessed! Already ordered another one as a gift for my sister. She loved it. Shipping was super fast too!", date: "2 weeks ago" },
];

function ProductPage() {
  const { product } = Route.useLoaderData() as { product: Product };
  const [activeImg, setActiveImg] = useState(product.image);
  const [qty, setQty] = useState(1);
  const [variant, setVariant] = useState<string | undefined>(
    product.variants?.[0]?.options[0],
  );
  const { addItem, openCart } = useCart();

  const category = categories.find((c) => c.slug === product.category);
  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : null;

  const handleAdd = (buyNow = false) => {
    addItem(product, qty, variant);
    toast.success("Added to cart!", { description: `${qty}× ${product.name}` });
    if (buyNow) openCart();
  };

  const handleShare = () => {
    navigator.share?.({ title: product.name, url: window.location.href })
      .catch(() => {
        navigator.clipboard?.writeText(window.location.href);
        toast.success("Link copied to clipboard!");
      });
  };

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/shop" className="hover:text-primary">Shop</Link>
          {category && (
            <>
              <span>/</span>
              <Link to="/category/$slug" params={{ slug: category.slug }} className="hover:text-primary">
                {category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="truncate font-medium text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-12 lg:grid-cols-2">
          {/* Images */}
          <div>
            <div className="relative overflow-hidden rounded-3xl border bg-muted">
              <img
                src={activeImg}
                alt={product.name}
                className="aspect-square w-full object-cover"
              />
              {discount && (
                <div className="absolute left-4 top-4">
                  <Badge className="gap-1 rounded-full text-sm font-bold">
                    <BadgePercent className="h-3.5 w-3.5" /> {discount}% OFF
                  </Badge>
                </div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {product.images.map((img) => (
                  <button
                    key={img}
                    onClick={() => setActiveImg(img)}
                    className={`overflow-hidden rounded-xl border-2 transition ${
                      activeImg === img ? "border-primary shadow-glow" : "border-transparent hover:border-border"
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
            {category && (
              <Link
                to="/category/$slug"
                params={{ slug: category.slug }}
                className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary hover:underline"
              >
                {category.name}
              </Link>
            )}

            <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.round(product.rating) ? "fill-primary text-primary" : "fill-muted text-muted-foreground"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold">{product.rating}</span>
              <span className="text-sm text-muted-foreground">({product.reviewCount} reviews)</span>
            </div>

            {/* Price */}
            <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-3xl font-extrabold sm:text-4xl">${product.price.toFixed(2)}</span>
              {product.compareAtPrice && (
                <>
                  <span className="text-lg text-muted-foreground line-through sm:text-xl">
                    ${product.compareAtPrice.toFixed(2)}
                  </span>
                  <span className="rounded-full bg-green-100 px-3 py-0.5 text-sm font-bold text-green-700">
                    Save ${(product.compareAtPrice - product.price).toFixed(2)}
                  </span>
                </>
              )}
            </div>

            {/* In stock */}
            <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
              <Package className="h-4 w-4" />
              {product.inStock ? "In stock - ships within 1–2 business days" : "Out of stock"}
            </div>

            <p className="mt-5 leading-relaxed text-muted-foreground">{product.description}</p>

            {/* Variants */}
            {product.variants?.map((v) => (
              <div key={v.name} className="mt-6">
                <p className="mb-2.5 text-sm font-semibold">
                  {v.name}:{" "}
                  <span className="font-normal text-muted-foreground">{variant}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {v.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setVariant(opt)}
                      className={`rounded-full border-2 px-4 py-1.5 text-sm font-medium transition ${
                        variant === opt
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}

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
              >
                Add to Cart
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 flex-shrink-0 rounded-full"
                aria-label="Wishlist"
              >
                <Heart className="h-4 w-4" />
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
              <TabsTrigger value="description" className="rounded-full">Description</TabsTrigger>
              <TabsTrigger value="shipping" className="rounded-full">Shipping Info</TabsTrigger>
              <TabsTrigger value="reviews" className="rounded-full">
                Reviews ({product.reviewCount})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="description" className="mt-6">
            <div className="rounded-2xl border bg-card p-6 text-sm leading-relaxed text-muted-foreground space-y-4">
              <p>{product.description}</p>
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

          <TabsContent value="reviews" className="mt-6 space-y-4">
            {/* Summary */}
            <div className="rounded-2xl border bg-card p-6">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-5xl font-extrabold">{product.rating}</p>
                  <div className="mt-1 flex justify-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < Math.round(product.rating) ? "fill-primary text-primary" : "fill-muted text-muted-foreground"}`}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{product.reviewCount} reviews</p>
                </div>
                <div className="flex-1">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="mb-1 flex items-center gap-2 text-xs">
                      <span className="w-3 text-right">{star}</span>
                      <Star className="h-3 w-3 fill-primary text-primary" />
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${star === 5 ? 70 : star === 4 ? 20 : star === 3 ? 7 : 3}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Review cards */}
            {mockReviews.map((r) => (
              <div key={r.name} className="rounded-2xl border bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {r.name.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.date}</p>
                    </div>
                  </div>
                  <div className="flex">
                    {[...Array(r.rating)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
                    ))}
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{r.text}</p>
              </div>
            ))}
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
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

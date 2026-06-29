import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Star, Minus, Plus, Truck, ShieldCheck, RefreshCw } from "lucide-react";
import { getProductById, products } from "@/data/products";
import { categories } from "@/data/categories";
import { Button } from "@/components/ui/button";
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
      { title: `${loaderData?.product.name} — Burney Boyz` },
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
      <h1 className="text-3xl font-bold">Product not found</h1>
      <Button asChild className="mt-6"><Link to="/shop">Back to shop</Link></Button>
    </div>
  ),
  errorComponent: ({ error }) => <div className="p-12 text-center">{error.message}</div>,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const [activeImg, setActiveImg] = useState(product.image);
  const [qty, setQty] = useState(1);
  const [variant, setVariant] = useState<string | undefined>(
    product.variants?.[0]?.options[0],
  );
  const { addItem, openCart } = useCart();

  const category = categories.find((c) => c.slug === product.category);
  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  const handleAdd = (buyNow = false) => {
    addItem(product, qty, variant);
    toast.success("Added to cart", { description: product.name });
    if (buyNow) openCart();
  };

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <nav className="mb-6 text-xs text-muted-foreground">
          <Link to="/shop" className="hover:text-primary">Shop</Link>
          {category && (
            <>
              {" / "}
              <Link to="/category/$slug" params={{ slug: category.slug }} className="hover:text-primary">
                {category.name}
              </Link>
            </>
          )}
          {" / "}<span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <div className="overflow-hidden rounded-2xl border bg-muted">
              <img src={activeImg} alt={product.name} className="aspect-square w-full object-cover" />
            </div>
            {product.images.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {product.images.map((img) => (
                  <button
                    key={img}
                    onClick={() => setActiveImg(img)}
                    className={`overflow-hidden rounded-lg border-2 transition ${activeImg === img ? "border-primary" : "border-transparent"}`}
                  >
                    <img src={img} alt="" className="aspect-square w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h1 className="text-3xl font-bold md:text-4xl">{product.name}</h1>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < Math.round(product.rating) ? "fill-primary text-primary" : "text-muted"}`} />
                ))}
              </div>
              <span className="text-muted-foreground">
                {product.rating} ({product.reviewCount} reviews)
              </span>
            </div>

            <div className="mt-5 flex items-baseline gap-3">
              <span className="text-3xl font-bold">${product.price.toFixed(2)}</span>
              {product.compareAtPrice && (
                <span className="text-lg text-muted-foreground line-through">
                  ${product.compareAtPrice.toFixed(2)}
                </span>
              )}
            </div>

            <p className="mt-5 text-muted-foreground">{product.description}</p>

            {product.variants?.map((v) => (
              <div key={v.name} className="mt-6">
                <p className="mb-2 text-sm font-medium">{v.name}: <span className="text-muted-foreground">{variant}</span></p>
                <div className="flex flex-wrap gap-2">
                  {v.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setVariant(opt)}
                      className={`rounded-full border px-4 py-1.5 text-sm transition ${variant === opt ? "border-primary bg-primary-soft text-primary" : "hover:border-foreground"}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-6 flex items-center gap-4">
              <div className="flex items-center rounded-full border">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-10 w-10 place-items-center" aria-label="Decrease">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center font-medium">{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} className="grid h-10 w-10 place-items-center" aria-label="Increase">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <Button onClick={() => handleAdd(false)} size="lg" className="flex-1">Add to Cart</Button>
            </div>
            <Button onClick={() => handleAdd(true)} variant="outline" size="lg" className="mt-3 w-full">
              Buy Now
            </Button>

            <ul className="mt-6 grid gap-3 border-t pt-6 text-sm text-muted-foreground sm:grid-cols-3">
              <li className="flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> Free shipping over $50</li>
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Secure checkout</li>
              <li className="flex items-center gap-2"><RefreshCw className="h-4 w-4 text-primary" /> 30-day returns</li>
            </ul>
          </div>
        </div>

        <Tabs defaultValue="description" className="mt-14">
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="shipping">Shipping Info</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({product.reviewCount})</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="prose max-w-none py-6 text-muted-foreground">
            <p>{product.description}</p>
            <p>Crafted to last, designed to impress — this product is part of our trending collection, hand-selected for quality and value.</p>
          </TabsContent>
          <TabsContent value="shipping" className="py-6 text-sm text-muted-foreground space-y-3">
            <p><strong className="text-foreground">Processing:</strong> 1–2 business days.</p>
            <p><strong className="text-foreground">Delivery:</strong> 5–10 business days worldwide. Free over $50.</p>
            <p><strong className="text-foreground">Returns:</strong> 30-day no-fuss returns. See our <Link to="/shipping-returns" className="text-primary">policy</Link>.</p>
          </TabsContent>
          <TabsContent value="reviews" className="py-6 space-y-5">
            {[
              { name: "Sarah L.", rating: 5, text: "Exactly as described and arrived faster than expected." },
              { name: "Mike R.", rating: 4, text: "Solid quality for the price. Would buy again." },
              { name: "Anita V.", rating: 5, text: "Obsessed! Already ordered another as a gift." },
            ].map((r) => (
              <div key={r.name} className="rounded-xl border bg-card p-5">
                <div className="mb-2 flex items-center gap-2">
                  <p className="font-medium">{r.name}</p>
                  <div className="flex">
                    {[...Array(r.rating)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{r.text}</p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </section>

      {related.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-2xl font-bold">You might also like</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </>
  );
}

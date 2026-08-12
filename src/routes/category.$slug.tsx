import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { categories } from "@/data/categories";
import { products } from "@/data/products";
import { ProductCard } from "@/components/shop/ProductCard";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/category/$slug")({
  loader: ({ params }) => {
    const category = categories.find((c) => c.slug === params.slug);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.category.name} - Burney Boyz` },
      { name: "description", content: loaderData?.category.description },
      { property: "og:title", content: `${loaderData?.category.name} - Burney Boyz` },
      { property: "og:url", content: `/category/${loaderData?.category.slug}` },
    ],
    links: [{ rel: "canonical", href: `/category/${loaderData?.category.slug}` }],
  }),
  component: CategoryPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Category not found</h1>
      <Button asChild className="mt-6"><Link to="/categories">All categories</Link></Button>
    </div>
  ),
  errorComponent: ({ error }) => <div className="p-12 text-center">{error.message}</div>,
});

function CategoryPage() {
  const { category } = Route.useLoaderData() as { category: (typeof categories)[number] };
  const [sort, setSort] = useState("featured");

  const items = useMemo(() => {
    const list = products.filter((p) => p.category === category.slug);
    switch (sort) {
      case "price-asc": list.sort((a, b) => a.price - b.price); break;
      case "price-desc": list.sort((a, b) => b.price - a.price); break;
      case "rating": list.sort((a, b) => b.rating - a.rating); break;
      case "newest": list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break;
    }
    return list;
  }, [category.slug, sort]);

  return (
    <>
      <PageHero eyebrow="Category" title={category.name} description={category.description} />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{items.length} products</p>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-40 sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="rating">Best Rating</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {items.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">No products yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </>
  );
}

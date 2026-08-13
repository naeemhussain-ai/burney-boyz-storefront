import { useQuery } from "@tanstack/react-query";
import { fetchShopCategories, searchShopProducts } from "@/api/shop";

// CJ category names are full paths ("Jewelry & Watches > Mens Watches >
// Quartz Watches"); grouped here into one tile per top-level name (same
// grouping shop.tsx's filter sidebar uses), toggling every categoryId under
// it together when linked to /shop?cat=<ids>. Real categories have no image
// of their own, so each group borrows the image of one of its own products.
export interface ShopCategoryGroup {
  label: string;
  ids: string[];
  image: string | null;
  count: number;
}

export function useShopCategoryGroups() {
  return useQuery({
    queryKey: ["shop", "category-groups"],
    queryFn: async (): Promise<ShopCategoryGroup[]> => {
      const categories = await fetchShopCategories();

      const map = new Map<string, string[]>();
      for (const c of categories) {
        const label = c.name?.split(" > ")[0]?.trim() || "Other";
        if (!map.has(label)) map.set(label, []);
        map.get(label)!.push(c.id);
      }

      return Promise.all(
        Array.from(map.entries()).map(async ([label, ids]) => {
          const result = await searchShopProducts({ category: ids.join(","), limit: 1 });
          return {
            label,
            ids,
            image: result.products[0]?.image ?? null,
            count: result.pagination.total,
          };
        }),
      );
    },
    staleTime: 5 * 60_000,
  });
}

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addToWishlist as addToWishlistRequest,
  fetchWishlist,
  removeFromWishlist as removeFromWishlistRequest,
  type WishlistItem,
} from "@/api/wishlist";
import { useAuth } from "@/lib/auth";

// Sprint 8 / Step 20 - logged-in-only wishlist, backed by /api/account/wishlist
// (Neon-persisted). Mirrors src/lib/cart.tsx's context+react-query shape.

interface WishlistContextValue {
  items: WishlistItem[];
  count: number;
  isLoading: boolean;
  isWishlisted: (productId: string) => boolean;
  /** Adds if not already wishlisted, removes if it is. No-op when signed out. */
  toggle: (productId: string) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export const WISHLIST_QUERY_KEY = ["wishlist"] as const;

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: WISHLIST_QUERY_KEY,
    queryFn: fetchWishlist,
    enabled: isAuthenticated,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });

  const addMutation = useMutation({ mutationFn: addToWishlistRequest, onSuccess: invalidate });
  const removeMutation = useMutation({ mutationFn: removeFromWishlistRequest, onSuccess: invalidate });

  const value = useMemo<WishlistContextValue>(() => {
    const wishlistedIds = new Set(items.map((item) => item.product.id));

    return {
      items,
      count: items.length,
      isLoading: isAuthenticated && isLoading,
      isWishlisted: (productId) => wishlistedIds.has(productId),
      toggle: (productId) => {
        if (!isAuthenticated) return;
        if (wishlistedIds.has(productId)) removeMutation.mutate(productId);
        else addMutation.mutate(productId);
      },
    };
  }, [items, isLoading, isAuthenticated, addMutation, removeMutation]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}

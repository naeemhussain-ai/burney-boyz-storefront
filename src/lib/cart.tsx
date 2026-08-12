import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addCartItem,
  clearCart as clearCartRequest,
  fetchCart,
  removeCartItem,
  updateCartItemQuantity,
  type Cart,
} from "@/api/cart";

// Backed by the real Neon-persisted cart (/api/cart) - one cart per visitor,
// identified by an opaque token (see src/lib/cartToken.ts), not localStorage
// state. The public shape below is unchanged from the original client-only
// cart so CartDrawer/Header need no changes.

// Minimal product shape needed to add an item - decoupled from the static
// demo catalog's Product type, since real DB products now flow through here.
export interface CartAddableProduct {
  id: string;
  name: string;
  price: number;
  image: string;
}

export interface CartItem {
  id: string; // the cart line item's own id (not the product id)
  name: string;
  price: number;
  image: string;
  quantity: number;
  variant?: string; // display label only (e.g. "Black"), not an identifier
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  /** True until the initial cart fetch resolves. Not needed by CartDrawer
   * (localStorage-fast before; a brief flash is an acceptable tradeoff of a
   * real backend), but new consumers like checkout can use it to avoid
   * flashing an incorrect "empty cart" state. */
  isLoading: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  /** `variantId` is a real Variant id, not a display label. */
  addItem: (product: CartAddableProduct, quantity?: number, variantId?: string) => void;
  // `variant` is accepted but unused - each cart line already has its own
  // unique `id`, so it's no longer needed to disambiguate. Kept so
  // CartDrawer's existing call sites don't need to change.
  removeItem: (id: string, variant?: string) => void;
  updateQuantity: (id: string, quantity: number, variant?: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const CART_QUERY_KEY = ["cart"] as const;

function variantLabel(variant: Cart["items"][number]["variant"]): string | undefined {
  if (!variant) return undefined;
  const parts = [variant.option1, variant.option2, variant.option3].filter(Boolean);
  return parts.length ? parts.join(" · ") : (variant.name ?? undefined);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: cart, isLoading } = useQuery({ queryKey: CART_QUERY_KEY, queryFn: fetchCart });

  const onMutated = (updated: Cart) => queryClient.setQueryData(CART_QUERY_KEY, updated);

  const addMutation = useMutation({ mutationFn: addCartItem, onSuccess: onMutated });
  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      updateCartItemQuantity(itemId, quantity),
    onSuccess: onMutated,
  });
  const removeMutation = useMutation({ mutationFn: removeCartItem, onSuccess: onMutated });
  const clearMutation = useMutation({ mutationFn: clearCartRequest, onSuccess: onMutated });

  const value = useMemo<CartContextValue>(() => {
    const items: CartItem[] = (cart?.items ?? []).map((item) => ({
      id: item.id,
      name: item.product.name,
      price: item.unitPrice,
      image: item.product.image ?? "",
      quantity: item.quantity,
      variant: variantLabel(item.variant),
    }));

    return {
      items,
      count: cart?.totalQuantity ?? 0,
      subtotal: cart?.subtotal ?? 0,
      isLoading,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem: (product, quantity = 1, variantId) => {
        addMutation.mutate({ productId: product.id, variantId, quantity });
      },
      removeItem: (id) => {
        removeMutation.mutate(id);
      },
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          removeMutation.mutate(id);
          return;
        }
        updateMutation.mutate({ itemId: id, quantity });
      },
      clear: () => clearMutation.mutate(),
    };
  }, [cart, isLoading, isOpen, addMutation, updateMutation, removeMutation, clearMutation]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

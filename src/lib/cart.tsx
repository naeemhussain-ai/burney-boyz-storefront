import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@/data/products";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  variant?: string;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, quantity?: number, variant?: string) => void;
  removeItem: (id: string, variant?: string) => void;
  updateQuantity: (id: string, quantity: number, variant?: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "bb_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    const keyOf = (id: string, variant?: string) => `${id}::${variant ?? ""}`;
    return {
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem: (product, quantity = 1, variant) =>
        setItems((curr) => {
          const k = keyOf(product.id, variant);
          const existing = curr.find((i) => keyOf(i.id, i.variant) === k);
          if (existing) {
            return curr.map((i) =>
              keyOf(i.id, i.variant) === k ? { ...i, quantity: i.quantity + quantity } : i,
            );
          }
          return [
            ...curr,
            {
              id: product.id,
              name: product.name,
              price: product.price,
              image: product.image,
              quantity,
              variant,
            },
          ];
        }),
      removeItem: (id, variant) =>
        setItems((curr) => curr.filter((i) => keyOf(i.id, i.variant) !== keyOf(id, variant))),
      updateQuantity: (id, quantity, variant) =>
        setItems((curr) =>
          curr
            .map((i) =>
              keyOf(i.id, i.variant) === keyOf(id, variant)
                ? { ...i, quantity: Math.max(0, quantity) }
                : i,
            )
            .filter((i) => i.quantity > 0),
        ),
      clear: () => setItems([]),
    };
  }, [items, isOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

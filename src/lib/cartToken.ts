// Persists the anonymous ShopNow cart's identity token client-side.
// Separate from the old client-only Shop cart (src/lib/cart.tsx) - this one
// backs the Neon-persisted ShopNow cart (see src/api/cart.ts).

const STORAGE_KEY = "shopnow_cart_token";

export function getCartToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setCartToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // ignore - worst case the cart just doesn't persist across reloads
  }
}

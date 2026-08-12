// Reusable API layer for the ShopNow cart. Talks only to our own backend's
// /api/cart endpoints - never CJ. Separate from the old client-only Shop
// cart (src/lib/cart.tsx), which this does not touch.
import { getCartToken, setCartToken } from "@/lib/cartToken";

const API_BASE_URL =
  (import.meta.env.VITE_SHOPNOW_API_BASE_URL as string | undefined) || "http://localhost:5000/api";

export class CartApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "CartApiError";
    this.status = status;
  }
}

export interface CartProductRef {
  id: string;
  name: string;
  slug: string;
  image: string | null;
}

export interface CartVariantRef {
  id: string;
  name: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  image: string | null;
  stock: number | null;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product: CartProductRef;
  variant: CartVariantRef | null;
}

export interface Cart {
  id: string | null;
  token: string | null;
  items: CartItem[];
  subtotal: number;
  totalQuantity: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  pagination: unknown;
  meta: Record<string, unknown>;
}

async function requestEnvelope<T>(path: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const headers = new Headers(init.headers);
  const token = getCartToken();
  if (token) headers.set("X-Cart-Token", token);
  if (init.body) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new CartApiError(
      "Unable to reach the cart server. Make sure the API is running and try again.",
    );
  }

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // fall through to the status-based error below
  }

  if (!response.ok || !body?.success) {
    throw new CartApiError(
      body?.message || `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return body;
}

// The backend issues a token the first time an item is added; persist it so
// every subsequent request (including from other tabs/components) reuses
// the same cart.
function persistToken(cart: Cart) {
  if (cart.token) setCartToken(cart.token);
}

export async function fetchCart(): Promise<Cart> {
  const envelope = await requestEnvelope<Cart>("/cart");
  persistToken(envelope.data);
  return envelope.data;
}

export async function addCartItem(input: {
  productId: string;
  variantId?: string;
  quantity?: number;
}): Promise<Cart> {
  const envelope = await requestEnvelope<Cart>("/cart", {
    method: "POST",
    body: JSON.stringify(input),
  });
  persistToken(envelope.data);
  return envelope.data;
}

export async function updateCartItemQuantity(itemId: string, quantity: number): Promise<Cart> {
  const envelope = await requestEnvelope<Cart>(`/cart/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
  persistToken(envelope.data);
  return envelope.data;
}

export async function removeCartItem(itemId: string): Promise<Cart> {
  const envelope = await requestEnvelope<Cart>(`/cart/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
  });
  persistToken(envelope.data);
  return envelope.data;
}

export async function clearCart(): Promise<Cart> {
  const envelope = await requestEnvelope<Cart>("/cart", { method: "DELETE" });
  persistToken(envelope.data);
  return envelope.data;
}

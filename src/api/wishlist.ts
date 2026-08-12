// Reusable API layer for the customer wishlist. Talks only to our own
// backend's /api/account/wishlist endpoints - signed-in customers only,
// same Bearer-token auth as src/api/auth.ts.
import { getAuthToken } from "@/lib/authToken";

const API_BASE_URL =
  (import.meta.env.VITE_SHOPNOW_API_BASE_URL as string | undefined) || "http://localhost:5000/api";

export class WishlistApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "WishlistApiError";
    this.status = status;
  }
}

export interface WishlistProduct {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  myPrice: number | string | null;
  comparePrice: number | string | null;
  shortDescription: string | null;
  categoryId: string | null;
  categoryName: string | null;
  featured: boolean;
  avgRating: number | string | null;
  reviewCount: number | null;
  createdAt: string;
}

export interface WishlistItem {
  id: string;
  createdAt: string;
  product: WishlistProduct;
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
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new WishlistApiError(
      "Unable to reach the wishlist server. Make sure the API is running and try again.",
    );
  }

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // fall through to the status-based error below
  }

  if (!response.ok || !body?.success) {
    throw new WishlistApiError(
      body?.message || `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return body;
}

export async function fetchWishlist(): Promise<WishlistItem[]> {
  const envelope = await requestEnvelope<WishlistItem[]>("/account/wishlist");
  return envelope.data ?? [];
}

export async function fetchWishlistCount(): Promise<number> {
  const envelope = await requestEnvelope<{ count: number }>("/account/wishlist/count");
  return envelope.data.count;
}

export async function addToWishlist(productId: string): Promise<void> {
  await requestEnvelope<null>("/account/wishlist", {
    method: "POST",
    body: JSON.stringify({ productId }),
  });
}

export async function removeFromWishlist(productId: string): Promise<void> {
  await requestEnvelope<null>(`/account/wishlist/${encodeURIComponent(productId)}`, {
    method: "DELETE",
  });
}

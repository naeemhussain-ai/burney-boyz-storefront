// Reusable API layer for the Shop page's real catalog data. Talks only to
// our own backend's /api/shop/* endpoints (Neon-backed) - never CJ directly.
// Separate from the old static demo catalog (src/data/products.ts), which
// still powers the homepage and category browse pages untouched.

const API_BASE_URL =
  (import.meta.env.VITE_SHOPNOW_API_BASE_URL as string | undefined) || "http://localhost:5000/api";

export class ShopApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ShopApiError";
    this.status = status;
  }
}

export type ShopSort = "newest" | "price-asc" | "price-desc" | "best-selling" | "highest-rated";
export type ShopAvailability = "in_stock" | "out_of_stock";

export interface ShopProductSummary {
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
  newArrival: boolean;
  avgRating: number | string | null;
  reviewCount: number | null;
  createdAt: string;
}

export interface ShopCategory {
  id: string;
  name: string | null;
}

export interface ShopVariant {
  id: string;
  cjVariantId: string | null;
  sku: string | null;
  name: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  myPrice: number | string | null;
  stock: number | null;
  image: string | null;
  createdAt: string;
}

export interface ShopProductDetail {
  id: string;
  cjProductId: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  sku: string | null;
  myPrice: number | string | null;
  comparePrice: number | string | null;
  categoryId: string | null;
  categoryName: string | null;
  brand: string | null;
  image: string | null;
  images: string[] | null;
  status: string;
  featured: boolean;
  avgRating: number | string | null;
  reviewCount: number | null;
  createdAt: string;
  updatedAt: string;
  variants: ShopVariant[];
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  pagination: { page: number; limit: number; total: number; totalPages: number } | null;
  meta: Record<string, unknown>;
}

async function requestEnvelope<T>(path: string): Promise<ApiEnvelope<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`);
  } catch {
    throw new ShopApiError(
      "Unable to reach the products server. Make sure the API is running and try again.",
    );
  }

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // fall through to the status-based error below
  }

  if (!response.ok || !body?.success) {
    throw new ShopApiError(
      body?.message || `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return body;
}

export async function fetchShopProducts({
  limit = 100,
  category,
  search,
  sort,
}: {
  limit?: number;
  category?: string;
  search?: string;
  sort?: ShopSort;
} = {}): Promise<ShopProductSummary[]> {
  const params = new URLSearchParams({ page: "1", limit: String(limit) });
  if (category) params.set("category", category);
  if (search) params.set("search", search);
  if (sort) params.set("sort", sort);

  const envelope = await requestEnvelope<ShopProductSummary[]>(
    `/shop/products?${params.toString()}`,
  );
  return envelope.data ?? [];
}

export interface ShopSearchParams {
  page?: number;
  limit?: number;
  category?: string; // single id, or comma-separated for multi-select
  search?: string; // matches name or SKU
  minPrice?: number;
  maxPrice?: number;
  availability?: ShopAvailability;
  featured?: boolean;
  newArrival?: boolean;
  sort?: ShopSort;
}

export interface ShopSearchResult {
  products: ShopProductSummary[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// Sprint 8 / Step 21 - full server-side search/filter/sort/pagination.
// Kept separate from fetchShopProducts() (which returns a plain array and
// is still used for the simple "related products" case) since this exposes
// the pagination envelope that a real search page needs.
export async function searchShopProducts(params: ShopSearchParams = {}): Promise<ShopSearchResult> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 12));
  if (params.category) query.set("category", params.category);
  if (params.search) query.set("search", params.search);
  if (params.minPrice !== undefined) query.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined) query.set("maxPrice", String(params.maxPrice));
  if (params.availability) query.set("availability", params.availability);
  if (params.featured !== undefined) query.set("featured", String(params.featured));
  if (params.newArrival !== undefined) query.set("newArrival", String(params.newArrival));
  if (params.sort) query.set("sort", params.sort);

  const envelope = await requestEnvelope<ShopProductSummary[]>(`/shop/products?${query.toString()}`);
  return {
    products: envelope.data ?? [],
    pagination: envelope.pagination ?? { page: 1, limit: 12, total: 0, totalPages: 0 },
  };
}

export interface ShopSuggestion {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  myPrice: number | string | null;
}

export async function fetchSearchSuggestions(query: string): Promise<ShopSuggestion[]> {
  if (!query.trim()) return [];
  const envelope = await requestEnvelope<ShopSuggestion[]>(
    `/shop/search/suggestions?q=${encodeURIComponent(query)}`,
  );
  return envelope.data ?? [];
}

export async function fetchShopProductBySlug(slug: string): Promise<ShopProductDetail> {
  const envelope = await requestEnvelope<ShopProductDetail>(
    `/shop/products/${encodeURIComponent(slug)}`,
  );
  return envelope.data;
}

export async function fetchShopCategories(): Promise<ShopCategory[]> {
  const envelope = await requestEnvelope<ShopCategory[]>(`/shop/categories`);
  return envelope.data ?? [];
}

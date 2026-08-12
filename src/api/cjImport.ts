// API layer for the Admin CJ Import Center. Talks only to the backend's
// existing CJ passthrough endpoints (/api/products, /api/categories,
// /api/import-product/:id) - the same routes cj.service.js / cj.controller.js
// and productImport.service.js already expose elsewhere. No CJ logic is
// duplicated here; this file only shapes fetch calls + response typing.

const API_BASE_URL =
  (import.meta.env.VITE_SHOPNOW_API_BASE_URL as string | undefined) || "http://localhost:5000/api";

export class CjImportApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "CjImportApiError";
    this.status = status;
  }
}

export type CjSortField = "match" | "sales" | "price" | "newest" | "inventory";
export type CjSortOrder = "asc" | "desc";

export interface CjProductSummary {
  id: string;
  sku: string | null;
  name: string;
  price: number | string | null;
  image: string | null;
  categoryId: string | null;
  categoryName: string | null;
  freeShipping: boolean;
  hasVideo: boolean;
  inventory: number | null;
  listedNum: number | null;
}

export interface CjCategoryLeaf {
  id: string;
  name: string;
}

export interface CjCategoryMid {
  id: string;
  name: string;
  children: CjCategoryLeaf[];
}

export interface CjCategoryTop {
  id: string;
  name: string;
  children: CjCategoryMid[];
}

export interface CjVariantDetail {
  id: string;
  sku: string | null;
  name: string | null;
  image: string | null;
  key: string | null;
  price: number | string | null;
  suggestedPrice: number | string | null;
  properties: { propertyName: string; propertyValueName: string | null }[];
}

export interface CjProductDetail {
  id: string;
  sku: string | null;
  name: string;
  description: string | null;
  price: number | string | null;
  suggestedPrice: number | string | null;
  category: { id: string | null; name: string | null };
  brand: string | null;
  primaryImage: string | null;
  images: string[];
  variants: CjVariantDetail[];
  colors: string[];
  sizes: string[];
  listedNum: number | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  pagination: { page: number; limit: number; total: number; totalPages: number } | null;
  meta: Record<string, unknown>;
}

async function requestEnvelope<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new CjImportApiError(
      "Unable to reach the CJ import server. Make sure the API is running and try again.",
    );
  }

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // fall through to the status-based error below
  }

  if (!response.ok || !body?.success) {
    throw new CjImportApiError(
      body?.message || `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return body;
}

export interface CjSearchParams {
  keyword?: string;
  page?: number;
  limit?: number;
  category?: string;
  sort?: CjSortField;
  order?: CjSortOrder;
}

export interface CjSearchResult {
  products: CjProductSummary[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// GET /api/products - existing CJ listV2 passthrough (search/keyword, category,
// sort, pagination). Backs live search, category filter, sort filter, and
// infinite scroll / Load More in the CJ Import Center.
export async function searchCjProducts(params: CjSearchParams): Promise<CjSearchResult> {
  const query = new URLSearchParams();
  if (params.keyword) query.set("keyword", params.keyword);
  if (params.category) query.set("category", params.category);
  if (params.sort) query.set("sort", params.sort);
  if (params.order) query.set("order", params.order);
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 24));

  const envelope = await requestEnvelope<CjProductSummary[]>(`/products?${query.toString()}`);
  return {
    products: envelope.data ?? [],
    pagination: envelope.pagination ?? { page: 1, limit: 24, total: 0, totalPages: 0 },
  };
}

// GET /api/categories - existing CJ category tree passthrough.
export async function fetchCjCategories(): Promise<CjCategoryTop[]> {
  const envelope = await requestEnvelope<CjCategoryTop[]>("/categories");
  return envelope.data ?? [];
}

// GET /api/products/:id - existing CJ product detail passthrough (full
// variants, images, etc.) - backs the preview modal.
export async function fetchCjProductDetail(cjProductId: string): Promise<CjProductDetail> {
  const envelope = await requestEnvelope<CjProductDetail>(
    `/products/${encodeURIComponent(cjProductId)}`,
  );
  return envelope.data;
}

export interface ImportProductResult {
  success: boolean;
  message: string;
  productId: string;
  variantCount: number;
}

// POST /api/import-product/:cjProductId - existing Product Import endpoint.
export async function importCjProduct(cjProductId: string): Promise<ImportProductResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/import-product/${encodeURIComponent(cjProductId)}`, {
      method: "POST",
    });
  } catch {
    throw new CjImportApiError(
      "Unable to reach the import server. Make sure the API is running and try again.",
    );
  }

  let body: ImportProductResult | null = null;
  try {
    body = (await response.json()) as ImportProductResult;
  } catch {
    // fall through to the status-based error below
  }

  if (!response.ok || !body?.success) {
    throw new CjImportApiError(
      body?.message || `Import failed with status ${response.status}`,
      response.status,
    );
  }

  return body;
}

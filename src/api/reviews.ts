// Reusable API layer for product reviews. Reads are public; writes require
// a signed-in customer (same Bearer-token auth as src/api/auth.ts).
import { getAuthToken } from "@/lib/authToken";

const API_BASE_URL =
  (import.meta.env.VITE_SHOPNOW_API_BASE_URL as string | undefined) || "http://localhost:5000/api";

export class ReviewApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ReviewApiError";
    this.status = status;
  }
}

export type ReviewSort = "newest" | "oldest" | "rating-desc" | "rating-asc";

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  images: string[] | null;
  verifiedPurchase: boolean;
  createdAt: string;
  authorName: string;
}

export interface ReviewSummary {
  avgRating: number | string;
  reviewCount: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
}

export interface ReviewsPage {
  reviews: Review[];
  summary: ReviewSummary;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface ReviewInput {
  rating: number;
  title?: string;
  body?: string;
  images?: string[];
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  pagination: { page: number; limit: number; total: number; totalPages: number } | null;
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
    throw new ReviewApiError(
      "Unable to reach the reviews server. Make sure the API is running and try again.",
    );
  }

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // fall through to the status-based error below
  }

  if (!response.ok || !body?.success) {
    throw new ReviewApiError(
      body?.message || `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return body;
}

export async function fetchProductReviews(
  productId: string,
  params: { page?: number; limit?: number; sort?: ReviewSort } = {},
): Promise<ReviewsPage> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.sort) query.set("sort", params.sort);

  const envelope = await requestEnvelope<Review[]>(
    `/reviews/product/${encodeURIComponent(productId)}?${query.toString()}`,
  );
  const summary = (envelope.meta?.summary as ReviewSummary | undefined) ?? {
    avgRating: 0,
    reviewCount: 0,
    distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
  };

  return {
    reviews: envelope.data ?? [],
    summary,
    pagination: envelope.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 },
  };
}

export async function createProductReview(productId: string, input: ReviewInput): Promise<Review> {
  const envelope = await requestEnvelope<Review>(
    `/reviews/product/${encodeURIComponent(productId)}`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return envelope.data;
}

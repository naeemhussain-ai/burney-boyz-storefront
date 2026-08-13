// Reusable API layer for the Admin panel (products, orders, dashboard).
// Talks only to our own backend's local-catalog/admin endpoints - never CJ.
import type { Order, OrderStatus } from "@/api/order";
import { getAuthToken } from "@/lib/authToken";

const API_BASE_URL =
  (import.meta.env.VITE_SHOPNOW_API_BASE_URL as string | undefined) || "http://localhost:5000/api";

export class AdminApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

export type AdminProductStatus = "draft" | "published";

// A shipping quote CJ returned for one destination country, captured at
// import time via /logistic/freightCalculate.
export interface AdminShippingQuote {
  logisticName: string | null;
  price: number | string | null;
  priceCny: number | string | null;
  aging: string | null;
}

// { [destCountryCode]: quote[] }
export type AdminShippingMethods = Record<string, AdminShippingQuote[]>;

export interface AdminProductAttributes {
  logistics: string[];
  material: string[];
  packing: string[];
}

export interface AdminProductSpecifications {
  optionTypes: string[];
  customsCode: string | null;
  customsName: string | null;
}

export interface AdminVariantInventoryEntry {
  countryCode: string | null;
  total: number | null;
  verified: number | boolean | null;
}

export interface AdminVariant {
  id: string;
  cjVariantId: string | null;
  sku: string | null;
  name: string | null;
  barcode: string | null;
  barcode2: string | null;
  standard: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  price: number | string | null;
  myPrice: number | string | null;
  stock: number | null;
  image: string | null;
  weight: number | string | null; // grams
  length: number | null; // mm
  width: number | null; // mm
  height: number | null; // mm
  inventoryDetail: AdminVariantInventoryEntry[] | null;
}

export interface AdminProduct {
  id: string;
  cjProductId: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  sku: string | null;
  price: number | string | null; // CJ cost - internal only, never shown to customers
  comparePrice: number | string | null;
  myPrice: number | string | null;
  shippingCost: number | string | null;
  currency: string;
  categoryId: string | null;
  categoryName: string | null;
  brand: string | null;
  image: string | null;
  images: string[] | null;
  video: string | null;
  weight: string | null; // grams, may be a CJ-reported range e.g. "1000.00-1120.00"
  packagingWeight: string | null; // grams, includes packaging
  listedNum: number | null;
  attributes: AdminProductAttributes | null;
  specifications: AdminProductSpecifications | null;
  shippingMethods: AdminShippingMethods | null;
  shippingCountries: string[] | null;
  status: AdminProductStatus;
  featured: boolean;
  newArrival: boolean;
  createdAt: string;
  updatedAt: string;
  variants?: AdminVariant[];

  // Sprint 7 / Step 18 - CJ Auto Sync
  cjStatus: string | null; // CJ's own product status - distinct from `status` above, never admin-edited
  lastSyncedAt: string | null;
  lastSyncStatus: "success" | "error" | null;
  lastSyncError: string | null;
}

export interface ProductSyncVariantChanges {
  created: number;
  updated: number;
  zeroedOut: number;
}

export interface ProductSyncResult {
  productId: string;
  status: "success" | "error";
  changedFields: string[];
  variantChanges: ProductSyncVariantChanges | null;
  error: string | null;
}

export interface ProductSyncAllSummary {
  total: number;
  succeeded: number;
  failed: number;
  changed: number;
  unchanged: number;
  results: (ProductSyncResult & { name: string })[];
}

export interface AdminProductUpdateInput {
  name?: string;
  shortDescription?: string | null;
  description?: string | null;
  myPrice?: number;
  comparePrice?: number | null;
  shippingCost?: number;
  featured?: boolean;
  newArrival?: boolean;
  status?: AdminProductStatus;
  image?: string | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  pagination: { page: number; limit: number; total: number; totalPages: number } | null;
  meta: Record<string, unknown>;
}

// Sprint 10 / Step 24 - /api/admin/* now requires an admin JWT (see
// backend/src/app.js). Every admin call goes through this one function, so
// attaching the token here covers products/orders/dashboard/inventory/
// analytics all at once.
async function requestEnvelope<T>(path: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const headers = new Headers(init.headers);
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new AdminApiError(
      "Unable to reach the admin server. Make sure the API is running and try again.",
    );
  }

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // fall through to the status-based error below
  }

  if (!response.ok || !body?.success) {
    throw new AdminApiError(
      body?.message || `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return body;
}

export async function fetchAdminProducts(): Promise<AdminProduct[]> {
  const envelope = await requestEnvelope<AdminProduct[]>("/local-products");
  return envelope.data ?? [];
}

// Reuses the existing GET /api/local-products/:id endpoint (already used by
// the storefront's local-catalog reads) to fetch one product for the admin
// pricing flow right after a CJ import.
export async function fetchAdminProductById(id: string): Promise<AdminProduct> {
  const envelope = await requestEnvelope<AdminProduct>(`/local-products/${encodeURIComponent(id)}`);
  return envelope.data;
}

export async function updateAdminProduct(
  id: string,
  patch: AdminProductUpdateInput,
): Promise<AdminProduct> {
  const envelope = await requestEnvelope<AdminProduct>(
    `/admin/products/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
  );
  return envelope.data;
}

// Sprint 7 / Step 18 - CJ Auto Sync
export async function syncAdminProduct(id: string): Promise<ProductSyncResult> {
  const envelope = await requestEnvelope<ProductSyncResult>(
    `/admin/products/${encodeURIComponent(id)}/sync`,
    { method: "POST" },
  );
  return envelope.data;
}

export async function syncAllAdminProducts(): Promise<ProductSyncAllSummary> {
  const envelope = await requestEnvelope<ProductSyncAllSummary>("/admin/products/sync-all", {
    method: "POST",
  });
  return envelope.data;
}

// --- Orders ---------------------------------------------------------

export interface AdminOrdersPage {
  orders: Order[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function fetchAdminOrders(params: {
  search?: string;
  status?: OrderStatus;
  page?: number;
  limit?: number;
}): Promise<AdminOrdersPage> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 20));

  const envelope = await requestEnvelope<Order[]>(`/admin/orders?${query.toString()}`);
  return {
    orders: envelope.data,
    pagination: envelope.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
}

export async function fetchAdminOrder(id: string): Promise<Order> {
  const envelope = await requestEnvelope<Order>(`/admin/orders/${encodeURIComponent(id)}`);
  return envelope.data;
}

export async function updateAdminOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  const envelope = await requestEnvelope<Order>(`/admin/orders/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return envelope.data;
}

// Sprint 7 / Step 19 - manual on-demand CJ tracking refresh (order detail
// pages also sync automatically/lazily on view; this bypasses that throttle).
export async function syncAdminOrderTracking(id: string): Promise<Order> {
  const envelope = await requestEnvelope<Order>(
    `/admin/orders/${encodeURIComponent(id)}/sync-tracking`,
    { method: "POST" },
  );
  return envelope.data;
}

// Sprint 10 / Step 24 - CJ Order Flow. Manual, admin-triggered push to CJ -
// orders are never sent automatically while unpaid/pending (backend rejects
// that). Idempotent: calling this again for an order already sent to CJ is
// a no-op that just returns the existing CJ order.
export async function sendAdminOrderToCj(id: string): Promise<Order> {
  const envelope = await requestEnvelope<Order>(
    `/admin/orders/${encodeURIComponent(id)}/send-to-cj`,
    { method: "POST" },
  );
  return envelope.data;
}

// --- Dashboard ---------------------------------------------------------

export interface AdminDashboardOrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerEmail: string;
  customerName: string | null;
  total: number | string;
  createdAt: string;
}

export interface AdminDashboardTopProduct {
  productId: string;
  name: string;
  image: string | null;
  quantitySold: number;
  revenue: number | string;
}

export interface AdminDashboardStats {
  revenue: number | string;
  ordersCount: number;
  productsCount: number;
  customersCount: number;
  featuredProducts: AdminProduct[];
  recentOrders: AdminDashboardOrderSummary[];
  topProducts: AdminDashboardTopProduct[];
}

export async function fetchAdminDashboard(): Promise<AdminDashboardStats> {
  const envelope = await requestEnvelope<AdminDashboardStats>("/admin/dashboard");
  return envelope.data;
}

export interface AdminReview {
  id: string;
  productId: string;
  productName: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  images: string[] | null;
  verifiedPurchase: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  user: { id: string; firstName: string | null; lastName: string | null; email: string } | null;
}

export async function fetchAdminReviews(params: { status?: string; page?: number; limit?: number } = {}) {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  q.set('page', String(params.page ?? 1));
  q.set('limit', String(params.limit ?? 20));
  const envelope = await requestEnvelope<AdminReview[]>(`/admin/reviews?${q.toString()}`);
  return { reviews: envelope.data, pagination: envelope.pagination };
}

export async function setAdminReviewStatus(id: string, status: "approved" | "rejected" | "pending") {
  const envelope = await requestEnvelope<AdminReview>(`/admin/reviews/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return envelope.data;
}

// --- Admin Access Requests (Sprint 10 / Step 26) ---------------------

export type AdminRequestStatus = "none" | "pending" | "approved" | "declined";

export interface AdminAccessRequest {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isAdmin: boolean;
  adminRequestStatus: AdminRequestStatus;
  adminRequestedAt: string | null;
  adminDecidedAt: string | null;
  createdAt: string;
}

export async function fetchAdminAccessRequests(
  status: AdminRequestStatus | "all" = "pending",
): Promise<AdminAccessRequest[]> {
  const envelope = await requestEnvelope<AdminAccessRequest[]>(
    `/admin/access-requests?status=${encodeURIComponent(status)}`,
  );
  return envelope.data;
}

export async function approveAdminAccessRequest(id: string): Promise<AdminAccessRequest> {
  const envelope = await requestEnvelope<AdminAccessRequest>(
    `/admin/access-requests/${encodeURIComponent(id)}/approve`,
    { method: "POST" },
  );
  return envelope.data;
}

export async function declineAdminAccessRequest(id: string): Promise<AdminAccessRequest> {
  const envelope = await requestEnvelope<AdminAccessRequest>(
    `/admin/access-requests/${encodeURIComponent(id)}/decline`,
    { method: "POST" },
  );
  return envelope.data;
}

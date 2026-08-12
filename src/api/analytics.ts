// Sprint 9 / Step 23 - Analytics & Reports. Talks to the backend's
// /api/admin/analytics/* endpoints (analytics.controller.js).
import { getAuthToken } from "@/lib/authToken";

const API_BASE_URL =
  (import.meta.env.VITE_SHOPNOW_API_BASE_URL as string | undefined) || "http://localhost:5000/api";

export class AnalyticsApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AnalyticsApiError";
    this.status = status;
  }
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface AnalyticsOverview {
  range: { from: string; to: string };
  totalOrders: number;
  ordersByStatus: Record<OrderStatus, number>;
  revenue: number | string;
  averageOrderValue: number | string;
  customersCount: number;
}

export interface RevenuePoint {
  date: string; // YYYY-MM-DD
  revenue: number;
  orders: number;
}

export interface MonthlyRevenuePoint {
  month: string; // YYYY-MM
  revenue: number;
  orders: number;
}

export interface BestSellingProduct {
  productId: string | null;
  name: string;
  image: string | null;
  quantitySold: number;
  revenue: number | string;
}

export interface TopCategory {
  category: string;
  quantitySold: number;
  revenue: number;
}

export interface TopCustomer {
  email: string;
  name: string | null;
  ordersCount: number;
  totalSpent: number | string;
}

export interface DateRangeParams {
  from?: string;
  to?: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  pagination: unknown;
  meta: Record<string, unknown>;
}

// Sprint 10 / Step 24 - /api/admin/analytics/* now requires an admin JWT
// (see backend/src/app.js).
async function requestEnvelope<T>(path: string): Promise<ApiEnvelope<T>> {
  const headers = new Headers();
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { headers });
  } catch {
    throw new AnalyticsApiError(
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
    throw new AnalyticsApiError(
      body?.message || `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return body;
}

export async function fetchAnalyticsOverview(params: DateRangeParams = {}): Promise<AnalyticsOverview> {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  const envelope = await requestEnvelope<AnalyticsOverview>(`/admin/analytics/overview?${query.toString()}`);
  return envelope.data;
}

export async function fetchDailyRevenue(days = 30): Promise<RevenuePoint[]> {
  const envelope = await requestEnvelope<RevenuePoint[]>(`/admin/analytics/revenue/daily?days=${days}`);
  return envelope.data;
}

export async function fetchMonthlyRevenue(months = 12): Promise<MonthlyRevenuePoint[]> {
  const envelope = await requestEnvelope<MonthlyRevenuePoint[]>(
    `/admin/analytics/revenue/monthly?months=${months}`,
  );
  return envelope.data;
}

export async function fetchBestSellers(
  params: DateRangeParams & { limit?: number } = {},
): Promise<BestSellingProduct[]> {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  query.set("limit", String(params.limit ?? 10));
  const envelope = await requestEnvelope<BestSellingProduct[]>(
    `/admin/analytics/best-sellers?${query.toString()}`,
  );
  return envelope.data;
}

export async function fetchTopCategories(
  params: DateRangeParams & { limit?: number } = {},
): Promise<TopCategory[]> {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  query.set("limit", String(params.limit ?? 10));
  const envelope = await requestEnvelope<TopCategory[]>(
    `/admin/analytics/top-categories?${query.toString()}`,
  );
  return envelope.data;
}

export async function fetchTopCustomers(
  params: DateRangeParams & { limit?: number } = {},
): Promise<TopCustomer[]> {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  query.set("limit", String(params.limit ?? 10));
  const envelope = await requestEnvelope<TopCustomer[]>(
    `/admin/analytics/top-customers?${query.toString()}`,
  );
  return envelope.data;
}

// Sprint 10 / Step 24 - /api/admin/analytics/* now requires an admin JWT.
// A plain <a href> download can't attach an Authorization header, so this
// fetches the file as a Blob (with the token) and triggers the download via
// a throwaway object URL instead of building a bare, unauthenticated URL.
export async function downloadOrdersExport(
  format: "csv" | "xlsx",
  params: DateRangeParams & { status?: OrderStatus } = {},
): Promise<void> {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.status) query.set("status", params.status);
  const qs = query.toString();

  const headers = new Headers();
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/admin/analytics/export.${format}${qs ? `?${qs}` : ""}`,
      { headers },
    );
  } catch {
    throw new AnalyticsApiError(
      "Unable to reach the admin server. Make sure the API is running and try again.",
    );
  }

  if (!response.ok) {
    let message = `Export failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch {
      // ignore - use the generic message above
    }
    throw new AnalyticsApiError(message, response.status);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `burney-boyz-orders-report.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

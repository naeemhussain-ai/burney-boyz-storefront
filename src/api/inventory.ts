// Sprint 9 / Step 22 - Inventory Automation. Talks to the backend's
// /api/admin/inventory/* endpoints (inventory.controller.js) plus the
// existing /api/admin/products/sync-all (see admin.ts#syncAllAdminProducts)
// for the "Sync All Now" action - no sync logic is duplicated here.
import { getAuthToken } from "@/lib/authToken";

const API_BASE_URL =
  (import.meta.env.VITE_SHOPNOW_API_BASE_URL as string | undefined) || "http://localhost:5000/api";

export class InventoryApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "InventoryApiError";
    this.status = status;
  }
}

export type SyncLogType = "manual" | "scheduled" | "retry" | "single";
export type SyncLogStatus = "running" | "success" | "partial" | "error";

export interface SyncLog {
  id: string;
  type: SyncLogType;
  status: SyncLogStatus;
  totalProducts: number;
  succeeded: number;
  failed: number;
  changed: number;
  triggeredBy: string | null;
  errorSummary: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface InventoryOverview {
  lastSync: SyncLog | null;
  totalProducts: number;
  lowStockThreshold: number;
  lowStockCount: number;
  outOfStockCount: number;
  recentSyncLogs: SyncLog[];
}

export interface InventoryProductRow {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  myPrice: number | string | null;
  status: "draft" | "published";
  totalStock?: number;
}

export interface RetryFailedSummary {
  total: number;
  succeeded: number;
  failed: number;
  changed: number;
  unchanged: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  pagination: Pagination | null;
  meta: Record<string, unknown>;
}

// Sprint 10 / Step 24 - /api/admin/inventory/* now requires an admin JWT
// (see backend/src/app.js).
async function requestEnvelope<T>(path: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const headers = new Headers(init.headers);
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new InventoryApiError(
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
    throw new InventoryApiError(
      body?.message || `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return body;
}

export async function fetchInventoryOverview(): Promise<InventoryOverview> {
  const envelope = await requestEnvelope<InventoryOverview>("/admin/inventory/overview");
  return envelope.data;
}

export async function fetchLowStockProducts(params: {
  threshold?: number;
  page?: number;
  limit?: number;
} = {}): Promise<{ products: InventoryProductRow[]; pagination: Pagination; threshold: number }> {
  const query = new URLSearchParams();
  if (params.threshold !== undefined) query.set("threshold", String(params.threshold));
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 20));

  const envelope = await requestEnvelope<InventoryProductRow[]>(
    `/admin/inventory/low-stock?${query.toString()}`,
  );
  return {
    products: envelope.data,
    pagination: envelope.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
    threshold: Number(envelope.meta?.threshold ?? params.threshold ?? 5),
  };
}

export async function fetchOutOfStockProducts(params: {
  page?: number;
  limit?: number;
} = {}): Promise<{ products: InventoryProductRow[]; pagination: Pagination }> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 20));

  const envelope = await requestEnvelope<InventoryProductRow[]>(
    `/admin/inventory/out-of-stock?${query.toString()}`,
  );
  return {
    products: envelope.data,
    pagination: envelope.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
}

export async function fetchSyncLogs(params: {
  page?: number;
  limit?: number;
} = {}): Promise<{ logs: SyncLog[]; pagination: Pagination }> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 20));

  const envelope = await requestEnvelope<SyncLog[]>(`/admin/inventory/sync-logs?${query.toString()}`);
  return {
    logs: envelope.data,
    pagination: envelope.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
}

export async function retryFailedSyncs(): Promise<RetryFailedSummary> {
  const envelope = await requestEnvelope<RetryFailedSummary>("/admin/inventory/retry-failed", {
    method: "POST",
  });
  return envelope.data;
}

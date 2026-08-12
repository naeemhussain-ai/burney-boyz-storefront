// Reusable API layer for orders. Talks only to our own backend's
// /api/orders endpoints.
import { getCartToken } from "@/lib/cartToken";

const API_BASE_URL =
  (import.meta.env.VITE_SHOPNOW_API_BASE_URL as string | undefined) || "http://localhost:5000/api";

export class OrderApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "OrderApiError";
    this.status = status;
  }
}

export type OrderStatus =
  "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

export interface OrderItem {
  id: string;
  productId: string | null;
  variantId: string | null;
  name: string;
  variantLabel: string | null;
  image: string | null;
  sku: string | null;
  unitPrice: number | string;
  quantity: number;
  lineTotal: number | string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;

  customerEmail: string;
  customerPhone: string | null;
  customerName: string | null;

  shippingFullName: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string | null;
  shippingCountry: string;
  shippingState: string;
  shippingCity: string;
  shippingPostalCode: string;

  billingFullName: string;
  billingAddressLine1: string;
  billingAddressLine2: string | null;
  billingCountry: string;
  billingState: string;
  billingCity: string;
  billingPostalCode: string;

  shippingMethodId: string;
  shippingMethodLabel: string;
  shippingCost: number | string;

  subtotal: number | string;
  total: number | string;
  currency: string;

  couponCode: string | null;
  stripeSessionId: string | null;
  paidAt: string | null;

  // Sprint 7 / Step 19 - CJ Order Automation
  cjOrderId: string | null;
  cjOrderStatus: string | null;
  cjTrackingNumber: string | null;
  cjShippingCarrier: string | null;
  cjLastSyncedAt: string | null;
  cjSyncError: string | null;

  items: OrderItem[];
  createdAt: string;
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
    throw new OrderApiError(
      "Unable to reach the orders server. Make sure the API is running and try again.",
    );
  }

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // fall through to the status-based error below
  }

  if (!response.ok || !body?.success) {
    throw new OrderApiError(
      body?.message || `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return body;
}

export async function fetchOrder(id: string): Promise<Order> {
  const envelope = await requestEnvelope<Order>(`/orders/${encodeURIComponent(id)}`);
  return envelope.data;
}

/**
 * Confirms a Stripe Checkout Session and creates the order from it
 * (idempotent - safe to call again e.g. on a page refresh).
 */
export async function confirmStripeOrder(stripeSessionId: string): Promise<Order> {
  const envelope = await requestEnvelope<Order>("/orders", {
    method: "POST",
    body: JSON.stringify({ stripeSessionId }),
  });
  return envelope.data;
}

export interface DirectOrderInput {
  customer: { email: string; phone?: string };
  shipping: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    country: string;
    state: string;
    city: string;
    postalCode: string;
  };
  billing: DirectOrderInput["shipping"];
  couponCode?: string;
}

/**
 * Sprint 10 / Step 24 - Order Flow (Stripe temporarily off). Places an order
 * straight from the current cart, no payment gateway involved - the backend
 * always creates it as 'pending' (see order.service.js#createOrderFromCart),
 * never sends it to CJ automatically, and it appears in Admin Orders like
 * any other order. Used by checkout.tsx only while Stripe is unconfigured;
 * the Stripe flow (confirmStripeOrder above) takes over automatically once
 * real credentials are added, with no frontend changes needed.
 *
 * Sprint 10 / Step 25 - no shippingMethod/shippingCost input anymore: the
 * backend always resolves the real CJ shipping cost server-side from
 * shipping.country (see order.service.js#createOrderFromCart).
 */
export async function createDirectOrder(input: DirectOrderInput): Promise<Order> {
  const envelope = await requestEnvelope<Order>("/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return envelope.data;
}

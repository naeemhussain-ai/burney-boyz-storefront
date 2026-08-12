// Reusable API layer for initiating a Stripe Checkout payment. Talks only
// to our own backend's /api/checkout endpoint - the Stripe secret key never
// leaves the server, and the frontend never even sees a publishable key
// since we redirect to Stripe's hosted Checkout page (session.url) rather
// than using Stripe.js/Elements client-side.
import { getCartToken } from "@/lib/cartToken";

const API_BASE_URL =
  (import.meta.env.VITE_SHOPNOW_API_BASE_URL as string | undefined) || "http://localhost:5000/api";

export class CheckoutApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "CheckoutApiError";
    this.status = status;
  }
}

export interface CheckoutAddressInput {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  country: string;
  state: string;
  city: string;
  postalCode: string;
}

export interface CreateCheckoutSessionInput {
  customer: { email: string; phone?: string };
  shipping: CheckoutAddressInput;
  billing: CheckoutAddressInput;
  couponCode?: string;
}

// Sprint 10 / Step 25 - Real Shipping Pricing. "Our shipping charge" is now
// always CJ's real quoted cost for the cart + destination country (see
// backend/src/services/cjOrder.service.js#quoteShipping) - no more
// flat/free client-picked shipping methods.
export interface ShippingQuote {
  shippingCost: number;
  carrierLabel: string;
}

export class ShippingQuoteApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ShippingQuoteApiError";
    this.status = status;
  }
}

export async function fetchShippingQuote(country: string): Promise<ShippingQuote> {
  const headers = new Headers({ "Content-Type": "application/json" });
  const token = getCartToken();
  if (token) headers.set("X-Cart-Token", token);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/checkout/shipping-quote`, {
      method: "POST",
      headers,
      body: JSON.stringify({ country }),
    });
  } catch {
    throw new ShippingQuoteApiError(
      "Unable to reach the shipping server. Make sure the API is running and try again.",
    );
  }

  let body: { success: boolean; message: string; data: ShippingQuote } | null = null;
  try {
    body = await response.json();
  } catch {
    // fall through to the status-based error below
  }

  if (!response.ok || !body?.success) {
    throw new ShippingQuoteApiError(
      body?.message || `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return body.data;
}

// Sprint 10 / Step 24 - Order Flow (Stripe temporarily off). Reads the
// existing GET /api/health check (see backend/src/app.js) rather than
// adding a dedicated endpoint - checkout.tsx uses this to decide whether to
// go through Stripe Checkout or place a pending order directly, with zero
// frontend changes needed once real Stripe credentials are configured.
export async function fetchStripeStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const body = await response.json();
    return body?.data?.checks?.stripe?.status === "configured";
  } catch {
    // Health check unreachable - Stripe is unconfigured in this project
    // today regardless, so failing closed to the direct-order flow is the
    // safer default (never block checkout on a health-check hiccup).
    return false;
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  pagination: unknown;
  meta: Record<string, unknown>;
}

export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
): Promise<{ url: string; sessionId: string }> {
  const headers = new Headers({ "Content-Type": "application/json" });
  const token = getCartToken();
  if (token) headers.set("X-Cart-Token", token);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/checkout/create-session`, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });
  } catch {
    throw new CheckoutApiError(
      "Unable to reach the payment server. Make sure the API is running and try again.",
    );
  }

  let body: ApiEnvelope<{ url: string; sessionId: string }> | null = null;
  try {
    body = await response.json();
  } catch {
    // fall through to the status-based error below
  }

  if (!response.ok || !body?.success) {
    throw new CheckoutApiError(
      body?.message || `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return body.data;
}

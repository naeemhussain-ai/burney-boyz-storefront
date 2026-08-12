// Reusable API layer for customer accounts. Talks only to our own backend's
// /api/auth and /api/account endpoints. Independent from the ShopNow cart
// (src/api/cart.ts) - an account is not required to shop.
import { getAuthToken, setAuthToken } from "@/lib/authToken";
import type { Order } from "@/api/order";

const API_BASE_URL =
  (import.meta.env.VITE_SHOPNOW_API_BASE_URL as string | undefined) || "http://localhost:5000/api";

export class AuthApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
  }
}

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  createdAt: string;
  // Grants access to /admin and /api/admin/*; there is no separate admin
  // login/credential system - same User/JWT as customer accounts, gated by
  // this one flag.
  isAdmin: boolean;
  // Set by the separate /adminaccount request flow (see
  // registerAdminRequest below) - unrelated to normal customer registration,
  // which leaves this at 'none'.
  adminRequestStatus: "none" | "pending" | "approved" | "declined";
}

export interface Address {
  id: string;
  userId: string;
  label: string | null;
  fullName: string;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  country: string;
  state: string;
  city: string;
  postalCode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddressInput {
  label?: string;
  fullName: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  country: string;
  state: string;
  city: string;
  postalCode: string;
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
    throw new AuthApiError(
      "Unable to reach the account server. Make sure the API is running and try again.",
    );
  }

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // fall through to the status-based error below
  }

  if (!response.ok || !body?.success) {
    throw new AuthApiError(
      body?.message || `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return body;
}

export async function register(input: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<{ user: User; token: string }> {
  const envelope = await requestEnvelope<{ user: User; token: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setAuthToken(envelope.data.token);
  return envelope.data;
}

// Submits a request for admin access - a separate signup flow from
// register() above (see /adminaccount). Auto-logs the requester in, same as
// register(), so they land on a page showing their request as "pending".
export async function registerAdmin(input: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<{ user: User; token: string }> {
  const envelope = await requestEnvelope<{ user: User; token: string }>("/auth/register-admin", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setAuthToken(envelope.data.token);
  return envelope.data;
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<{ user: User; token: string }> {
  const envelope = await requestEnvelope<{ user: User; token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setAuthToken(envelope.data.token);
  return envelope.data;
}

export async function getMe(): Promise<User> {
  const envelope = await requestEnvelope<User>("/auth/me");
  return envelope.data;
}

export interface ForgotPasswordResult {
  message: string;
  devOnly?: { resetToken: string; resetUrl: string };
}

export async function forgotPassword(email: string): Promise<ForgotPasswordResult> {
  const envelope = await requestEnvelope<null>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return {
    message: envelope.message,
    devOnly: envelope.meta?.devOnly as ForgotPasswordResult["devOnly"],
  };
}

export async function resetPassword(input: { token: string; password: string }): Promise<void> {
  await requestEnvelope<null>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateProfile(input: {
  firstName?: string;
  lastName?: string;
  phone?: string;
}): Promise<User> {
  const envelope = await requestEnvelope<User>("/account/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return envelope.data;
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await requestEnvelope<null>("/account/password", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function listAddresses(): Promise<Address[]> {
  const envelope = await requestEnvelope<Address[]>("/account/addresses");
  return envelope.data;
}

export async function createAddress(input: AddressInput): Promise<Address> {
  const envelope = await requestEnvelope<Address>("/account/addresses", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return envelope.data;
}

export async function updateAddress(id: string, input: AddressInput): Promise<Address> {
  const envelope = await requestEnvelope<Address>(`/account/addresses/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return envelope.data;
}

export async function deleteAddress(id: string): Promise<void> {
  await requestEnvelope<null>(`/account/addresses/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function setDefaultAddress(id: string): Promise<Address[]> {
  const envelope = await requestEnvelope<Address[]>(
    `/account/addresses/${encodeURIComponent(id)}/default`,
    { method: "PATCH" },
  );
  return envelope.data;
}

export async function listMyOrders(): Promise<Order[]> {
  const envelope = await requestEnvelope<Order[]>("/account/orders");
  return envelope.data;
}

export async function getMyOrder(id: string): Promise<Order> {
  const envelope = await requestEnvelope<Order>(`/account/orders/${encodeURIComponent(id)}`);
  return envelope.data;
}

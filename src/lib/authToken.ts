// Persists the signed-in customer's JWT client-side. Mirrors
// src/lib/cartToken.ts's pattern exactly, kept as its own module (rather
// than reusing the cart one) since it's a distinct concern with its own key.

const STORAGE_KEY = "shopnow_auth_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // ignore - worst case the session just doesn't persist across reloads
  }
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

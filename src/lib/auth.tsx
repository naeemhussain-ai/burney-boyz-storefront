import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMe,
  login as loginRequest,
  register as registerRequest,
  registerAdmin as registerAdminRequest,
  AuthApiError,
  type User,
} from "@/api/auth";
import { getAuthToken, clearAuthToken } from "@/lib/authToken";

// Signed-in customer account state. Independent from CartProvider
// (src/lib/cart.tsx) - shopping/checkout never requires being logged in.

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  /** True while the initial "who am I" check (only runs if a token exists)
   * is in flight. Account pages should wait for this before redirecting to
   * /login, so a page refresh doesn't briefly bounce a logged-in user. */
  isLoading: boolean;
  login: (input: { email: string; password: string }) => Promise<User>;
  register: (input: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<User>;
  /** Separate admin-access-request signup - see /adminaccount. */
  registerAdmin: (input: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ME_QUERY_KEY = ["auth", "me"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: getMe,
    enabled: Boolean(getAuthToken()),
    retry: false,
    // An expired/invalid token should look "logged out", not error forever.
    throwOnError: false,
  });

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => queryClient.setQueryData(ME_QUERY_KEY, data.user),
  });

  const registerMutation = useMutation({
    mutationFn: registerRequest,
    onSuccess: (data) => queryClient.setQueryData(ME_QUERY_KEY, data.user),
  });

  const registerAdminMutation = useMutation({
    mutationFn: registerAdminRequest,
    onSuccess: (data) => queryClient.setQueryData(ME_QUERY_KEY, data.user),
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user ?? null,
      isAuthenticated: Boolean(user),
      isLoading: Boolean(getAuthToken()) && isLoading,
      login: async (input) => (await loginMutation.mutateAsync(input)).user,
      register: async (input) => (await registerMutation.mutateAsync(input)).user,
      registerAdmin: async (input) => (await registerAdminMutation.mutateAsync(input)).user,
      logout: () => {
        clearAuthToken();
        queryClient.setQueryData(ME_QUERY_KEY, null);
        queryClient.removeQueries({ queryKey: ["account"] });
        queryClient.removeQueries({ queryKey: ["wishlist"] });
      },
    }),
    [user, isLoading, loginMutation, registerMutation, registerAdminMutation, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

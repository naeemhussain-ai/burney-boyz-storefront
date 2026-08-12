import { useEffect, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

// Component-level guard for /account/* pages. Waits for the initial "who am
// I" check before deciding, so a page refresh doesn't briefly bounce an
// already-logged-in user to /login.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/login", search: { redirect: pathname } });
    }
  }, [isLoading, isAuthenticated, navigate, pathname]);

  if (isLoading || !isAuthenticated) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </section>
    );
  }

  return <>{children}</>;
}

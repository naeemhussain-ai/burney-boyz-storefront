import { useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Sprint 10 / Step 24 - Admin Security. Component-level guard for /admin/*,
// mirroring src/components/account/RequireAuth.tsx: waits for the initial
// "who am I" check before deciding, so a page refresh doesn't briefly bounce
// an already-logged-in admin. Unlike RequireAuth, a logged-in non-admin is
// shown "Access denied" in place rather than redirected - there's nowhere
// more appropriate to send them, and silently bouncing them to /login would
// just loop.
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/login", search: { redirect: pathname } });
    }
  }, [isLoading, isAuthenticated, navigate, pathname]);

  if (isLoading || !isAuthenticated) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </section>
    );
  }

  if (!user?.isAdmin) {
    // Sprint 10 / Step 26 - Admin Access Requests. Tailor the message to
    // where this account actually is in the request flow, instead of a
    // generic "access denied" for every non-admin case.
    const status = user?.adminRequestStatus;
    const { title, description } =
      status === "pending"
        ? {
            title: "Request pending",
            description:
              "Your admin access request is still awaiting review. You'll get an email once it's decided.",
          }
        : status === "declined"
          ? {
              title: "Request declined",
              description: "Your admin access request was not approved.",
            }
          : {
              title: "Access denied",
              description:
                "This account doesn't have admin access. Request access to continue.",
            };

    return (
      <section className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {status !== "pending" && status !== "declined" && (
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/adminaccount">Request Access</Link>
            </Button>
          )}
          <Button asChild className="rounded-full">
            <Link to="/">Back to Store</Link>
          </Button>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}

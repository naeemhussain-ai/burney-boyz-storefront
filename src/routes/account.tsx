import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Heart, LogOut, MapPin, Package, User } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/account/RequireAuth";
import { PageHero } from "@/components/layout/PageHero";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [{ title: "My Account - Burney Boyz" }],
  }),
  component: AccountLayout,
});

const TABS = [
  { to: "/account/profile", label: "Profile", icon: User },
  { to: "/account/orders", label: "Orders", icon: Package },
  { to: "/account/addresses", label: "Addresses", icon: MapPin },
  { to: "/account/wishlist", label: "Wishlist", icon: Heart },
] as const;

// Exactly "/account" (see account.index.tsx) handles its own redirect to
// /login or /account/profile depending on auth state, so it's left outside
// RequireAuth here to avoid a double redirect. Every /account/* sub-path
// (profile, orders, addresses, wishlist) is the customer account section,
// gated by RequireAuth below.
function AccountLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (pathname === "/account") {
    return <Outlet />;
  }

  return (
    <RequireAuth>
      <AccountLayoutContent />
    </RequireAuth>
  );
}

function AccountLayoutContent() {
  const { user, logout } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email;

  const handleLogout = () => {
    logout();
    toast.success("Logged out");
    navigate({ to: "/" });
  };

  return (
    <>
      <PageHero
        eyebrow="Account"
        title={`Hi, ${displayName?.split(" ")[0] || "there"}`}
        description="Manage your profile, orders, addresses, and wishlist."
      />

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
          {/* Sidebar on desktop, horizontal scroller on mobile */}
          <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
            {TABS.map((tab) => {
              const active = pathname.startsWith(tab.to);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={cn(
                    "flex flex-shrink-0 items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition-colors lg:flex-shrink",
                    active
                      ? "bg-primary-soft font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-primary-soft/60 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={handleLogout}
              className="flex flex-shrink-0 items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive lg:flex-shrink lg:mt-4"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </nav>

          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </section>
    </>
  );
}

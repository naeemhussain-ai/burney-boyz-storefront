import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  CloudDownload,
  LayoutDashboard,
  LogOut,
  PackageSearch,
  ShoppingBag,
  Star,
  Store,
  UserCheck,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { RequireAdmin } from "@/components/admin/RequireAdmin";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin - Burney Boyz" }] }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag, exact: false },
  { to: "/admin/products", label: "Products", icon: PackageSearch, exact: false },
  { to: "/admin/reviews", label: "Reviews", icon: Star, exact: false },
  { to: "/admin/cj-import", label: "CJ Import", icon: CloudDownload, exact: false },
  { to: "/admin/inventory", label: "Inventory", icon: Warehouse, exact: false },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3, exact: false },
  { to: "/admin/access-requests", label: "Access Requests", icon: UserCheck, exact: false },
] as const;

// Deliberately does NOT wrap <Outlet/> in its own mx-auto/max-w/padding
// container - admin.products.tsx (pre-existing) already applies its own
// "mx-auto max-w-7xl px-4 py-10" wrapper, and double-nesting that inside
// another constrained container would visually squash it. Every admin page,
// new or old, wraps its own content the same way this layout leaves room for.
function AdminLayout() {
  return (
    <RequireAdmin>
      <AdminLayoutContent />
    </RequireAdmin>
  );
}

function AdminLayoutContent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success("Logged out");
    navigate({ to: "/" });
  };

  return (
    <div>
      <div className="border-b bg-muted/30">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Admin</p>
            <h1 className="text-2xl font-bold md:text-3xl">Burney Boyz Admin</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary-soft hover:text-foreground sm:px-4"
            >
              <Store className="h-4 w-4" /> Back to Store
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive sm:px-4"
            >
              <LogOut className="h-4 w-4" /> Log Out
            </button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <Outlet />
    </div>
  );
}

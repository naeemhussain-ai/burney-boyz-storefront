import { createFileRoute, Outlet } from "@tanstack/react-router";

// Pathless layout for /admin/orders/* - the list lives in admin.orders.index.tsx
// and the detail page in admin.orders.$id.tsx. Needs to render <Outlet /> so
// those child routes actually mount instead of this route's own (empty) leaf.
export const Route = createFileRoute("/admin/orders")({
  component: () => <Outlet />,
});

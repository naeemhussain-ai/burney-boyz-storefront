import { createFileRoute, Outlet } from "@tanstack/react-router";

// Pathless layout for /account/orders/* - the list lives in account.orders.index.tsx
// and the detail page in account.orders.$id.tsx. Needs to render <Outlet /> so
// those child routes actually mount instead of this route's own (empty) leaf.
export const Route = createFileRoute("/account/orders")({
  component: () => <Outlet />,
});

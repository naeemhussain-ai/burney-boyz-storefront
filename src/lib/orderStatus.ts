import type { OrderStatus } from "@/api/order";

// Shared between customer order history/detail and the admin orders panel.
export const ORDER_STATUS_VARIANT: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  paid: "default",
  processing: "default",
  shipped: "outline",
  delivered: "outline",
  cancelled: "destructive",
  refunded: "destructive",
};

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

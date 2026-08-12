// Read-only aggregation for the admin dashboard overview. Pure queries -
// doesn't write anything, so it can't affect ShopNow/checkout in any way.
const prisma = require('../config/prisma');

// Orders that represent real, collected revenue - excludes carts that never
// paid (pending) and money that was given back (cancelled/refunded).
const REVENUE_STATUSES = ['paid', 'processing', 'shipped', 'delivered'];

const RECENT_ORDERS_TAKE = 8;
const TOP_PRODUCTS_TAKE = 5;
const FEATURED_PRODUCTS_TAKE = 8;

async function getDashboardStats() {
  const [
    revenueAgg,
    ordersCount,
    productsCount,
    distinctCustomers,
    featuredProducts,
    recentOrders,
    topProductsRaw,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { in: REVENUE_STATUSES } },
      _sum: { total: true },
    }),
    prisma.order.count(),
    prisma.product.count(),
    prisma.order.findMany({ distinct: ['customerEmail'], select: { customerEmail: true } }),
    prisma.product.findMany({
      where: { featured: true },
      orderBy: { updatedAt: 'desc' },
      take: FEATURED_PRODUCTS_TAKE,
    }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: RECENT_ORDERS_TAKE,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        customerEmail: true,
        customerName: true,
        total: true,
        createdAt: true,
      },
    }),
    prisma.orderItem.groupBy({
      by: ['productId', 'name'],
      where: { productId: { not: null } },
      _sum: { quantity: true, lineTotal: true },
      _max: { image: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: TOP_PRODUCTS_TAKE,
    }),
  ]);

  return {
    revenue: revenueAgg._sum.total ?? 0,
    ordersCount,
    productsCount,
    customersCount: distinctCustomers.length,
    featuredProducts,
    recentOrders,
    topProducts: topProductsRaw.map((row) => ({
      productId: row.productId,
      name: row.name,
      image: row._max.image,
      quantitySold: row._sum.quantity ?? 0,
      revenue: row._sum.lineTotal ?? 0,
    })),
  };
}

module.exports = { getDashboardStats, REVENUE_STATUSES };

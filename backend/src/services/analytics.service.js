// Sprint 9 / Step 23 - Analytics & Reports. Pure read/aggregation, same
// architecture as adminDashboard.service.js (Promise.all of independent
// Prisma queries, no writes) - reuses its REVENUE_STATUSES definition and
// order.service.js's ORDER_STATUSES so "what counts as revenue" and "what
// statuses exist" are never defined twice.
const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const { REVENUE_STATUSES } = require('./adminDashboard.service');
const { ORDER_STATUSES } = require('./order.service');
const { ValidationError } = require('../utils/errors');

const DEFAULT_RANGE_DAYS = 30;
const MAX_EXPORT_ROWS = 10000;

// Shared date-range parsing for every report below. `to` is inclusive of
// the whole day when given as a bare date (no time component) - a report
// for "2026-08-01 to 2026-08-08" should include everything on the 8th.
function parseDateRange({ from, to } = {}) {
  const end = to ? new Date(to) : new Date();
  if (Number.isNaN(end.getTime())) throw new ValidationError('`to` is not a valid date');
  if (to && !/T/.test(String(to))) end.setHours(23, 59, 59, 999);

  const start = from
    ? new Date(from)
    : new Date(end.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);
  if (Number.isNaN(start.getTime())) throw new ValidationError('`from` is not a valid date');

  return { start, end };
}

/**
 * Revenue + order counts for a date range - the headline numbers for the
 * Analytics page's stat cards.
 */
async function getOverview({ from, to } = {}) {
  const { start, end } = parseDateRange({ from, to });
  const where = { createdAt: { gte: start, lte: end } };

  const [byStatusRaw, totalOrders, revenueAgg, distinctCustomers] = await Promise.all([
    prisma.order.groupBy({ by: ['status'], where, _count: { _all: true } }),
    prisma.order.count({ where }),
    prisma.order.aggregate({
      where: { ...where, status: { in: REVENUE_STATUSES } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.order.findMany({ where, distinct: ['customerEmail'], select: { customerEmail: true } }),
  ]);

  const ordersByStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
  byStatusRaw.forEach((row) => {
    ordersByStatus[row.status] = row._count._all;
  });

  const revenue = Number(revenueAgg._sum.total || 0);
  const revenueOrderCount = revenueAgg._count._all || 0;

  return {
    range: { from: start.toISOString(), to: end.toISOString() },
    totalOrders,
    ordersByStatus,
    revenue,
    averageOrderValue: revenueOrderCount ? revenue / revenueOrderCount : 0,
    customersCount: distinctCustomers.length,
  };
}

async function getDailyRevenue({ days = DEFAULT_RANGE_DAYS } = {}) {
  const safeDays = Math.max(1, Math.min(365, Number(days) || DEFAULT_RANGE_DAYS));
  const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

  const rows = await prisma.$queryRaw`
    SELECT DATE_TRUNC('day', "createdAt")::date AS bucket,
           COALESCE(SUM(total), 0)::float AS revenue,
           COUNT(*)::int AS orders
    FROM orders
    WHERE status IN (${Prisma.join(REVENUE_STATUSES)})
      AND "createdAt" >= ${since}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  return rows.map((r) => ({
    date: r.bucket.toISOString().slice(0, 10),
    revenue: r.revenue,
    orders: r.orders,
  }));
}

async function getMonthlyRevenue({ months = 12 } = {}) {
  const safeMonths = Math.max(1, Math.min(60, Number(months) || 12));
  const since = new Date();
  since.setMonth(since.getMonth() - safeMonths);

  const rows = await prisma.$queryRaw`
    SELECT DATE_TRUNC('month', "createdAt")::date AS bucket,
           COALESCE(SUM(total), 0)::float AS revenue,
           COUNT(*)::int AS orders
    FROM orders
    WHERE status IN (${Prisma.join(REVENUE_STATUSES)})
      AND "createdAt" >= ${since}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  return rows.map((r) => ({
    month: r.bucket.toISOString().slice(0, 7),
    revenue: r.revenue,
    orders: r.orders,
  }));
}

async function getBestSellingProducts({ limit = 10, from, to } = {}) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10));
  const { start, end } = parseDateRange({ from, to });

  const rows = await prisma.orderItem.groupBy({
    by: ['productId', 'name'],
    where: {
      productId: { not: null },
      order: { status: { in: REVENUE_STATUSES }, createdAt: { gte: start, lte: end } },
    },
    _sum: { quantity: true, lineTotal: true },
    _max: { image: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: safeLimit,
  });

  return rows.map((r) => ({
    productId: r.productId,
    name: r.name,
    image: r._max.image,
    quantitySold: r._sum.quantity ?? 0,
    revenue: r._sum.lineTotal ?? 0,
  }));
}

// Categories aren't stored on OrderItem (only a name/image/sku snapshot),
// so this joins back to Product for categoryName - unlike the other reports
// here, a raw query is unavoidable since Prisma's groupBy can't aggregate
// across a joined table's column.
async function getTopCategories({ limit = 10, from, to } = {}) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10));
  const { start, end } = parseDateRange({ from, to });

  const rows = await prisma.$queryRaw`
    SELECT COALESCE(p."categoryName", 'Uncategorized') AS category,
           SUM(oi.quantity)::int AS "quantitySold",
           SUM(oi."lineTotal")::float AS revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi."orderId"
    LEFT JOIN products p ON p.id = oi."productId"
    WHERE o.status IN (${Prisma.join(REVENUE_STATUSES)})
      AND o."createdAt" BETWEEN ${start} AND ${end}
    GROUP BY category
    ORDER BY revenue DESC
    LIMIT ${safeLimit}
  `;

  return rows.map((r) => ({ category: r.category, quantitySold: r.quantitySold, revenue: r.revenue }));
}

async function getTopCustomers({ limit = 10, from, to } = {}) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10));
  const { start, end } = parseDateRange({ from, to });

  const rows = await prisma.order.groupBy({
    by: ['customerEmail'],
    where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: start, lte: end } },
    _sum: { total: true },
    _count: { _all: true },
    _max: { customerName: true },
    orderBy: { _sum: { total: 'desc' } },
    take: safeLimit,
  });

  return rows.map((r) => ({
    email: r.customerEmail,
    name: r._max.customerName,
    ordersCount: r._count._all,
    totalSpent: r._sum.total ?? 0,
  }));
}

// --- Export (CSV / Excel) ---------------------------------------------

// Flat, spreadsheet-ready order rows - the source data for both export
// formats below so they can never drift out of sync with each other.
async function getOrdersReportRows({ from, to, status } = {}) {
  const { start, end } = parseDateRange({ from, to });
  const where = { createdAt: { gte: start, lte: end } };
  if (status) {
    if (!ORDER_STATUSES.includes(status)) {
      throw new ValidationError(`status must be one of: ${ORDER_STATUSES.join(', ')}`);
    }
    where.status = status;
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: MAX_EXPORT_ROWS,
    select: {
      orderNumber: true,
      status: true,
      customerEmail: true,
      customerName: true,
      subtotal: true,
      shippingCost: true,
      total: true,
      currency: true,
      createdAt: true,
      paidAt: true,
    },
  });

  return orders.map((o) => ({
    'Order Number': o.orderNumber,
    Status: o.status,
    'Customer Email': o.customerEmail,
    'Customer Name': o.customerName || '',
    Subtotal: Number(o.subtotal),
    Shipping: Number(o.shippingCost),
    Total: Number(o.total),
    Currency: o.currency,
    'Created At': o.createdAt.toISOString(),
    'Paid At': o.paidAt ? o.paidAt.toISOString() : '',
  }));
}

function rowsToCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value) => {
    const s = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) lines.push(headers.map((h) => escape(row[h])).join(','));
  return lines.join('\n');
}

async function rowsToExcelBuffer(rows, sheetName = 'Report') {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  const headers = rows.length ? Object.keys(rows[0]) : [];
  sheet.columns = headers.map((key) => ({ header: key, key, width: 20 }));
  if (rows.length) sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };

  return workbook.xlsx.writeBuffer();
}

module.exports = {
  parseDateRange,
  getOverview,
  getDailyRevenue,
  getMonthlyRevenue,
  getBestSellingProducts,
  getTopCategories,
  getTopCustomers,
  getOrdersReportRows,
  rowsToCsv,
  rowsToExcelBuffer,
};

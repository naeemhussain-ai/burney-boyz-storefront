// Sprint 9 / Step 22 - Inventory Automation. Read-side aggregation (low
// stock / out of stock / sync logs) plus the retry-failed action. All actual
// CJ-calling sync logic lives in productSync.service.js - this file never
// talks to CJ directly, it only queries the results sync writes to Postgres.
const prisma = require('../config/prisma');
const productSyncService = require('./productSync.service');

// A product counts as "low stock" once its total stock (summed across
// variants) is at or under this many units, but still above zero - a
// store-wide default, overridable per-request via ?threshold=.
const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD) || 5;

const RECENT_LOGS_TAKE = 5;

function paginationOf(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

function safePaging({ page = 1, limit = 20 } = {}) {
  return {
    page: Math.max(1, Number(page) || 1),
    limit: Math.max(1, Math.min(100, Number(limit) || 20)),
  };
}

// Products with at least one variant in stock but at/under `threshold` total
// units. No variants at all is treated as out-of-stock, not low-stock (see
// getOutOfStockProducts) - matches shop.service.js's existing availability
// filter semantics.
async function getLowStockProducts({ threshold = LOW_STOCK_THRESHOLD, page, limit } = {}) {
  const safeThreshold = Math.max(0, Number(threshold) || LOW_STOCK_THRESHOLD);
  const { page: safePage, limit: safeLimit } = safePaging({ page, limit });
  const offset = (safePage - 1) * safeLimit;

  const [products, totalRows] = await Promise.all([
    prisma.$queryRaw`
      SELECT p.id, p.name, p.slug, p.image, p."myPrice", p.status,
             COALESCE(SUM(v.stock), 0)::int AS "totalStock"
      FROM products p
      LEFT JOIN variants v ON v."productId" = p.id
      GROUP BY p.id
      HAVING COALESCE(SUM(v.stock), 0) > 0 AND COALESCE(SUM(v.stock), 0) <= ${safeThreshold}
      ORDER BY "totalStock" ASC, p.name ASC
      LIMIT ${safeLimit} OFFSET ${offset}
    `,
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS count FROM (
        SELECT p.id FROM products p
        LEFT JOIN variants v ON v."productId" = p.id
        GROUP BY p.id
        HAVING COALESCE(SUM(v.stock), 0) > 0 AND COALESCE(SUM(v.stock), 0) <= ${safeThreshold}
      ) t
    `,
  ]);

  const total = Number(totalRows[0]?.count || 0);
  return { threshold: safeThreshold, products, pagination: paginationOf(safePage, safeLimit, total) };
}

// Products with zero total stock, including products with no variants at
// all - nothing to sell either way.
async function getOutOfStockProducts({ page, limit } = {}) {
  const { page: safePage, limit: safeLimit } = safePaging({ page, limit });
  const offset = (safePage - 1) * safeLimit;

  const [products, totalRows] = await Promise.all([
    prisma.$queryRaw`
      SELECT p.id, p.name, p.slug, p.image, p."myPrice", p.status
      FROM products p
      LEFT JOIN variants v ON v."productId" = p.id
      GROUP BY p.id
      HAVING COALESCE(SUM(v.stock), 0) = 0
      ORDER BY p.name ASC
      LIMIT ${safeLimit} OFFSET ${offset}
    `,
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS count FROM (
        SELECT p.id FROM products p
        LEFT JOIN variants v ON v."productId" = p.id
        GROUP BY p.id
        HAVING COALESCE(SUM(v.stock), 0) = 0
      ) t
    `,
  ]);

  const total = Number(totalRows[0]?.count || 0);
  return { products, pagination: paginationOf(safePage, safeLimit, total) };
}

async function getSyncLogs({ page, limit } = {}) {
  const { page: safePage, limit: safeLimit } = safePaging({ page, limit });

  const [logs, total] = await Promise.all([
    prisma.syncLog.findMany({
      orderBy: { startedAt: 'desc' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    }),
    prisma.syncLog.count(),
  ]);

  return { logs, pagination: paginationOf(safePage, safeLimit, total) };
}

async function getOverview() {
  const [lastSync, totalProducts, lowStockRows, outOfStockRows, recentSyncLogs] = await Promise.all([
    prisma.syncLog.findFirst({ where: { finishedAt: { not: null } }, orderBy: { startedAt: 'desc' } }),
    prisma.product.count(),
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS count FROM (
        SELECT p.id FROM products p
        LEFT JOIN variants v ON v."productId" = p.id
        GROUP BY p.id
        HAVING COALESCE(SUM(v.stock), 0) > 0 AND COALESCE(SUM(v.stock), 0) <= ${LOW_STOCK_THRESHOLD}
      ) t
    `,
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS count FROM (
        SELECT p.id FROM products p
        LEFT JOIN variants v ON v."productId" = p.id
        GROUP BY p.id
        HAVING COALESCE(SUM(v.stock), 0) = 0
      ) t
    `,
    prisma.syncLog.findMany({ orderBy: { startedAt: 'desc' }, take: RECENT_LOGS_TAKE }),
  ]);

  return {
    lastSync,
    totalProducts,
    lowStockThreshold: LOW_STOCK_THRESHOLD,
    lowStockCount: Number(lowStockRows[0]?.count || 0),
    outOfStockCount: Number(outOfStockRows[0]?.count || 0),
    recentSyncLogs,
  };
}

// Sprint 9 / Step 22 - retries every product currently flagged
// lastSyncStatus='error'. Thin passthrough to productSync.service so there
// is exactly one place that knows how to run/log a sync batch.
async function retryFailedSyncs({ triggeredBy = 'admin' } = {}) {
  return productSyncService.retryFailedSyncs({ triggeredBy });
}

module.exports = {
  LOW_STOCK_THRESHOLD,
  getOverview,
  getLowStockProducts,
  getOutOfStockProducts,
  getSyncLogs,
  retryFailedSyncs,
};

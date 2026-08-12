// Sprint 9 / Step 22 - Inventory Automation. Thin controllers, same
// {success,message,data,pagination,meta} envelope as every other admin
// endpoint (see utils/apiResponse.js) - all real logic lives in
// inventory.service.js / productSync.service.js.
const inventoryService = require('../services/inventory.service');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/admin/inventory/overview
 */
exports.getOverview = async (req, res, next) => {
  try {
    const overview = await inventoryService.getOverview();
    sendSuccess(res, { message: 'Inventory overview retrieved successfully', data: overview });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/inventory/low-stock?threshold=&page=&limit=
 */
exports.getLowStockProducts = async (req, res, next) => {
  try {
    const { threshold, page, limit } = req.query;
    const result = await inventoryService.getLowStockProducts({ threshold, page, limit });
    sendSuccess(res, {
      message: 'Low stock products retrieved successfully',
      data: result.products,
      pagination: result.pagination,
      meta: { threshold: result.threshold },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/inventory/out-of-stock?page=&limit=
 */
exports.getOutOfStockProducts = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await inventoryService.getOutOfStockProducts({ page, limit });
    sendSuccess(res, {
      message: 'Out of stock products retrieved successfully',
      data: result.products,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/inventory/sync-logs?page=&limit=
 */
exports.getSyncLogs = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await inventoryService.getSyncLogs({ page, limit });
    sendSuccess(res, {
      message: 'Sync logs retrieved successfully',
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/inventory/retry-failed
 */
exports.retryFailedSyncs = async (req, res, next) => {
  try {
    const summary = await inventoryService.retryFailedSyncs({ triggeredBy: 'admin' });
    sendSuccess(res, {
      message: summary.total
        ? `Retried ${summary.total} failed product(s) - ${summary.succeeded} succeeded, ${summary.failed} still failing.`
        : 'No failed syncs to retry.',
      data: summary,
    });
  } catch (err) {
    next(err);
  }
};

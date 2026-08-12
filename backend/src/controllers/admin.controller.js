const localProductService = require('../services/localProduct.service');
const orderService = require('../services/order.service');
const dashboardService = require('../services/adminDashboard.service');
const productSyncService = require('../services/productSync.service');
const cjOrderService = require('../services/cjOrder.service');
const reviewService = require('../services/review.service');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * PATCH /api/admin/products/:id
 * Edits a locally-stored product. Only whitelisted fields are writable -
 * see ADMIN_UPDATABLE_FIELDS in localProduct.service.js.
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await localProductService.updateProduct(req.params.id, req.body || {});
    sendSuccess(res, { message: 'Product updated successfully', data: product });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/products/:id/sync
 * Sprint 7 / Step 18 - CJ Auto Sync, single product.
 */
exports.syncProduct = async (req, res, next) => {
  try {
    const result = await productSyncService.syncProduct(req.params.id, { type: 'single', triggeredBy: 'admin' });
    sendSuccess(res, {
      message:
        result.status === 'success'
          ? `Product synced${result.changedFields.length ? ` - ${result.changedFields.length} field(s) updated` : ' - already up to date'}.`
          : `Sync failed: ${result.error}`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/products/sync-all
 * Sprint 7 / Step 18 - CJ Auto Sync, full catalog. Synchronous - awaits the
 * whole run (CJ's 1 req/sec throttle already serializes it) and returns a
 * summary.
 */
exports.syncAllProducts = async (req, res, next) => {
  try {
    const summary = await productSyncService.syncAllProducts({ type: 'manual', triggeredBy: 'admin' });
    sendSuccess(res, {
      message: `Synced ${summary.total} product(s) - ${summary.changed} changed, ${summary.unchanged} unchanged, ${summary.failed} failed.`,
      data: summary,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/reviews?status=pending&page=&limit=
 */
exports.listReviews = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const result = await reviewService.listReviewsForAdmin({ status, page, limit });
    sendSuccess(res, { message: 'Reviews retrieved successfully', data: result.reviews, pagination: result.pagination, meta: { count: result.reviews.length } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/reviews/:id/status
 * Body: { status }
 */
exports.setReviewStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const review = await reviewService.setReviewStatus(id, status);
    sendSuccess(res, { message: 'Review status updated', data: review });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/orders/:id/sync-tracking
 * Sprint 7 / Step 19 - manual on-demand CJ tracking refresh (the automatic
 * path re-syncs lazily whenever an order is viewed; this bypasses that
 * throttle for an immediate check).
 */
exports.syncOrderTracking = async (req, res, next) => {
  try {
    const order = await cjOrderService.syncCjOrderStatus(req.params.id, { force: true });
    sendSuccess(res, { message: 'CJ tracking refreshed', data: order });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/orders?search=&status=&page=&limit=
 */
exports.listOrders = async (req, res, next) => {
  try {
    const { page, limit, status, search } = req.query;
    const { orders, pagination } = await orderService.listOrders({ page, limit, status, search });
    sendSuccess(res, {
      message: 'Orders retrieved successfully',
      data: orders,
      pagination,
      meta: { count: orders.length },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/orders/:id
 */
exports.getOrder = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    sendSuccess(res, { message: 'Order retrieved successfully', data: order });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/orders/:id/status
 * Body: { status }
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const order = await orderService.updateOrderStatus(req.params.id, req.body?.status);
    sendSuccess(res, { message: 'Order status updated', data: order });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/orders/:id/send-to-cj
 * Sprint 10 / Step 24 - CJ Order Flow. Manual, admin-triggered push to CJ -
 * never automatic for a pending/unpaid order (guarded in
 * cjOrder.service.js#createCjOrderForOrder). Unlike the fire-and-forget
 * post-payment call site, errors here surface directly to the admin.
 */
exports.sendOrderToCj = async (req, res, next) => {
  try {
    const alreadySent = await orderService
      .getOrderById(req.params.id)
      .then((o) => Boolean(o.cjOrderId))
      .catch(() => false);

    const order = await cjOrderService.createCjOrderForOrder(req.params.id);
    sendSuccess(res, {
      message: alreadySent
        ? `Order was already sent to CJ (CJ order ${order.cjOrderId}).`
        : `Order sent to CJ successfully (CJ order ${order.cjOrderId}).`,
      data: order,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/dashboard
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const stats = await dashboardService.getDashboardStats();
    sendSuccess(res, { message: 'Dashboard stats retrieved successfully', data: stats });
  } catch (err) {
    next(err);
  }
};

// Sprint 9 / Step 23 - Analytics & Reports. Thin controllers over
// analytics.service.js, same envelope/pattern as admin.controller.js.
const analyticsService = require('../services/analytics.service');
const { sendSuccess } = require('../utils/apiResponse');

const EXPORT_FILENAME_BASE = 'burney-boyz-orders-report';

exports.getOverview = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const overview = await analyticsService.getOverview({ from, to });
    sendSuccess(res, { message: 'Analytics overview retrieved successfully', data: overview });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/analytics/revenue/daily?days=
 */
exports.getDailyRevenue = async (req, res, next) => {
  try {
    const { days } = req.query;
    const data = await analyticsService.getDailyRevenue({ days });
    sendSuccess(res, { message: 'Daily revenue retrieved successfully', data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/analytics/revenue/monthly?months=
 */
exports.getMonthlyRevenue = async (req, res, next) => {
  try {
    const { months } = req.query;
    const data = await analyticsService.getMonthlyRevenue({ months });
    sendSuccess(res, { message: 'Monthly revenue retrieved successfully', data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/analytics/best-sellers?limit=&from=&to=
 */
exports.getBestSellers = async (req, res, next) => {
  try {
    const { limit, from, to } = req.query;
    const data = await analyticsService.getBestSellingProducts({ limit, from, to });
    sendSuccess(res, { message: 'Best selling products retrieved successfully', data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/analytics/top-categories?limit=&from=&to=
 */
exports.getTopCategories = async (req, res, next) => {
  try {
    const { limit, from, to } = req.query;
    const data = await analyticsService.getTopCategories({ limit, from, to });
    sendSuccess(res, { message: 'Top categories retrieved successfully', data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/analytics/top-customers?limit=&from=&to=
 */
exports.getTopCustomers = async (req, res, next) => {
  try {
    const { limit, from, to } = req.query;
    const data = await analyticsService.getTopCustomers({ limit, from, to });
    sendSuccess(res, { message: 'Top customers retrieved successfully', data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/analytics/export.csv?from=&to=&status=
 * Not wrapped in the usual JSON envelope - this streams a file download.
 */
exports.exportCsv = async (req, res, next) => {
  try {
    const { from, to, status } = req.query;
    const rows = await analyticsService.getOrdersReportRows({ from, to, status });
    const csv = analyticsService.rowsToCsv(rows);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${EXPORT_FILENAME_BASE}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/analytics/export.xlsx?from=&to=&status=
 */
exports.exportExcel = async (req, res, next) => {
  try {
    const { from, to, status } = req.query;
    const rows = await analyticsService.getOrdersReportRows({ from, to, status });
    const buffer = await analyticsService.rowsToExcelBuffer(rows, 'Orders');

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${EXPORT_FILENAME_BASE}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
};

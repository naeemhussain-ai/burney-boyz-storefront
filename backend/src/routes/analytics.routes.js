const express = require('express');
const router = express.Router();

const analyticsController = require('../controllers/analytics.controller');

// GET /api/admin/analytics/overview?from=&to=
router.get('/overview', analyticsController.getOverview);
// GET /api/admin/analytics/revenue/daily?days=
router.get('/revenue/daily', analyticsController.getDailyRevenue);
// GET /api/admin/analytics/revenue/monthly?months=
router.get('/revenue/monthly', analyticsController.getMonthlyRevenue);
// GET /api/admin/analytics/best-sellers?limit=&from=&to=
router.get('/best-sellers', analyticsController.getBestSellers);
// GET /api/admin/analytics/top-categories?limit=&from=&to=
router.get('/top-categories', analyticsController.getTopCategories);
// GET /api/admin/analytics/top-customers?limit=&from=&to=
router.get('/top-customers', analyticsController.getTopCustomers);
// GET /api/admin/analytics/export.csv?from=&to=&status=
router.get('/export.csv', analyticsController.exportCsv);
// GET /api/admin/analytics/export.xlsx?from=&to=&status=
router.get('/export.xlsx', analyticsController.exportExcel);

module.exports = router;

const express = require('express');
const router = express.Router();

const inventoryController = require('../controllers/inventory.controller');

// GET /api/admin/inventory/overview
router.get('/overview', inventoryController.getOverview);
// GET /api/admin/inventory/low-stock?threshold=&page=&limit=
router.get('/low-stock', inventoryController.getLowStockProducts);
// GET /api/admin/inventory/out-of-stock?page=&limit=
router.get('/out-of-stock', inventoryController.getOutOfStockProducts);
// GET /api/admin/inventory/sync-logs?page=&limit=
router.get('/sync-logs', inventoryController.getSyncLogs);
// POST /api/admin/inventory/retry-failed
router.post('/retry-failed', inventoryController.retryFailedSyncs);

module.exports = router;

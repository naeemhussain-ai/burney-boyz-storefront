const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin.controller');

// PATCH /api/admin/products/:id
router.patch('/products/:id', adminController.updateProduct);
// POST /api/admin/products/:id/sync
router.post('/products/:id/sync', adminController.syncProduct);
// POST /api/admin/products/sync-all
router.post('/products/sync-all', adminController.syncAllProducts);

// GET /api/admin/orders?search=&status=&page=&limit=
router.get('/orders', adminController.listOrders);
// GET /api/admin/orders/:id
router.get('/orders/:id', adminController.getOrder);
// PATCH /api/admin/orders/:id/status
router.patch('/orders/:id/status', adminController.updateOrderStatus);
// POST /api/admin/orders/:id/sync-tracking
router.post('/orders/:id/sync-tracking', adminController.syncOrderTracking);
// POST /api/admin/orders/:id/send-to-cj
router.post('/orders/:id/send-to-cj', adminController.sendOrderToCj);

// GET /api/admin/dashboard
router.get('/dashboard', adminController.getDashboard);

// Reviews moderation
router.get('/reviews', adminController.listReviews);
router.patch('/reviews/:id/status', adminController.setReviewStatus);

module.exports = router;

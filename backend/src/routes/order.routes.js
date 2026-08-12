const express = require('express');
const router = express.Router();

const orderController = require('../controllers/order.controller');

// GET /api/orders?page=&limit=
router.get('/', orderController.listOrders);

// POST /api/orders
router.post('/', orderController.createOrder);

// GET /api/orders/:id
router.get('/:id', orderController.getOrder);

module.exports = router;

const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cart.controller');

// GET /api/cart
router.get('/', cartController.getCart);

// POST /api/cart
router.post('/', cartController.addItem);

// PATCH /api/cart/:itemId
router.patch('/:itemId', cartController.updateItem);

// DELETE /api/cart/:itemId
router.delete('/:itemId', cartController.removeItem);

// DELETE /api/cart
router.delete('/', cartController.clearCart);

module.exports = router;

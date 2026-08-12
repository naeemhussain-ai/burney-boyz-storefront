const express = require('express');
const router = express.Router();

const localProductController = require('../controllers/localProduct.controller');

// GET /api/local-products
router.get('/local-products', localProductController.list);

// GET /api/local-products/:id
router.get('/local-products/:id', localProductController.getById);

// POST /api/local-products
router.post('/local-products', localProductController.create);

module.exports = router;

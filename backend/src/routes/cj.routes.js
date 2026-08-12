const express = require('express');
const router = express.Router();

const cjController = require('../controllers/cj.controller');

// GET /api/test
router.get('/test', cjController.test);

// GET /api/token
router.get('/token', cjController.getToken);

// GET /api/search?q=&page=&limit=&category=&sort=&order=&minPrice=&maxPrice=
router.get('/search', cjController.searchProducts);

// GET /api/categories
router.get('/categories', cjController.getCategories);

// GET /api/category/:id?page=&limit=&sort=&order=&minPrice=&maxPrice=
router.get('/category/:id', cjController.getProductsByCategory);

// GET /api/products?page=&limit=&category=&keyword=&sort=&order=&minPrice=&maxPrice=
router.get('/products', cjController.getProducts);

// GET /api/products/:id
router.get('/products/:id', cjController.getProductById);

module.exports = router;

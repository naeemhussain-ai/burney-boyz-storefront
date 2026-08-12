const express = require('express');
const router = express.Router();

const shopController = require('../controllers/shop.controller');
const { cacheControl } = require('../middleware/cacheControl.middleware');

// Public catalog reads only - short-lived, safe to cache at the edge/CDN.
router.use(cacheControl(60));

// GET /api/shop/products?page=&limit=&category=&search=&minPrice=&maxPrice=&availability=&featured=&sort=
router.get('/products', shopController.listProducts);

// GET /api/shop/search/suggestions?q=
router.get('/search/suggestions', shopController.searchSuggestions);

// GET /api/shop/categories
router.get('/categories', shopController.listCategories);

// GET /api/shop/products/:slug
router.get('/products/:slug', shopController.getProductBySlug);

module.exports = router;

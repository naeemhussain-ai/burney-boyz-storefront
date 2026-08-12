const express = require('express');
const router = express.Router();

const reviewController = require('../controllers/review.controller');
const { requireAuth } = require('../middleware/auth.middleware');

// GET /api/reviews/product/:productId?page=&limit=&sort= - public
router.get('/product/:productId', reviewController.list);

// POST /api/reviews/product/:productId - signed-in customers only
router.post('/product/:productId', requireAuth, reviewController.create);

module.exports = router;

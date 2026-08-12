const express = require('express');
const router = express.Router();

const checkoutController = require('../controllers/checkout.controller');

// POST /api/checkout/shipping-quote
router.post('/shipping-quote', checkoutController.getShippingQuote);
// POST /api/checkout/create-session
router.post('/create-session', checkoutController.createSession);

module.exports = router;

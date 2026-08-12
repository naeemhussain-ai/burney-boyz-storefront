const express = require('express');
const router = express.Router();

const accountController = require('../controllers/account.controller');
const { requireAuth } = require('../middleware/auth.middleware');

// Every route in this file requires a signed-in customer.
router.use(requireAuth);

// GET /api/account/profile
router.get('/profile', accountController.getProfile);
// PATCH /api/account/profile
router.patch('/profile', accountController.updateProfile);

// PATCH /api/account/password
router.patch('/password', accountController.changePassword);

// GET /api/account/addresses
router.get('/addresses', accountController.listAddresses);
// POST /api/account/addresses
router.post('/addresses', accountController.createAddress);
// PATCH /api/account/addresses/:id
router.patch('/addresses/:id', accountController.updateAddress);
// DELETE /api/account/addresses/:id
router.delete('/addresses/:id', accountController.deleteAddress);
// PATCH /api/account/addresses/:id/default
router.patch('/addresses/:id/default', accountController.setDefaultAddress);

// GET /api/account/orders?page=&limit=
router.get('/orders', accountController.listOrders);
// GET /api/account/orders/:id
router.get('/orders/:id', accountController.getOrder);

module.exports = router;

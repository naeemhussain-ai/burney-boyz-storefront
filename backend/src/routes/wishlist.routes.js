const express = require('express');
const router = express.Router();

const wishlistController = require('../controllers/wishlist.controller');
const { requireAuth } = require('../middleware/auth.middleware');

// Every route here requires a signed-in customer - self-contained so this
// file can be mounted independently without touching account.routes.js.
router.use(requireAuth);

// GET /api/account/wishlist
router.get('/', wishlistController.list);
// GET /api/account/wishlist/count
router.get('/count', wishlistController.count);
// POST /api/account/wishlist { productId }
router.post('/', wishlistController.add);
// DELETE /api/account/wishlist/:productId
router.delete('/:productId', wishlistController.remove);

module.exports = router;

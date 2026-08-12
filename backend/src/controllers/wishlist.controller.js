const wishlistService = require('../services/wishlist.service');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/account/wishlist
 */
exports.list = async (req, res, next) => {
  try {
    const items = await wishlistService.listWishlist(req.user.id);
    sendSuccess(res, {
      message: 'Wishlist retrieved successfully',
      data: items,
      meta: { count: items.length },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/account/wishlist/count
 */
exports.count = async (req, res, next) => {
  try {
    const count = await wishlistService.getWishlistCount(req.user.id);
    sendSuccess(res, { message: 'Wishlist count retrieved successfully', data: { count } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/account/wishlist
 * Body: { productId }
 */
exports.add = async (req, res, next) => {
  try {
    await wishlistService.addToWishlist(req.user.id, req.body?.productId);
    sendSuccess(res, { status: 201, message: 'Added to wishlist' });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/account/wishlist/:productId
 */
exports.remove = async (req, res, next) => {
  try {
    await wishlistService.removeFromWishlist(req.user.id, req.params.productId);
    sendSuccess(res, { message: 'Removed from wishlist' });
  } catch (err) {
    next(err);
  }
};

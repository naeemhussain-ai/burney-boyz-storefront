const cartService = require('../services/cart.service');
const { sendSuccess } = require('../utils/apiResponse');

function getToken(req) {
  return req.get('X-Cart-Token') || null;
}

/**
 * GET /api/cart
 */
exports.getCart = async (req, res, next) => {
  try {
    const cart = await cartService.getCart(getToken(req));
    sendSuccess(res, { message: 'Cart retrieved successfully', data: cart });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/cart
 * Body: { productId, variantId?, quantity? }
 * Creates the cart (and its token) on first add if none was supplied.
 */
exports.addItem = async (req, res, next) => {
  try {
    const { productId, variantId, quantity } = req.body || {};
    const cart = await cartService.addItem({
      token: getToken(req),
      productId,
      variantId,
      quantity,
    });
    sendSuccess(res, { status: 201, message: 'Item added to cart', data: cart });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/cart/:itemId
 * Body: { quantity }
 */
exports.updateItem = async (req, res, next) => {
  try {
    const cart = await cartService.updateItemQuantity({
      token: getToken(req),
      itemId: req.params.itemId,
      quantity: req.body?.quantity,
    });
    sendSuccess(res, { message: 'Cart item updated', data: cart });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/cart/:itemId
 */
exports.removeItem = async (req, res, next) => {
  try {
    const cart = await cartService.removeItem({
      token: getToken(req),
      itemId: req.params.itemId,
    });
    sendSuccess(res, { message: 'Item removed from cart', data: cart });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/cart
 */
exports.clearCart = async (req, res, next) => {
  try {
    const cart = await cartService.clearCart(getToken(req));
    sendSuccess(res, { message: 'Cart cleared', data: cart });
  } catch (err) {
    next(err);
  }
};

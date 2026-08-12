const orderService = require('../services/order.service');
const { sendSuccess } = require('../utils/apiResponse');

function getToken(req) {
  return req.get('X-Cart-Token') || null;
}

/**
 * GET /api/orders?page=&limit=
 */
exports.listOrders = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const { orders, pagination } = await orderService.listOrders({ page, limit });
    sendSuccess(res, {
      message: 'Orders retrieved successfully',
      data: orders,
      pagination,
      meta: { count: orders.length },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/orders/:id
 */
exports.getOrder = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    sendSuccess(res, { message: 'Order retrieved successfully', data: order });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/orders
 * Two modes, distinguished by body shape:
 *  - { stripeSessionId } - confirms a paid Stripe Checkout Session and
 *    creates the order from the details Stripe already has in its
 *    metadata (see checkout.controller.js). Idempotent.
 *  - { customer, shipping, billing, couponCode } - creates a 'pending' order
 *    directly from the current cart, no payment gateway involved (manual /
 *    testing). Sprint 10 / Step 25 - shippingMethod/shippingCost are no
 *    longer accepted here; order.service.js resolves the real CJ shipping
 *    cost server-side from shipping.country instead.
 */
exports.createOrder = async (req, res, next) => {
  try {
    const { stripeSessionId, customer, shipping, billing, couponCode } = req.body || {};

    const order = stripeSessionId
      ? await orderService.createOrderFromStripeSession(stripeSessionId)
      : await orderService.createOrderFromCart({
          cartToken: getToken(req),
          customer,
          shipping,
          billing,
          couponCode,
        });

    sendSuccess(res, { status: 201, message: 'Order created successfully', data: order });
  } catch (err) {
    next(err);
  }
};

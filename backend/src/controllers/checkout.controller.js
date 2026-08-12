const cartService = require('../services/cart.service');
const stripeService = require('../services/stripe.service');
const cjOrderService = require('../services/cjOrder.service');
const { toIso2 } = require('../utils/countryCodes');
const { ValidationError } = require('../utils/errors');
const { sendSuccess } = require('../utils/apiResponse');

function getToken(req) {
  return req.get('X-Cart-Token') || null;
}

function variantLabel(variant) {
  if (!variant) return null;
  const parts = [variant.option1, variant.option2, variant.option3].filter(Boolean);
  return parts.length ? parts.join(' / ') : variant.name;
}

// Sprint 10 / Step 25 - Real Shipping Pricing. "Our shipping charge" is now
// always CJ's real quoted cost for the cart's primary item + destination
// (see cjOrder.service.js#quoteShipping) - never a flat/free client-picked
// rate, and never trusted from the client even if sent. This constant id
// just labels the order/checkout-session record; the real carrier name goes
// in shippingMethodLabel.
const SHIPPING_METHOD_ID = 'cj-shipping';

/**
 * POST /api/checkout/shipping-quote
 * Body: { country }. Lets checkout.tsx show the real CJ shipping cost
 * before the customer submits, instead of only discovering it (or a "can't
 * ship there" failure) at order-creation time.
 */
exports.getShippingQuote = async (req, res, next) => {
  try {
    const { country } = req.body || {};
    if (!country) throw new ValidationError('country is required');

    const destCountryCode = toIso2(country);
    if (!destCountryCode) throw new ValidationError(`Unrecognized country "${country}"`);

    const token = getToken(req);
    const items = await cartService.getCartItemsWithCjData(token);
    const quote = await cjOrderService.quoteShipping({ items, destCountryCode });

    sendSuccess(res, { message: 'Shipping quote calculated', data: quote });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/checkout/create-session
 * Builds a Stripe Checkout Session from the current cart + the checkout
 * form details, stashing those details in the session's metadata so
 * order.service#createOrderFromStripeSession can rebuild the order after
 * payment - no separate "pending order" table needed.
 */
exports.createSession = async (req, res, next) => {
  try {
    const { customer, shipping, billing, couponCode } = req.body || {};

    if (!customer?.email) throw new ValidationError('customer.email is required');
    if (!shipping) throw new ValidationError('shipping address is required');
    if (!billing) throw new ValidationError('billing address is required');

    const destCountryCode = toIso2(shipping.country);
    if (!destCountryCode) throw new ValidationError(`Unrecognized shipping country "${shipping.country}"`);

    const token = getToken(req);
    const cart = await cartService.getCart(token);
    if (!cart.token) throw new ValidationError('No cart found for this session');
    if (!cart.items.length) throw new ValidationError('Cart is empty - nothing to check out');

    const cjItems = await cartService.getCartItemsWithCjData(token);
    const { shippingCost: cost, carrierLabel } = await cjOrderService.quoteShipping({
      items: cjItems,
      destCountryCode,
    });

    const items = cart.items.map((item) => {
      const label = variantLabel(item.variant);
      return {
        name: label ? `${item.product.name} (${label})` : item.product.name,
        image: item.variant?.image ?? item.product.image,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      };
    });

    const metadata = {
      cartToken: cart.token,
      customerEmail: customer.email,
      customerPhone: customer.phone || '',
      shippingFullName: shipping.fullName || '',
      shippingAddressLine1: shipping.addressLine1 || '',
      shippingAddressLine2: shipping.addressLine2 || '',
      shippingCountry: shipping.country || '',
      shippingState: shipping.state || '',
      shippingCity: shipping.city || '',
      shippingPostalCode: shipping.postalCode || '',
      billingFullName: billing.fullName || '',
      billingAddressLine1: billing.addressLine1 || '',
      billingAddressLine2: billing.addressLine2 || '',
      billingCountry: billing.country || '',
      billingState: billing.state || '',
      billingCity: billing.city || '',
      billingPostalCode: billing.postalCode || '',
      shippingMethodId: SHIPPING_METHOD_ID,
      shippingMethodLabel: carrierLabel,
      shippingCost: String(cost),
      couponCode: couponCode || '',
    };

    const session = await stripeService.createCheckoutSession({
      items,
      shippingCost: cost,
      shippingMethodLabel: carrierLabel,
      customerEmail: customer.email,
      metadata,
    });

    sendSuccess(res, {
      message: 'Checkout session created',
      data: { url: session.url, sessionId: session.id },
    });
  } catch (err) {
    next(err);
  }
};

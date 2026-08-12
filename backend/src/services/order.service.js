// Order creation & retrieval. Two ways an order gets created:
//   1. createOrderFromCart - direct, no payment gateway involved (manual /
//      testing / a future "pay on delivery" style flow). Always lands as
//      status 'pending'; the client can never dictate a paid status.
//   2. createOrderFromStripeSession - the real Stripe Checkout flow. Only
//      creates the order after independently verifying with Stripe's own
//      API that the session's payment_status is 'paid'.
// Both funnel through buildOrderData() so the snapshot logic (prices,
// addresses, line items) is identical either way.
const prisma = require('../config/prisma');
const cartService = require('./cart.service');
const stripeService = require('./stripe.service');
const emailService = require('./email.service');
const cjOrderService = require('./cjOrder.service');
const shopService = require('./shop.service');
const { toIso2 } = require('../utils/countryCodes');
const { ValidationError, NotFoundError, PaymentRequiredError } = require('../utils/errors');

// Sprint 10 / Step 25 - Real Shipping Pricing. Same constant used by
// checkout.controller.js's Stripe path - see cjOrder.service.js#quoteShipping
// for why "our shipping charge" is always CJ's real quoted cost now, never a
// flat/free client-picked rate.
const SHIPPING_METHOD_ID = 'cj-shipping';

// Fire-and-forget - an email/Resend failure must never fail an order or
// checkout request. Errors are already caught/logged inside email.service.js;
// this extra catch only guards against it rejecting unexpectedly.
function notifyOrderCreatedSafely(order) {
  emailService.notifyOrderCreated(order).catch((err) => {
    console.error('[Email] notifyOrderCreated failed:', err.message || err);
  });
}

function notifyOrderStatusChangedSafely(order, previousStatus) {
  emailService.notifyOrderStatusChanged(order, previousStatus).catch((err) => {
    console.error('[Email] notifyOrderStatusChanged failed:', err.message || err);
  });
}

const ORDER_INCLUDE = { items: true };

const REQUIRED_ADDRESS_FIELDS = ['fullName', 'addressLine1', 'country', 'state', 'city', 'postalCode'];

function generateOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `BB-${datePart}-${randomPart}`;
}

function requireAddress(address, label) {
  if (!address || typeof address !== 'object') {
    throw new ValidationError(`${label} address is required`);
  }
  const missing = REQUIRED_ADDRESS_FIELDS.filter((f) => !address[f] || !String(address[f]).trim());
  if (missing.length) {
    throw new ValidationError(`${label} address missing: ${missing.join(', ')}`);
  }
}

function addressData(prefix, address) {
  return {
    [`${prefix}FullName`]: address.fullName,
    [`${prefix}AddressLine1`]: address.addressLine1,
    [`${prefix}AddressLine2`]: address.addressLine2 || null,
    [`${prefix}Country`]: address.country,
    [`${prefix}State`]: address.state,
    [`${prefix}City`]: address.city,
    [`${prefix}PostalCode`]: address.postalCode,
  };
}

// Builds Order + nested OrderItem create data (not yet persisted) from a
// serialized cart (see cart.service.js#serializeCart) and checkout details.
function buildOrderData({ cart, customer, shipping, billing, shippingMethod, shippingCost, couponCode }) {
  const items = cart.items.map((item) => {
    const variantLabel = item.variant
      ? [item.variant.option1, item.variant.option2, item.variant.option3].filter(Boolean).join(' · ') ||
        item.variant.name ||
        null
      : null;

    return {
      productId: item.productId,
      variantId: item.variantId,
      name: item.product.name,
      variantLabel,
      image: item.variant?.image ?? item.product.image ?? null,
      sku: item.variant?.sku ?? item.product.sku ?? null,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    };
  });

  const total = Math.round((cart.subtotal + shippingCost) * 100) / 100;

  return {
    orderNumber: generateOrderNumber(),
    customerEmail: customer.email,
    customerPhone: customer.phone || null,
    customerName: shipping.fullName,
    ...addressData('shipping', shipping),
    ...addressData('billing', billing),
    shippingMethodId: shippingMethod.id,
    shippingMethodLabel: shippingMethod.label,
    shippingCost,
    subtotal: cart.subtotal,
    total,
    currency: 'USD',
    couponCode: couponCode || null,
    cartToken: cart.token,
    items: { create: items },
  };
}

function validateCheckoutDetails({ customer, shipping, billing }) {
  if (!customer?.email) throw new ValidationError('customer.email is required');
  requireAddress(shipping, 'Shipping');
  requireAddress(billing, 'Billing');
}

/**
 * Creates an order directly from the current cart - no Stripe involved.
 * Always status 'pending'; callers cannot set status. Sprint 10 / Step 25 -
 * shippingMethod/shippingCost are no longer accepted from the caller; the
 * real CJ shipping quote is always resolved server-side from the cart +
 * shipping.country (see cjOrder.service.js#quoteShipping), the same way the
 * Stripe checkout-session path does.
 */
async function createOrderFromCart({ cartToken, customer, shipping, billing, couponCode }) {
  validateCheckoutDetails({ customer, shipping, billing });

  const destCountryCode = toIso2(shipping.country);
  if (!destCountryCode) throw new ValidationError(`Unrecognized shipping country "${shipping.country}"`);

  const cart = await cartService.getCart(cartToken);
  if (!cart.items.length) {
    throw new ValidationError('Cart is empty - nothing to order');
  }

  const cjItems = await cartService.getCartItemsWithCjData(cartToken);
  const { shippingCost: cost, carrierLabel } = await cjOrderService.quoteShipping({
    items: cjItems,
    destCountryCode,
  });

  const data = buildOrderData({
    cart,
    customer,
    shipping,
    billing,
    shippingMethod: { id: SHIPPING_METHOD_ID, label: carrierLabel },
    shippingCost: cost,
    couponCode,
  });

  const order = await prisma.order.create({ data, include: ORDER_INCLUDE });
  await cartService.clearCart(cartToken);
  notifyOrderCreatedSafely(order);

  return order;
}

/**
 * Confirms a Stripe Checkout Session (payment_status === 'paid', verified
 * via Stripe's own API - never trusted from client input) and creates the
 * order from the checkout details stored in its metadata. Idempotent:
 * calling twice for the same session returns the same order rather than
 * erroring or duplicating.
 */
async function createOrderFromStripeSession(stripeSessionId) {
  if (!stripeSessionId) throw new ValidationError('stripeSessionId is required');

  const existing = await prisma.order.findUnique({
    where: { stripeSessionId },
    include: ORDER_INCLUDE,
  });
  if (existing) return existing;

  const session = await stripeService.retrieveCheckoutSession(stripeSessionId);
  if (session.payment_status !== 'paid') {
    throw new PaymentRequiredError('Payment has not been completed for this session');
  }

  const md = session.metadata || {};
  const cart = await cartService.getCart(md.cartToken);
  if (!cart.items.length) {
    throw new ValidationError('Cart is empty - it may have already been converted into an order');
  }

  const customer = { email: md.customerEmail, phone: md.customerPhone || null };
  const shipping = {
    fullName: md.shippingFullName,
    addressLine1: md.shippingAddressLine1,
    addressLine2: md.shippingAddressLine2 || '',
    country: md.shippingCountry,
    state: md.shippingState,
    city: md.shippingCity,
    postalCode: md.shippingPostalCode,
  };
  const billing = {
    fullName: md.billingFullName,
    addressLine1: md.billingAddressLine1,
    addressLine2: md.billingAddressLine2 || '',
    country: md.billingCountry,
    state: md.billingState,
    city: md.billingCity,
    postalCode: md.billingPostalCode,
  };
  const shippingMethod = { id: md.shippingMethodId, label: md.shippingMethodLabel };
  const shippingCost = Number(md.shippingCost) || 0;

  const data = buildOrderData({
    cart,
    customer,
    shipping,
    billing,
    shippingMethod,
    shippingCost,
    couponCode: md.couponCode,
  });
  data.status = 'paid';
  data.stripeSessionId = stripeSessionId;
  data.stripePaymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null);
  data.paidAt = new Date();

  let order;
  try {
    order = await prisma.order.create({ data, include: ORDER_INCLUDE });
  } catch (err) {
    if (err.code === 'P2002') {
      // Lost a race with a concurrent confirm call for the same session.
      const raced = await prisma.order.findUnique({
        where: { stripeSessionId },
        include: ORDER_INCLUDE,
      });
      if (raced) return raced;
    }
    throw err;
  }

  await cartService.clearCart(md.cartToken);
  notifyOrderCreatedSafely(order);
  // Sprint 7 / Step 19 - stage the matching order in CJ. Fire-and-forget:
  // a CJ outage or bad route must never fail the customer's paid checkout;
  // failures land on the order as cjSyncError for admin visibility instead.
  cjOrderService.createCjOrderForOrderSafely(order.id);
  // Sprint 8 / Step 21 - feeds the "Best Selling" sort. Same fire-and-forget
  // safety as above: never let a stats update fail a paid checkout.
  shopService.incrementSalesCounts(order.items).catch((err) => {
    console.error('[Shop] incrementSalesCounts failed:', err.message || err);
  });

  return order;
}

const ORDER_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

// `status`/`search` are optional and additive - existing callers (the public,
// unauthenticated GET /api/orders list) that pass only {page, limit} keep
// their original behavior unchanged.
async function listOrders({ page = 1, limit = 20, status, search } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));

  const where = {};
  if (status) {
    if (!ORDER_STATUSES.includes(status)) {
      throw new ValidationError(`status must be one of: ${ORDER_STATUSES.join(', ')}`);
    }
    where.status = status;
  }
  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { orderNumber: { contains: term, mode: 'insensitive' } },
      { customerEmail: { contains: term, mode: 'insensitive' } },
      { customerName: { contains: term, mode: 'insensitive' } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      include: ORDER_INCLUDE,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / safeLimit),
    },
  };
}

async function getOrderById(id) {
  const order = await prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
  if (!order) throw new NotFoundError(`Order ${id} not found`);

  // Sprint 7 / Step 19 - lazily refresh CJ tracking on view (throttled
  // internally; a no-op if already fresh or if there's no CJ order yet).
  // Never lets a CJ hiccup break the order page.
  const synced = await cjOrderService.syncCjOrderStatusSafely(id);
  return synced || order;
}

/**
 * Admin-only status transition. No workflow restrictions on which statuses
 * can follow which - an admin can correct a mistaken status freely.
 */
async function updateOrderStatus(id, status) {
  if (!ORDER_STATUSES.includes(status)) {
    throw new ValidationError(`status must be one of: ${ORDER_STATUSES.join(', ')}`);
  }

  const current = await prisma.order.findUnique({ where: { id } });
  if (!current) throw new NotFoundError(`Order ${id} not found`);

  const data = { status };
  // Backfill paidAt the first time an order is marked paid outside the
  // normal Stripe-confirmation path (e.g. a manually-created pending order).
  if (status === 'paid' && !current.paidAt) {
    data.paidAt = new Date();
  }

  const updated = await prisma.order.update({ where: { id }, data, include: ORDER_INCLUDE });
  notifyOrderStatusChangedSafely(updated, current.status);

  return updated;
}

module.exports = {
  createOrderFromCart,
  createOrderFromStripeSession,
  listOrders,
  getOrderById,
  updateOrderStatus,
  ORDER_STATUSES,
};

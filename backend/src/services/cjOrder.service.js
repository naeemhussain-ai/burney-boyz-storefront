// CJ Order Automation (Sprint 7 / Step 19). After a Stripe-paid order is
// created, stages the matching order in CJ (create-only - see
// cj.service.js#createCjOrder for why this never auto-pays) and keeps its
// tracking/status in sync. Reuses cj.service.js and cjProductMapper.js - no
// CJ-calling logic is duplicated here.
const prisma = require('../config/prisma');
const cjService = require('./cj.service');
const mapper = require('./cjProductMapper');
const { toIso2 } = require('../utils/countryCodes');
const { ValidationError } = require('../utils/errors');

// Sprint 10 / Step 25 - product.variants (ALL of them, not just the item's
// selected one) is needed so a variant-less line item can still fall back
// to a representative CJ variant id for shipping-quote purposes - see
// resolveVid() below.
const ORDER_INCLUDE = {
  items: { include: { product: { include: { variants: true } }, variant: true } },
};

// How long a synced tracking snapshot is considered fresh before an order
// page view triggers another CJ call. Keeps every order detail view from
// hammering CJ's 1 req/sec-throttled API.
const TRACKING_SYNC_INTERVAL_MS = Number(process.env.CJ_TRACKING_SYNC_INTERVAL_MS) || 15 * 60 * 1000;

function isStale(order) {
  if (!order.cjLastSyncedAt) return true;
  return Date.now() - new Date(order.cjLastSyncedAt).getTime() > TRACKING_SYNC_INTERVAL_MS;
}

function cheapest(quotes) {
  return quotes.reduce((a, b) => ((b.price ?? Infinity) < (a.price ?? Infinity) ? b : a));
}

// Picks the shipping quote (carrier + price) CJ will ship this order with:
// prefer the cheapest already-quoted method for the order's destination
// (computed at product import/sync time - see
// cjProductMapper.js#computeShippingInfo), falling back to a live freight
// quote if that destination wasn't pre-quoted (e.g. an order shipping
// somewhere outside CJ_SHIP_DEST_COUNTRIES). Sprint 10 / Step 25 - returns
// price alongside logisticName so checkout can charge the real CJ shipping
// cost instead of a flat/free client-picked rate.
async function resolveShippingQuote({ product, destCountryCode, originCountryCode, vid }) {
  const preQuoted = product?.shippingMethods?.[destCountryCode];
  if (Array.isArray(preQuoted) && preQuoted.length) {
    const pick = cheapest(preQuoted);
    if (pick.logisticName) return { logisticName: pick.logisticName, price: pick.price ?? null };
  }

  if (!vid) return { logisticName: null, price: null };
  try {
    const quotes = await cjService.getFreightQuote({
      vid,
      quantity: 1,
      startCountryCode: originCountryCode,
      endCountryCode: destCountryCode,
    });
    if (quotes.length) {
      const pick = cheapest(quotes);
      return { logisticName: pick.logisticName, price: pick.price ?? null };
    }
  } catch (err) {
    console.error('[CJ Order] Live freight quote failed:', err.message);
  }
  return { logisticName: null, price: null };
}

// Sprint 10 / Step 25 - Real Shipping Pricing. Picks the "primary" line item
// CJ order creation will key its (single, whole-order) logistics choice off
// of - same rule used in createCjOrderForOrder below, kept identical so the
// price a customer is quoted/charged at checkout matches the carrier CJ
// actually ends up shipping with.
function pickPrimaryItem(items) {
  return items.find((i) => i.variant?.cjVariantId) || items[0];
}

function originCountryOf(item) {
  return mapper.deriveOriginCountry(
    item?.variant?.inventoryDetail?.length ? { inventory: item.variant.inventoryDetail } : null,
  );
}

// Sprint 10 / Step 25 - a cart/order line item can have no variant selected
// at all (variantId null - "add to cart" without picking one). CJ's freight
// API needs a vid to quote a *live* route, so without this fallback a
// variant-less item always failed with "no shipping route" even though the
// product's own variants ship fine - same "first variant is representative
// for shipping" rule cjProductMapper.js already applies at import time.
function resolveVid(item) {
  if (item?.variant?.cjVariantId) return item.variant.cjVariantId;
  const fallback = item?.product?.variants?.find((v) => v.cjVariantId);
  return fallback?.cjVariantId || null;
}

/**
 * Quotes the real CJ shipping cost for a set of cart/order line items
 * shipping to destCountryCode. Never a flat/free client-supplied number -
 * this is the one place "our shipping charge" is computed, reused by both
 * checkout (quote + order creation) and, indirectly, CJ order creation
 * (same primary-item/carrier resolution as createCjOrderForOrder).
 * @param {Array<{product: object, variant: object|null, quantity?: number}>} items
 * @param {string} destCountryCode - ISO-2
 * @returns {Promise<{shippingCost: number, carrierLabel: string}>}
 */
async function quoteShipping({ items, destCountryCode }) {
  if (!items || !items.length) throw new ValidationError('Cart is empty - nothing to quote shipping for');
  if (!destCountryCode) throw new ValidationError('A valid shipping country is required');

  const primaryItem = pickPrimaryItem(items);
  const originCountryCode = originCountryOf(primaryItem);

  const quote = await resolveShippingQuote({
    product: primaryItem?.product,
    destCountryCode,
    originCountryCode,
    vid: resolveVid(primaryItem),
  });

  if (quote.price === null || quote.price === undefined) {
    throw new ValidationError(
      `Sorry, we can't ship to this destination right now (no CJ shipping route from ${originCountryCode} to ${destCountryCode}).`,
    );
  }

  return { shippingCost: Number(quote.price), carrierLabel: quote.logisticName || 'Standard Shipping' };
}

/**
 * Creates the matching CJ order for a local (Stripe-paid) Order. Idempotent
 * - a second call for an order that already has a cjOrderId is a no-op.
 * Throws on failure; see createCjOrderForOrderSafely() for the
 * fire-and-forget wrapper used at the actual payment-confirmation call site.
 * @param {string} orderId - our local Order id
 */
async function createCjOrderForOrder(orderId) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: ORDER_INCLUDE });
  if (!order) throw new ValidationError(`Order ${orderId} not found`);
  if (order.cjOrderId) return order; // already pushed to CJ - idempotent no-op

  // Sprint 10 / Step 24 - CJ Order Flow. A 'pending' order hasn't been paid
  // for (or, with Stripe off, verified by an admin) yet - never let it reach
  // CJ, whether from the automatic post-payment call site or the admin's
  // manual "Send to CJ" button. The automatic call site always creates the
  // order with status already 'paid', so this never affects that path.
  if (order.status === 'pending') {
    throw new ValidationError('Cannot send a pending (unpaid) order to CJ - mark it as paid first.');
  }

  const destCountryCode = toIso2(order.shippingCountry);
  if (!destCountryCode) {
    throw new ValidationError(`No ISO country code mapping for "${order.shippingCountry}"`);
  }

  const products = [];
  for (const item of order.items) {
    const vid = item.variant?.cjVariantId || null;
    const sku = item.sku || item.variant?.sku || item.product?.sku || null;
    if (!vid && !sku) continue; // nothing CJ can identify this line item by - skip it, not the whole order
    products.push({
      vid: vid || undefined,
      sku: vid ? undefined : sku,
      quantity: item.quantity,
      storeLineItemId: item.id,
    });
  }
  if (!products.length) {
    throw new ValidationError('No order items could be matched to a CJ variant/SKU');
  }

  const primaryItem = pickPrimaryItem(order.items);
  const originCountryCode = originCountryOf(primaryItem);

  const { logisticName } = await resolveShippingQuote({
    product: primaryItem?.product,
    destCountryCode,
    originCountryCode,
    vid: resolveVid(primaryItem),
  });
  if (!logisticName) {
    throw new ValidationError(`CJ has no shipping route from ${originCountryCode} to ${destCountryCode}`);
  }

  const result = await cjService.createCjOrder({
    orderNumber: order.orderNumber,
    shippingCountryCode: destCountryCode,
    shippingCountry: order.shippingCountry,
    shippingProvince: order.shippingState,
    shippingCity: order.shippingCity,
    shippingCustomerName: order.shippingFullName,
    shippingAddress: [order.shippingAddressLine1, order.shippingAddressLine2].filter(Boolean).join(', '),
    shippingZip: order.shippingPostalCode,
    shippingPhone: order.customerPhone || undefined,
    email: order.customerEmail,
    logisticName,
    fromCountryCode: originCountryCode,
    products,
  });

  return prisma.order.update({
    where: { id: orderId },
    data: {
      cjOrderId: result.cjOrderId,
      cjOrderStatus: result.orderStatus,
      cjLastSyncedAt: new Date(),
      cjSyncError: null,
    },
    include: ORDER_INCLUDE,
  });
}

/**
 * Fire-and-forget wrapper for the payment-confirmation call site - a CJ
 * order push must never fail the customer-facing order creation. Failures
 * are recorded on the order (cjSyncError) for admin visibility instead.
 */
function createCjOrderForOrderSafely(orderId) {
  createCjOrderForOrder(orderId).catch(async (err) => {
    console.error('[CJ Order] createCjOrderForOrder failed:', err.message);
    await prisma.order
      .update({ where: { id: orderId }, data: { cjSyncError: String(err.message || err).slice(0, 500) } })
      .catch(() => {});
  });
}

/**
 * Refreshes an order's CJ status/tracking. Throttled to
 * CJ_TRACKING_SYNC_INTERVAL_MS unless `force` is set (the admin's manual
 * "Refresh tracking" action). No-op if the order has no cjOrderId yet.
 * @param {string} orderId
 * @param {{force?: boolean}} [options]
 */
async function syncCjOrderStatus(orderId, { force = false } = {}) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: ORDER_INCLUDE });
  if (!order) throw new ValidationError(`Order ${orderId} not found`);
  if (!order.cjOrderId) return order;
  if (!force && !isStale(order)) return order;

  try {
    const detail = await cjService.getCjOrderDetail(order.cjOrderId);
    const data = { cjLastSyncedAt: new Date(), cjSyncError: null };
    if (detail.orderStatus && detail.orderStatus !== order.cjOrderStatus) {
      data.cjOrderStatus = detail.orderStatus;
    }
    if (detail.trackNumber && detail.trackNumber !== order.cjTrackingNumber) {
      data.cjTrackingNumber = detail.trackNumber;
    }
    if (detail.trackingProvider && detail.trackingProvider !== order.cjShippingCarrier) {
      data.cjShippingCarrier = detail.trackingProvider;
    }
    return await prisma.order.update({ where: { id: orderId }, data, include: ORDER_INCLUDE });
  } catch (err) {
    await prisma.order
      .update({
        where: { id: orderId },
        data: { cjLastSyncedAt: new Date(), cjSyncError: String(err.message || err).slice(0, 500) },
      })
      .catch(() => {});
    throw err;
  }
}

/**
 * Same as syncCjOrderStatus but never throws - for read-path call sites
 * (order/account detail GETs) where a stale tracking snapshot must never
 * break the page.
 */
async function syncCjOrderStatusSafely(orderId) {
  try {
    return await syncCjOrderStatus(orderId);
  } catch (err) {
    console.error('[CJ Order] syncCjOrderStatus failed:', err.message);
    return null;
  }
}

module.exports = {
  createCjOrderForOrder,
  createCjOrderForOrderSafely,
  syncCjOrderStatus,
  syncCjOrderStatusSafely,
  quoteShipping,
};

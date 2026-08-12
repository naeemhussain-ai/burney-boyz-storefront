// Thin wrapper around the Stripe SDK. STRIPE_SECRET_KEY lives only here, on
// the server - the frontend never sees a Stripe key of any kind, since we
// use hosted Stripe Checkout (redirect to session.url) rather than
// Stripe.js/Elements, which would need a publishable key client-side.
const { AppError } = require('../utils/errors');

let stripeClient = null;

function getStripeClient() {
  if (stripeClient) return stripeClient;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new AppError(
      'Stripe is not configured - set STRIPE_SECRET_KEY in the backend .env file.',
      500,
    );
  }

  // eslint-disable-next-line global-require
  const Stripe = require('stripe');
  stripeClient = new Stripe(key);
  return stripeClient;
}

/**
 * Creates a Stripe Checkout Session for the given cart snapshot.
 * @param {object} options
 * @param {{name: string, image?: string|null, unitPrice: number, quantity: number}[]} options.items
 * @param {number} options.shippingCost
 * @param {string} options.shippingMethodLabel
 * @param {string} [options.currency='usd']
 * @param {string} options.customerEmail
 * @param {Record<string, string>} options.metadata - short string key/values only (Stripe limit)
 */
async function createCheckoutSession({
  items,
  shippingCost,
  shippingMethodLabel,
  currency = 'usd',
  customerEmail,
  metadata,
}) {
  const stripe = getStripeClient();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  const line_items = items.map((item) => ({
    price_data: {
      currency,
      product_data: {
        name: item.name,
        images: item.image ? [item.image] : undefined,
      },
      unit_amount: Math.round(item.unitPrice * 100),
    },
    quantity: item.quantity,
  }));

  if (shippingCost > 0) {
    line_items.push({
      price_data: {
        currency,
        product_data: { name: `Shipping - ${shippingMethodLabel}` },
        unit_amount: Math.round(shippingCost * 100),
      },
      quantity: 1,
    });
  }

  return stripe.checkout.sessions.create({
    mode: 'payment',
    line_items,
    customer_email: customerEmail,
    success_url: `${frontendUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/payment-cancel`,
    metadata,
  });
}

async function retrieveCheckoutSession(sessionId) {
  const stripe = getStripeClient();
  return stripe.checkout.sessions.retrieve(sessionId);
}

module.exports = { createCheckoutSession, retrieveCheckoutSession };

// Anonymous, token-based shopping cart for ShopNow. One cart per visitor -
// identity is an opaque token the frontend generates/persists client-side
// (there's no auth system yet), sent on every request via X-Cart-Token.
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { NotFoundError, ValidationError } = require('../utils/errors');

const CART_INCLUDE = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          image: true,
          myPrice: true,
          status: true,
          sku: true,
        },
      },
      variant: {
        select: {
          id: true,
          name: true,
          option1: true,
          option2: true,
          option3: true,
          image: true,
          myPrice: true,
          stock: true,
          sku: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
};

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Always the product's myPrice (our admin-set selling price, cost + margin).
// Variant.myPrice is NOT a real selling price - it's frozen at whatever the
// CJ cost was at import/creation time (see cjProductMapper.js and
// productSync.service.js) and there's no admin UI to update it, so it must
// never be used to price a cart line - doing so was quoting raw CJ cost with
// no margin applied whenever a variant was selected.
function unitPriceOf(item) {
  const n = Number(item.product.myPrice);
  return Number.isFinite(n) ? n : 0;
}

function serializeCart(cart) {
  if (!cart) {
    return { id: null, token: null, items: [], subtotal: 0, totalQuantity: 0 };
  }

  const items = cart.items.map((item) => {
    const unitPrice = unitPriceOf(item);
    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice,
      lineTotal: round2(unitPrice * item.quantity),
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        image: item.product.image,
        sku: item.product.sku,
      },
      variant: item.variant
        ? {
            id: item.variant.id,
            name: item.variant.name,
            option1: item.variant.option1,
            option2: item.variant.option2,
            option3: item.variant.option3,
            image: item.variant.image,
            myPrice: item.variant.myPrice,
            stock: item.variant.stock,
            sku: item.variant.sku,
          }
        : null,
    };
  });

  return {
    id: cart.id,
    token: cart.token,
    items,
    subtotal: round2(items.reduce((sum, i) => sum + i.lineTotal, 0)),
    totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}

async function findCartByToken(token) {
  if (!token) return null;
  return prisma.cart.findUnique({ where: { token }, include: CART_INCLUDE });
}

async function getCart(token) {
  return serializeCart(await findCartByToken(token));
}

// Sprint 10 / Step 25 - Real Shipping Pricing. Internal-only: fetches cart
// items with FULL product/variant rows (cjVariantId, shippingMethods,
// inventoryDetail - including the CJ cost fields CART_INCLUDE deliberately
// excludes above) so cjOrder.service.js#quoteShipping can resolve a real CJ
// shipping quote. Never serialize or return this shape from a public
// endpoint - see shop.service.js's PRODUCT_*_SELECT comments for why CJ
// cost/shipping data must never reach a customer-facing response.
//
// Includes ALL of the product's variants (not just the one this cart item
// has selected) so quoteShipping can still resolve a CJ vid for a
// variant-less line item (variantId null) - same "first variant is
// representative for shipping" rule cjProductMapper.js already uses when
// quoting a product's shipping at import time.
async function getCartItemsWithCjData(token) {
  if (!token) return [];
  return prisma.cartItem.findMany({
    where: { cart: { token } },
    include: { product: { include: { variants: true } }, variant: true },
  });
}

// Looks up the cart for a token, creating one (with a fresh token if none
// was supplied) only when actually needed - GET never creates a row, only
// mutating operations do.
async function getOrCreateCart(token) {
  if (token) {
    const existing = await prisma.cart.findUnique({ where: { token } });
    if (existing) return existing;
  }
  return prisma.cart.create({ data: { token: token || crypto.randomUUID() } });
}

async function assertProductAndVariant(productId, variantId) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new NotFoundError(`Product ${productId} not found`);

  if (variantId) {
    const variant = await prisma.variant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundError(`Variant ${variantId} not found`);
    if (variant.productId !== productId) {
      throw new ValidationError('variantId does not belong to productId');
    }
  }
}

async function addItem({ token, productId, variantId, quantity }) {
  if (!productId) throw new ValidationError('productId is required');

  const qty = quantity === undefined ? 1 : Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    throw new ValidationError('quantity must be a positive integer');
  }

  const normalizedVariantId = variantId || null;
  await assertProductAndVariant(productId, normalizedVariantId);

  const cart = await getOrCreateCart(token);

  // App-level de-dupe: Postgres treats NULL as distinct, so the DB's unique
  // constraint alone wouldn't merge two variant-less lines for one product.
  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId, variantId: normalizedVariantId },
  });

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + qty },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, variantId: normalizedVariantId, quantity: qty },
    });
  }

  return serializeCart(await findCartByToken(cart.token));
}

async function updateItemQuantity({ token, itemId, quantity }) {
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    throw new ValidationError('quantity must be a positive integer (use DELETE to remove an item)');
  }

  const cart = await findCartByToken(token);
  if (!cart || !cart.items.some((i) => i.id === itemId)) {
    throw new NotFoundError(`Cart item ${itemId} not found`);
  }

  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity: qty } });

  return serializeCart(await findCartByToken(token));
}

async function removeItem({ token, itemId }) {
  const cart = await findCartByToken(token);
  if (!cart || !cart.items.some((i) => i.id === itemId)) {
    throw new NotFoundError(`Cart item ${itemId} not found`);
  }

  await prisma.cartItem.delete({ where: { id: itemId } });

  return serializeCart(await findCartByToken(token));
}

async function clearCart(token) {
  const cart = await findCartByToken(token);
  if (!cart) return serializeCart(null);

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  return serializeCart({ ...cart, items: [] });
}

module.exports = {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  getCartItemsWithCjData,
};

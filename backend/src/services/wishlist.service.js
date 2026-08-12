// Sprint 8 / Step 20 - customer wishlist. Logged-in users only; every
// function here takes a userId already verified by requireAuth at the
// route layer (see wishlist.routes.js). Reuses shop.service.js's public
// product shape so wishlisted products never leak internal fields (CJ cost,
// draft status, etc.) - the same guarantee the rest of the storefront has.
const prisma = require('../config/prisma');
const { PRODUCT_LIST_SELECT } = require('./shop.service');
const { ValidationError, NotFoundError } = require('../utils/errors');

async function listWishlist(userId) {
  const rows = await prisma.wishlist.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, createdAt: true, product: { select: PRODUCT_LIST_SELECT } },
  });

  // A wishlisted product that's since been unpublished/deleted shouldn't
  // render a broken card - drop it rather than show it (matches how the
  // rest of the storefront treats non-published products as not-found).
  return rows.filter((r) => r.product);
}

async function getWishlistCount(userId) {
  return prisma.wishlist.count({ where: { userId } });
}

async function addToWishlist(userId, productId) {
  if (!productId) throw new ValidationError('productId is required');

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, status: true },
  });
  if (!product || product.status !== 'published') {
    throw new NotFoundError(`Product ${productId} not found`);
  }

  try {
    await prisma.wishlist.create({ data: { userId, productId } });
  } catch (err) {
    if (err.code === 'P2002') return; // already wishlisted - idempotent, not an error
    throw err;
  }
}

async function removeFromWishlist(userId, productId) {
  await prisma.wishlist.deleteMany({ where: { userId, productId } });
}

module.exports = { listWishlist, getWishlistCount, addToWishlist, removeFromWishlist };

// Sprint 8 / Step 20 - product reviews. Reads are public; creating a review
// requires a signed-in customer (see review.routes.js). Product.avgRating/
// reviewCount are denormalized counters recomputed here on every write -
// see cjProductMapper.js-style reasoning: one place owns the aggregate math
// so list/detail/sort queries never need a live join to show a rating.
const prisma = require('../config/prisma');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

const SORT_MAP = {
  newest: { createdAt: 'desc' },
  oldest: { createdAt: 'asc' },
  'rating-desc': { rating: 'desc' },
  'rating-asc': { rating: 'asc' },
};

const REVIEW_SELECT = {
  id: true,
  rating: true,
  title: true,
  body: true,
  images: true,
  verifiedPurchase: true,
  createdAt: true,
  user: { select: { firstName: true, lastName: true } },
};

function displayName(user) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return name || 'Anonymous';
}

function toPublicShape(row) {
  return {
    id: row.id,
    rating: row.rating,
    title: row.title,
    body: row.body,
    images: row.images,
    verifiedPurchase: row.verifiedPurchase,
    createdAt: row.createdAt,
    authorName: displayName(row.user),
  };
}

/**
 * @param {string} productId
 * @param {object} [options]
 * @param {number} [options.page=1]
 * @param {number} [options.limit=10]
 * @param {'newest'|'oldest'|'rating-desc'|'rating-asc'} [options.sort='newest']
 */
async function listReviewsForProduct(productId, { page = 1, limit = 10, sort } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10));
  const orderBy = SORT_MAP[sort] || SORT_MAP.newest;

  const [rows, total, product, grouped] = await Promise.all([
    prisma.review.findMany({
      // Public product listing shows only APPROVED reviews
      where: { productId, status: 'approved' },
      select: REVIEW_SELECT,
      orderBy,
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    }),
    prisma.review.count({ where: { productId } }),
    prisma.product.findUnique({ where: { id: productId }, select: { avgRating: true, reviewCount: true } }),
    prisma.review.groupBy({ by: ['rating'], where: { productId }, _count: true }),
  ]);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const g of grouped) distribution[g.rating] = g._count;

  return {
    reviews: rows.map(toPublicShape),
    summary: { avgRating: product?.avgRating ?? 0, reviewCount: product?.reviewCount ?? total, distribution },
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / safeLimit),
    },
  };
}

// Snapshot at creation time - was this user's email on a paid+ order
// containing this product? Matches account.service.js's existing
// email-based order matching; there's no separate order<->user identity
// link, by design (checkout stays guest-friendly).
async function wasVerifiedPurchase(userEmail, productId) {
  const count = await prisma.orderItem.count({
    where: {
      productId,
      order: {
        customerEmail: userEmail,
        status: { in: ['paid', 'processing', 'shipped', 'delivered'] },
      },
    },
  });
  return count > 0;
}

async function recomputeProductRating(productId) {
  // Only approved reviews contribute to public aggregates
  const agg = await prisma.review.aggregate({
    where: { productId, status: 'approved' },
    _avg: { rating: true },
    _count: true,
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      avgRating: agg._avg.rating ? Math.round(agg._avg.rating * 100) / 100 : 0,
      reviewCount: agg._count,
    },
  });
}

const VALID_RATINGS = [1, 2, 3, 4, 5];

/**
 * @param {string} userId
 * @param {string} userEmail
 * @param {string} productId
 * @param {{rating: number, title?: string, body?: string, images?: string[]}} input
 */
async function createReview(userId, userEmail, productId, input) {
  const rating = Number(input?.rating);
  if (!VALID_RATINGS.includes(rating)) {
    throw new ValidationError('rating must be an integer from 1 to 5');
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, status: true },
  });
  if (!product || product.status !== 'published') {
    throw new NotFoundError(`Product ${productId} not found`);
  }

  const images = Array.isArray(input?.images)
    ? input.images.filter((url) => typeof url === 'string' && url.trim()).slice(0, 6)
    : [];

  const verifiedPurchase = await wasVerifiedPurchase(userEmail, productId);

  let review;
  try {
    review = await prisma.review.create({
      data: {
        productId,
        userId,
        rating,
        title: input?.title?.trim() || null,
        body: input?.body?.trim() || null,
        images: images.length ? images : undefined,
        verifiedPurchase,
        status: 'pending',
      },
      select: REVIEW_SELECT,
    });
  } catch (err) {
    if (err.code === 'P2002') {
      throw new ConflictError('You have already reviewed this product');
    }
    throw err;
  }

  await recomputeProductRating(productId);

  return toPublicShape(review);
}

module.exports = { listReviewsForProduct, createReview };

/**
 * Admin: list reviews by status (pending/approved/rejected) - includes user info
 */
async function listReviewsForAdmin({ status = 'pending', page = 1, limit = 20 } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 20));

  const where = {};
  if (status) where.status = status;

  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      where,
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        images: true,
        verifiedPurchase: true,
        status: true,
        createdAt: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        productId: true,
        product: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    }),
    prisma.review.count({ where }),
  ]);

  return {
    reviews: rows.map(({ product, ...row }) => ({ ...row, productName: product?.name ?? null })),
    pagination: { page: safePage, limit: safeLimit, total, totalPages: total === 0 ? 0 : Math.ceil(total / safeLimit) },
  };
}

/**
 * Admin: set review status and update product aggregates when visibility changes
 */
async function setReviewStatus(reviewId, status) {
  const valid = ['pending', 'approved', 'rejected'];
  if (!valid.includes(status)) throw new ValidationError(`status must be one of: ${valid.join(', ')}`);

  const existing = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true, productId: true, status: true } });
  if (!existing) throw new NotFoundError(`Review ${reviewId} not found`);

  if (existing.status === status) return existing;

  const updated = await prisma.review.update({ where: { id: reviewId }, data: { status }, select: REVIEW_SELECT });

  // If visibility changed (approved <-> not approved), recompute product aggregates
  const wasVisible = existing.status === 'approved';
  const nowVisible = status === 'approved';
  if (wasVisible !== nowVisible) {
    await recomputeProductRating(existing.productId);
  }

  return updated;
}

module.exports.listReviewsForAdmin = listReviewsForAdmin;
module.exports.setReviewStatus = setReviewStatus;

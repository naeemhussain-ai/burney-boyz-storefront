const reviewService = require('../services/review.service');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/reviews/product/:productId?page=&limit=&sort=
 */
exports.list = async (req, res, next) => {
  try {
    const { page, limit, sort } = req.query;
    const { reviews, summary, pagination } = await reviewService.listReviewsForProduct(
      req.params.productId,
      { page, limit, sort },
    );
    sendSuccess(res, {
      message: 'Reviews retrieved successfully',
      data: reviews,
      pagination,
      meta: { summary, count: reviews.length },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/reviews/product/:productId
 * Body: { rating, title?, body?, images? }
 */
exports.create = async (req, res, next) => {
  try {
    const review = await reviewService.createReview(
      req.user.id,
      req.user.email,
      req.params.productId,
      req.body || {},
    );
    sendSuccess(res, { status: 201, message: 'Review submitted successfully', data: review });
  } catch (err) {
    next(err);
  }
};

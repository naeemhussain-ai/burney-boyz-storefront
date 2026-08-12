const shopService = require('../services/shop.service');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/shop/products?page=&limit=&category=&search=&minPrice=&maxPrice=&availability=&featured=&sort=
 */
exports.listProducts = async (req, res, next) => {
  try {
    const { page, limit, category, search, minPrice, maxPrice, availability, featured, sort } =
      req.query;
    const { products, pagination } = await shopService.listPublishedProducts({
      page,
      limit,
      category,
      search,
      minPrice,
      maxPrice,
      availability,
      featured,
      sort,
    });

    sendSuccess(res, {
      message: 'Shop products retrieved successfully',
      data: products,
      pagination,
      meta: { count: products.length },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/shop/products/:slug
 */
exports.getProductBySlug = async (req, res, next) => {
  try {
    const product = await shopService.getPublishedProductBySlug(req.params.slug);
    sendSuccess(res, { message: 'Product retrieved successfully', data: product });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/shop/search/suggestions?q=
 */
exports.searchSuggestions = async (req, res, next) => {
  try {
    const suggestions = await shopService.getSearchSuggestions(req.query.q);
    sendSuccess(res, {
      message: 'Search suggestions retrieved successfully',
      data: suggestions,
      meta: { count: suggestions.length },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/shop/categories
 */
exports.listCategories = async (req, res, next) => {
  try {
    const categories = await shopService.listPublishedCategories();
    sendSuccess(res, {
      message: 'Categories retrieved successfully',
      data: categories,
      meta: { count: categories.length },
    });
  } catch (err) {
    next(err);
  }
};

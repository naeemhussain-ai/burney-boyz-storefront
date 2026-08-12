const cjService = require('../services/cj.service');
const { getToken, getTokenInfo } = require('../utils/cjAuth');
const { sendSuccess } = require('../utils/apiResponse');
const { ValidationError } = require('../utils/errors');

// ─── Health ───────────────────────────────────────────────────────────────────

exports.test = async (req, res, next) => {
  try {
    const result = await cjService.getTestResponse();
    sendSuccess(res, { message: result.message });
  } catch (err) {
    next(err);
  }
};

// ─── Authentication ───────────────────────────────────────────────────────────

/**
 * GET /api/token
 */
exports.getToken = async (req, res, next) => {
  try {
    await getToken();
    const info = getTokenInfo();
    sendSuccess(res, { message: 'CJ access token ready', data: info });
  } catch (err) {
    next(err);
  }
};

// ─── Products - List / Search (shared query logic) ───────────────────────────

/**
 * GET /api/products?page=&limit=&category=&keyword=&sort=&order=&minPrice=&maxPrice=
 * Backward compatible with the original ?page=&limit= only usage.
 */
exports.getProducts = async (req, res, next) => {
  try {
    const { page, limit, category, keyword, sort, order, minPrice, maxPrice } = req.query;

    const { products, pagination } = await cjService.queryProducts({
      page, limit, categoryId: category, keyword, sort, order, minPrice, maxPrice,
    });

    sendSuccess(res, {
      message: 'Products retrieved successfully',
      data: products,
      pagination,
      meta: { count: products.length },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/search?q=&page=&limit=&category=&sort=&order=&minPrice=&maxPrice=
 */
exports.searchProducts = async (req, res, next) => {
  try {
    const { q, page, limit, category, sort, order, minPrice, maxPrice } = req.query;

    const { products, pagination } = await cjService.queryProducts({
      keyword: q, page, limit, categoryId: category, sort, order, minPrice, maxPrice,
    });

    sendSuccess(res, {
      message: q ? `Search results for "${q}"` : 'Products retrieved successfully',
      data: products,
      pagination,
      meta: { count: products.length, query: q || null },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Categories ───────────────────────────────────────────────────────────────

/**
 * GET /api/categories
 */
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await cjService.getCategories();
    sendSuccess(res, {
      message: 'Categories retrieved successfully',
      data: categories,
      meta: { count: categories.length },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/category/:id?page=&limit=&sort=&order=&minPrice=&maxPrice=
 */
exports.getProductsByCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !id.trim()) throw new ValidationError('Category ID is required');

    const { page, limit, sort, order, minPrice, maxPrice } = req.query;
    const categoryId = id.trim();

    const { products, pagination } = await cjService.queryProducts({
      categoryId, page, limit, sort, order, minPrice, maxPrice,
    });

    sendSuccess(res, {
      message: 'Category products retrieved successfully',
      data: products,
      pagination,
      meta: { count: products.length, categoryId },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Products - Detail ────────────────────────────────────────────────────────

/**
 * GET /api/products/:id
 * Returns full product details: images, description, all variants, inventory.
 */
exports.getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !id.trim()) throw new ValidationError('Product ID is required');

    const product = await cjService.getProductById(id.trim());
    sendSuccess(res, { message: 'Product retrieved successfully', data: product });
  } catch (err) {
    next(err);
  }
};

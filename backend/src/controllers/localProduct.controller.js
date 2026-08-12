const localProductService = require('../services/localProduct.service');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/local-products
 */
exports.list = async (req, res, next) => {
  try {
    const products = await localProductService.listProducts();
    sendSuccess(res, {
      message: 'Local products retrieved successfully',
      data: products,
      meta: { count: products.length },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/local-products/:id
 */
exports.getById = async (req, res, next) => {
  try {
    const product = await localProductService.getProductById(req.params.id);
    sendSuccess(res, { message: 'Product retrieved successfully', data: product });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/local-products
 * Manual JSON entry for now - does not call the CJ API.
 */
exports.create = async (req, res, next) => {
  try {
    const product = await localProductService.createProduct(req.body || {});
    sendSuccess(res, { status: 201, message: 'Product created successfully', data: product });
  } catch (err) {
    next(err);
  }
};

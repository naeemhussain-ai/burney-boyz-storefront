const productImportService = require('../services/productImport.service');
const { ValidationError, ConflictError } = require('../utils/errors');

/**
 * POST /api/import-product/:cjProductId
 * Imports one CJ product (by id) into the local catalog. No business logic
 * here - this only validates the param, delegates to the service, and shapes
 * the HTTP response.
 */
exports.importProduct = async (req, res, next) => {
  try {
    const { cjProductId } = req.params;
    if (!cjProductId || !cjProductId.trim()) {
      throw new ValidationError('cjProductId is required');
    }

    const { productId, variantCount } = await productImportService.importProduct(cjProductId.trim());

    res.status(201).json({
      success: true,
      message: 'Product imported successfully.',
      productId,
      variantCount,
    });
  } catch (err) {
    if (err instanceof ConflictError) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  }
};

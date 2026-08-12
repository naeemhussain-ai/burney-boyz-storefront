// Imports ONE chosen CJ product into our local catalog (Product + Variant).
// This never syncs the full CJ catalog - only a product an admin explicitly
// selected by id ends up here. CJ->local field mapping lives in
// cjProductMapper.js, shared with productSync.service.js (Sprint 7 Step 18)
// so import and ongoing sync can never drift out of sync with each other.
const prisma = require('../config/prisma');
const cjService = require('./cj.service');
const localProductService = require('./localProduct.service');
const mapper = require('./cjProductMapper');
const { slugify } = require('../utils/slugify');
const { ConflictError, ValidationError } = require('../utils/errors');

async function buildUniqueSlug(name, cjProductId) {
  const base = slugify(name);
  if (!base) throw new ValidationError('Could not derive a slug from the CJ product name');

  const existing = await prisma.product.findUnique({ where: { slug: base } });
  if (!existing) return base;

  // Extremely unlikely (two different products slugifying to the same
  // name), but keep import deterministic rather than silently colliding.
  return `${base}-${slugify(String(cjProductId))}`;
}

/**
 * Imports a single CJ product by id into the local catalog.
 * @param {string} cjProductId
 * @returns {Promise<{ productId: string, variantCount: number }>}
 */
async function importProduct(cjProductId) {
  const alreadyImported = await localProductService.findByCjProductId(cjProductId);
  if (alreadyImported) {
    throw new ConflictError('Product already imported.');
  }

  // Existing CJ service - detail endpoint only (product/query), reuses the
  // existing cjRequest()/token-auth logic. Never the list/search endpoint.
  const cjProduct = await cjService.getProductById(cjProductId);

  const price = mapper.toNumberOrNull(cjProduct.price);
  if (price === null) {
    throw new ValidationError('CJ product has no valid price to import');
  }

  const slug = await buildUniqueSlug(cjProduct.name, cjProductId);
  const mappedVariants = (cjProduct.variants || []).map(mapper.mapVariant);

  // Best-effort CJ freight lookup - see computeShippingInfo() for why this
  // never blocks the import from succeeding.
  const shippingInfo = await mapper.computeShippingInfo(cjProduct);
  const fields = mapper.mapProductFields(cjProduct, shippingInfo);

  const productData = {
    ...fields,
    cjProductId: String(cjProductId),
    slug,
    // shippingCost is a non-nullable column - fields.shippingCost can be
    // null when CJ had no freight route at all; default to 0 exactly like
    // before this field existed, so the admin can still price it manually.
    shippingCost: fields.shippingCost ?? 0,
    comparePrice: mapper.toNumberOrNull(cjProduct.suggestedPrice),
    myPrice: price, // no selling price input at import time; defaults to cost
  };

  try {
    const { productId, variantCount } = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({ data: productData });

      let count = 0;
      if (mappedVariants.length) {
        const created = await tx.variant.createMany({
          data: mappedVariants.map((v) => ({ ...v, productId: product.id })),
        });
        count = created.count;
      }

      return { productId: product.id, variantCount: count };
    });

    return { productId, variantCount };
  } catch (err) {
    if (err.code === 'P2002') {
      throw new ConflictError('Product already imported.');
    }
    throw err;
  }
}

module.exports = { importProduct };

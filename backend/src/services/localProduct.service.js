// Local product catalog - only products we've deliberately imported from CJ.
// This never talks to the CJ API; see cj.service.js for that.
const prisma = require('../config/prisma');
const { slugify } = require('../utils/slugify');
const { ValidationError, NotFoundError } = require('../utils/errors');

const REQUIRED_FIELDS = ['cjProductId', 'name', 'price', 'myPrice'];
const VALID_STATUSES = ['draft', 'published'];

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Includes variants so the admin table/edit dialog can show stock and
// per-warehouse data without an extra request per product.
async function listProducts() {
  return prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: { variants: true },
  });
}

async function getProductById(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: true },
  });
  if (!product) throw new NotFoundError(`Product ${id} not found`);
  return product;
}

// Used by the CJ import flow to check for an already-imported product before
// doing any CJ API work or attempting an insert.
async function findByCjProductId(cjProductId) {
  return prisma.product.findUnique({ where: { cjProductId: String(cjProductId) } });
}

/**
 * Creates a locally-stored product. Accepts a plain JSON body for now
 * (manual entry) - no CJ API call happens here.
 */
async function createProduct(input) {
  const missing = REQUIRED_FIELDS.filter(
    (field) => input[field] === undefined || input[field] === null || input[field] === '',
  );
  if (missing.length) {
    throw new ValidationError(`Missing required field(s): ${missing.join(', ')}`);
  }

  const price = toNumberOrNull(input.price);
  if (price === null) throw new ValidationError('price must be a number');

  const myPrice = toNumberOrNull(input.myPrice);
  if (myPrice === null) throw new ValidationError('myPrice must be a number');

  const comparePrice = input.comparePrice === undefined ? null : toNumberOrNull(input.comparePrice);
  if (input.comparePrice !== undefined && comparePrice === null) {
    throw new ValidationError('comparePrice must be a number');
  }

  let status = 'draft';
  if (input.status !== undefined) {
    if (!VALID_STATUSES.includes(input.status)) {
      throw new ValidationError(`status must be one of: ${VALID_STATUSES.join(', ')}`);
    }
    status = input.status;
  }

  const cjProductId = String(input.cjProductId);

  const existing = await prisma.product.findUnique({ where: { cjProductId } });
  if (existing) {
    throw new ValidationError(`A product with cjProductId "${cjProductId}" already exists`);
  }

  const slug = slugify(input.slug || input.name);
  if (!slug) throw new ValidationError('Could not derive a slug from the product name');

  const data = {
    cjProductId,
    name: input.name,
    slug,
    description: input.description ?? null,
    shortDescription: input.shortDescription ?? null,
    sku: input.sku ?? null,
    price,
    comparePrice,
    myPrice,
    currency: input.currency ?? 'USD',
    categoryId: input.categoryId ?? null,
    categoryName: input.categoryName ?? null,
    brand: input.brand ?? null,
    image: input.image ?? null,
    images: input.images ?? undefined,
    status,
    featured: Boolean(input.featured),
  };

  try {
    return await prisma.product.create({ data });
  } catch (err) {
    if (err.code === 'P2002') {
      throw new ValidationError(`A product with this ${uniqueConstraintField(err)} already exists`);
    }
    throw err;
  }
}

// Fields an admin is allowed to edit after import. Notably excludes slug
// (keeps product URLs stable across edits) and cjProductId/price (the CJ
// cost is never editable - it reflects what CJ actually charges us).
const ADMIN_UPDATABLE_FIELDS = [
  'name',
  'shortDescription',
  'description',
  'myPrice',
  'comparePrice',
  'shippingCost',
  'featured',
  'status',
  'image',
];

/**
 * Admin edit - updates only the whitelisted fields on an existing product.
 */
async function updateProduct(id, patch) {
  const current = await prisma.product.findUnique({ where: { id } });
  if (!current) throw new NotFoundError(`Product ${id} not found`);

  const data = {};

  for (const field of ADMIN_UPDATABLE_FIELDS) {
    if (patch[field] !== undefined) data[field] = patch[field];
  }

  if (data.name !== undefined) {
    const name = String(data.name).trim();
    if (!name) throw new ValidationError('name cannot be empty');
    data.name = name;
  }

  if (data.myPrice !== undefined) {
    const myPrice = toNumberOrNull(data.myPrice);
    if (myPrice === null) throw new ValidationError('myPrice must be a number');
    if (myPrice < 0) throw new ValidationError('myPrice must be >= 0');
    data.myPrice = myPrice;
  }

  if (data.comparePrice !== undefined) {
    if (data.comparePrice === null) {
      // explicit null clears it
    } else {
      const comparePrice = toNumberOrNull(data.comparePrice);
      if (comparePrice === null) throw new ValidationError('comparePrice must be a number');
      data.comparePrice = comparePrice;
    }
  }

  if (data.shippingCost !== undefined) {
    const shippingCost = toNumberOrNull(data.shippingCost);
    if (shippingCost === null) throw new ValidationError('shippingCost must be a number');
    if (shippingCost < 0) throw new ValidationError('shippingCost must be >= 0');
    data.shippingCost = shippingCost;
  }

  if (data.status !== undefined && !VALID_STATUSES.includes(data.status)) {
    throw new ValidationError(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  if (data.featured !== undefined) data.featured = Boolean(data.featured);

  if (Object.keys(data).length === 0) {
    throw new ValidationError('No updatable fields provided');
  }

  // comparePrice >= myPrice, checked against whichever values will actually
  // be in effect after this update (untouched side keeps its current value).
  const nextMyPrice = data.myPrice !== undefined ? data.myPrice : toNumberOrNull(current.myPrice);
  const nextComparePrice =
    data.comparePrice !== undefined ? data.comparePrice : toNumberOrNull(current.comparePrice);

  if (nextComparePrice !== null && nextMyPrice !== null && nextComparePrice < nextMyPrice) {
    throw new ValidationError('comparePrice must be greater than or equal to myPrice');
  }

  try {
    return await prisma.product.update({ where: { id }, data });
  } catch (err) {
    if (err.code === 'P2002') {
      throw new ValidationError(`A product with this ${uniqueConstraintField(err)} already exists`);
    }
    throw err;
  }
}

// Extracts the conflicting field name from a Prisma P2002 error. The driver
// adapter (Prisma 7 + @prisma/adapter-pg) nests it under
// meta.driverAdapterError.cause.constraint.fields; classic Prisma engines use
// meta.target. Falls back to a generic label if neither shape matches.
function uniqueConstraintField(err) {
  const adapterFields = err.meta?.driverAdapterError?.cause?.constraint?.fields;
  if (Array.isArray(adapterFields) && adapterFields.length) return adapterFields.join(', ');

  const target = err.meta?.target;
  if (Array.isArray(target) && target.length) return target.join(', ');
  if (typeof target === 'string' && target) return target;

  return 'unique field';
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  findByCjProductId,
  uniqueConstraintField,
};

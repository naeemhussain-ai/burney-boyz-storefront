// Public ShopNow data source - reads ONLY from the local Neon catalog
// (published products we've chosen to import). Never calls the CJ API.
const prisma = require('../config/prisma');
const { NotFoundError } = require('../utils/errors');

const SORT_MAP = {
  newest: { createdAt: 'desc' },
  'price-asc': { myPrice: 'asc' },
  'price-desc': { myPrice: 'desc' },
  // Sprint 8 / Step 21
  'best-selling': { salesCount: 'desc' },
  'highest-rated': { avgRating: 'desc' },
};

// Deliberately excludes the internal CJ cost (`price`) - the public
// storefront should only ever see our selling price (myPrice), never the
// wholesale cost behind it.
const PRODUCT_LIST_SELECT = {
  id: true,
  slug: true,
  name: true,
  image: true,
  myPrice: true,
  comparePrice: true,
  shortDescription: true,
  categoryId: true,
  categoryName: true,
  featured: true,
  avgRating: true,
  reviewCount: true,
  createdAt: true,
};

const PRODUCT_DETAIL_SELECT = {
  id: true,
  cjProductId: true,
  name: true,
  slug: true,
  description: true,
  shortDescription: true,
  sku: true,
  myPrice: true,
  comparePrice: true,
  categoryId: true,
  categoryName: true,
  brand: true,
  image: true,
  images: true,
  status: true,
  featured: true,
  avgRating: true,
  reviewCount: true,
  createdAt: true,
  updatedAt: true,
  variants: {
    select: {
      id: true,
      cjVariantId: true,
      sku: true,
      name: true,
      option1: true,
      option2: true,
      option3: true,
      myPrice: true, // variant cost (`price`) excluded for the same reason
      stock: true,
      image: true,
      createdAt: true,
    },
  },
};

/**
 * @param {object} [options]
 * @param {number} [options.page=1]
 * @param {number} [options.limit=20]
 * @param {string} [options.category] - categoryId, or comma-separated list of categoryIds
 * @param {string} [options.search] - case-insensitive substring match on name OR sku
 * @param {number} [options.minPrice] - inclusive, matched against myPrice
 * @param {number} [options.maxPrice] - inclusive, matched against myPrice
 * @param {'in_stock'|'out_of_stock'} [options.availability]
 * @param {boolean} [options.featured]
 * @param {'newest'|'price-asc'|'price-desc'|'best-selling'|'highest-rated'} [options.sort='newest']
 */
async function listPublishedProducts({
  page = 1,
  limit = 20,
  category,
  search,
  minPrice,
  maxPrice,
  availability,
  featured,
  sort,
} = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));

  const where = { status: 'published' };
  if (category) {
    // Comma-separated to support the multi-select category filter - a
    // single id still behaves exactly as before.
    const ids = String(category).split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.length === 1) where.categoryId = ids[0];
    else if (ids.length > 1) where.categoryId = { in: ids };
  }

  // Matches both name and SKU in one box - the natural "search by name" /
  // "search by SKU" UX is a single query field, not two separate inputs.
  if (search && String(search).trim()) {
    const term = String(search).trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { sku: { contains: term, mode: 'insensitive' } },
    ];
  }

  const min = minPrice !== undefined && minPrice !== '' ? Number(minPrice) : null;
  const max = maxPrice !== undefined && maxPrice !== '' ? Number(maxPrice) : null;
  if (Number.isFinite(min) || Number.isFinite(max)) {
    where.myPrice = {};
    if (Number.isFinite(min)) where.myPrice.gte = min;
    if (Number.isFinite(max)) where.myPrice.lte = max;
  }

  // No product-level stock column by design (see cjProductMapper.js) - in
  // stock means at least one variant has stock > 0; out of stock covers
  // both "every variant is at/under 0" and "no variants at all".
  if (availability === 'in_stock') {
    where.variants = { some: { stock: { gt: 0 } } };
  } else if (availability === 'out_of_stock') {
    where.variants = { none: { stock: { gt: 0 } } };
  }

  if (featured !== undefined) {
    where.featured = featured === true || featured === 'true';
  }

  const orderBy = SORT_MAP[sort] || SORT_MAP.newest;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: PRODUCT_LIST_SELECT,
      orderBy,
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / safeLimit),
    },
  };
}

async function getPublishedProductBySlug(slug) {
  const product = await prisma.product.findUnique({
    where: { slug },
    select: PRODUCT_DETAIL_SELECT,
  });

  // A draft/unpublished product is treated as not found on the public
  // storefront, not just filtered - it should never be reachable by slug.
  if (!product || product.status !== 'published') {
    throw new NotFoundError(`Product "${slug}" not found`);
  }

  return product;
}

/**
 * Distinct categories among published products, for the ShopNow category
 * filter. Not in the original two-endpoint spec, but required to make the
 * category filter usable - the product list response intentionally doesn't
 * include category fields, so the frontend has no other way to know what
 * categories exist.
 */
async function listPublishedCategories() {
  const rows = await prisma.product.findMany({
    where: { status: 'published', categoryId: { not: null } },
    select: { categoryId: true, categoryName: true },
    distinct: ['categoryId'],
    orderBy: { categoryName: 'asc' },
  });

  return rows.map((row) => ({ id: row.categoryId, name: row.categoryName }));
}

/**
 * Lightweight autocomplete for the header search box - matches name or SKU,
 * published products only, ranked by best-selling so popular matches surface
 * first. Deliberately minimal (no pagination) - this backs a dropdown, not
 * a results page.
 * @param {string} query
 * @param {number} [limit=8]
 */
async function getSearchSuggestions(query, limit = 8) {
  const q = String(query || '').trim();
  if (!q) return [];
  const safeLimit = Math.max(1, Math.min(20, Number(limit) || 8));

  return prisma.product.findMany({
    where: {
      status: 'published',
      OR: [{ name: { contains: q, mode: 'insensitive' } }, { sku: { contains: q, mode: 'insensitive' } }],
    },
    select: { id: true, slug: true, name: true, image: true, myPrice: true },
    orderBy: { salesCount: 'desc' },
    take: safeLimit,
  });
}

/**
 * Bumps Product.salesCount for each line item of a newly-paid order - backs
 * the "Best Selling" sort. Best-effort per item: one bad id must never
 * break the count for the rest of the order (called fire-and-forget from
 * order.service.js, same pattern as its email/CJ-order side effects).
 * @param {Array<{productId: string|null, quantity: number}>} items
 */
async function incrementSalesCounts(items) {
  await Promise.all(
    (items || [])
      .filter((i) => i.productId && Number(i.quantity) > 0)
      .map((i) =>
        prisma.product
          .update({ where: { id: i.productId }, data: { salesCount: { increment: Number(i.quantity) } } })
          .catch((err) => {
            console.error(`[Shop] salesCount increment failed for product ${i.productId}:`, err.message);
          }),
      ),
  );
}

module.exports = {
  listPublishedProducts,
  getPublishedProductBySlug,
  listPublishedCategories,
  getSearchSuggestions,
  incrementSalesCounts,
  PRODUCT_LIST_SELECT,
};

// Raw-SQL data access for the `products` table. Controllers/services should
// go through these functions rather than querying the pool directly.
const { query } = require('../config/db');

// camelCase <-> snake_case column mapping, kept in one place so every
// function (and future callers) stays in sync with the schema.
const COLUMNS = {
  cjProductId: 'cj_product_id',
  name: 'name',
  slug: 'slug',
  description: 'description',
  price: 'price',
  comparePrice: 'compare_price',
  profitAmount: 'profit_amount',
  image: 'image',
  sku: 'sku',
  categoryId: 'category_id',
  categoryName: 'category_name',
  status: 'status',
  featured: 'featured',
};

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    cjProductId: row.cj_product_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: row.price,
    comparePrice: row.compare_price,
    profitAmount: row.profit_amount,
    image: row.image,
    sku: row.sku,
    categoryId: row.category_id,
    categoryName: row.category_name,
    status: row.status,
    featured: row.featured,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Inserts a new product row.
 * @param {object} data - camelCase fields matching COLUMNS (all optional
 *   except name/slug, which the `products` table requires).
 */
async function createProduct(data) {
  const {
    cjProductId = null,
    name,
    slug,
    description = null,
    price = null,
    comparePrice = null,
    profitAmount = null,
    image = null,
    sku = null,
    categoryId = null,
    categoryName = null,
    status = 'draft',
    featured = false,
  } = data;

  const { rows } = await query(
    `INSERT INTO products (
       cj_product_id, name, slug, description, price, compare_price,
       profit_amount, image, sku, category_id, category_name, status, featured
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      cjProductId, name, slug, description, price, comparePrice,
      profitAmount, image, sku, categoryId, categoryName, status, featured,
    ],
  );

  return mapRow(rows[0]);
}

/**
 * Partially updates a product by id. Only keys present in `data` (and in
 * COLUMNS) are written; anything else is ignored.
 */
async function updateProduct(id, data) {
  const entries = Object.entries(data).filter(([key]) => key in COLUMNS);
  if (entries.length === 0) return findById(id);

  const setClauses = entries.map(([key], i) => `${COLUMNS[key]} = $${i + 2}`);
  const values = entries.map(([, value]) => value);

  const { rows } = await query(
    `UPDATE products
     SET ${setClauses.join(', ')}, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, ...values],
  );

  return mapRow(rows[0]);
}

async function findByCJId(cjProductId) {
  const { rows } = await query('SELECT * FROM products WHERE cj_product_id = $1', [cjProductId]);
  return mapRow(rows[0]);
}

async function findById(id) {
  const { rows } = await query('SELECT * FROM products WHERE id = $1', [id]);
  return mapRow(rows[0]);
}

async function findBySlug(slug) {
  const { rows } = await query('SELECT * FROM products WHERE slug = $1', [slug]);
  return mapRow(rows[0]);
}

/**
 * Lists products with optional status/featured filters and pagination.
 * @param {object} [options]
 * @param {number} [options.page=1]
 * @param {number} [options.limit=20]
 * @param {string} [options.status] - exact match on `status`
 * @param {boolean} [options.featured] - exact match on `featured`
 */
async function listProducts({ page = 1, limit = 20, status, featured } = {}) {
  const conditions = [];
  const values = [];

  if (status !== undefined) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }
  if (featured !== undefined) {
    values.push(featured);
    conditions.push(`featured = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, Math.min(100, limit));
  const offset = (safePage - 1) * safeLimit;

  const { rows } = await query(
    `SELECT * FROM products ${where}
     ORDER BY created_at DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, safeLimit, offset],
  );

  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total FROM products ${where}`,
    values,
  );

  return {
    products: rows.map(mapRow),
    total: countRows[0]?.total ?? 0,
    page: safePage,
    limit: safeLimit,
  };
}

async function deleteProduct(id) {
  const { rows } = await query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
  return mapRow(rows[0]);
}

module.exports = {
  createProduct,
  updateProduct,
  findByCJId,
  findById,
  findBySlug,
  listProducts,
  deleteProduct,
};

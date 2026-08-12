const axios = require('axios');
const { getToken } = require('../utils/cjAuth');
const { fromAxiosError, unwrapCjResponse, NotFoundError, CJApiError } = require('../utils/errors');
const { throttledCjCall } = require('../utils/cjThrottle');

const REQUEST_TIMEOUT_MS = Number(process.env.CJ_TIMEOUT_MS) || 15000;
const isDev = () => process.env.NODE_ENV === 'development';

// ─── Internal HTTP helper ─────────────────────────────────────────────────────
// Every CJ API call in this service goes through here - it owns auth headers,
// timeouts, dev-only logging, and error normalization.

async function cjRequest(method, path, { params = null, data = null } = {}) {
  const token = await getToken();
  const url = `${process.env.CJ_BASE_URL}${path}`;

  if (isDev()) {
    console.log(`[CJ] Request  : ${method.toUpperCase()} ${url}`);
    if (params) console.log('[CJ] Params   :', JSON.stringify(params));
  }

  let response;
  try {
    response = await throttledCjCall(() => axios({
      method,
      url,
      params,
      data,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        'CJ-Access-Token': token,
      },
    }));
  } catch (err) {
    if (isDev()) console.error('[CJ] Request failed:', err.message);
    throw fromAxiosError(err);
  }

  if (isDev()) {
    const preview = JSON.stringify(response.data)?.slice(0, 500);
    console.log(`[CJ] Response : ${response.status} | ${preview}${preview?.length === 500 ? '…' : ''}`);
  }

  return response.data;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// Maps our public sort field names to CJ's numeric orderBy codes.
const ORDER_BY = { match: 0, sales: 1, price: 2, newest: 3, inventory: 4 };

// CJ category ids this storefront never surfaces or imports from - this
// store sells fashion, not adult content, so "Adult Wellness" (a leaf under
// Home, Garden & Furniture > Home Storage) is blocked at the source rather
// than relying on the admin to avoid it while browsing. Configurable via env
// (comma-separated ids) in case CJ adds more such categories later.
const BLOCKED_CATEGORY_IDS = new Set(
  (process.env.CJ_BLOCKED_CATEGORY_IDS || '1697200256204677120')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
);

function isBlockedCategory(categoryId) {
  return Boolean(categoryId) && BLOCKED_CATEGORY_IDS.has(String(categoryId));
}

// CJ returns productImageSet as a JSON string, a plain array, or null.
function parseImageSet(imageSet) {
  if (!imageSet) return [];
  if (Array.isArray(imageSet)) return imageSet;
  try {
    const parsed = JSON.parse(imageSet);
    return Array.isArray(parsed) ? parsed : [String(imageSet)];
  } catch {
    return [String(imageSet)];
  }
}

// CJ returns productKeySet like ["Color","Size"] and variantKey like "Gray-38".
// We zip them to produce per-variant properties and product-level color/size sets.
function deriveOptions(variants, productKeySet = []) {
  const colorIdx = productKeySet.findIndex((k) => k.toLowerCase() === 'color');
  const sizeIdx  = productKeySet.findIndex((k) => k.toLowerCase() === 'size');
  const colors   = new Set();
  const sizes    = new Set();

  variants.forEach((v) => {
    const parts = v.variantKey ? v.variantKey.split('-') : [];
    if (colorIdx >= 0 && parts[colorIdx]) colors.add(parts[colorIdx]);
    if (sizeIdx  >= 0 && parts[sizeIdx])  sizes.add(parts[sizeIdx]);
  });

  return { colors: [...colors], sizes: [...sizes] };
}

// Maps a raw CJ variant to a clean React-ready shape.
// productKeySet drives which slot in variantKey is "Color", "Size", etc.
function mapVariant(v, productKeySet = []) {
  const keyParts = v.variantKey ? v.variantKey.split('-') : [];

  const properties = productKeySet
    .map((name, i) => ({ propertyName: name, propertyValueName: keyParts[i] || null }))
    .filter((p) => p.propertyValueName !== null);

  return {
    id: v.vid,
    sku: v.variantSku,
    name: v.variantNameEn || v.variantName,
    image: v.variantImage || null,
    key: v.variantKey || null,
    price: v.variantSellPrice,
    suggestedPrice: v.variantSugSellPrice ?? null,
    barcode: v.barcode || null,
    barcode2: v.barcode2 || null,
    standard: v.variantStandard || null,
    weight: v.variantWeight,           // grams
    dimensions: {
      length: v.variantLength,         // mm
      width: v.variantWidth,
      height: v.variantHeight,
    },
    properties,
    inventory: (v.inventories || []).map((inv) => ({
      countryCode: inv.countryCode,
      total: inv.totalInventory,
      verified: inv.verifiedWarehouse,
    })),
  };
}

// Maps a raw CJ listV2 product entry to a clean, frontend-ready summary.
// Flat id/name/price/image/sku/categoryId/categoryName/variants fields are kept
// for backward compatibility with the original /api/products consumers.
function mapProductSummary(p) {
  return {
    id: p.id,
    sku: p.sku || p.spu || null,
    name: p.nameEn,
    price: p.sellPrice,
    image: p.bigImage,
    categoryId: p.categoryId || null,
    categoryName: p.threeCategoryName || null,
    category: {
      id: p.categoryId || null,
      name: p.threeCategoryName || null,
      parent: p.twoCategoryId ? { id: p.twoCategoryId, name: p.twoCategoryName } : null,
      top: p.oneCategoryId ? { id: p.oneCategoryId, name: p.oneCategoryName } : null,
    },
    freeShipping: p.addMarkStatus === 1,
    hasVideo: Boolean(p.isVideo ?? p.isVedio),
    inventory: p.warehouseInventoryNum ?? null,
    listedNum: p.listedNum ?? null,
    variants: [],
  };
}

// ─── Test ─────────────────────────────────────────────────────────────────────

exports.getTestResponse = async () => {
  return { message: 'API Working' };
};

// ─── Authentication ───────────────────────────────────────────────────────────

exports.getAccessToken = async () => {
  return getToken();
};

// ─── Products - Search / List (shared) ───────────────────────────────────────
// Backs both GET /api/products and GET /api/search via /product/listV2 - the
// current CJ-recommended search endpoint (supports keyword, category, price
// range, and sort, unlike the legacy /product/list).

/**
 * @param {object} options
 * @param {string} [options.keyword] - matched against product name/SKU
 * @param {number} [options.page=1]
 * @param {number} [options.limit=20]
 * @param {string} [options.categoryId] - third-level category ID
 * @param {'match'|'sales'|'price'|'newest'|'inventory'} [options.sort='match']
 * @param {'asc'|'desc'} [options.order='desc']
 * @param {number} [options.minPrice]
 * @param {number} [options.maxPrice]
 */
exports.queryProducts = async ({
  keyword,
  page = 1,
  limit = 20,
  categoryId,
  sort = 'match',
  order = 'desc',
  minPrice,
  maxPrice,
} = {}) => {
  const pageNum = clamp(page, 1, 1000, 1);
  const pageSize = clamp(limit, 1, 100, 20);
  const orderBy = ORDER_BY[sort] ?? ORDER_BY.match;
  const sortDir = order === 'asc' ? 'asc' : 'desc';

  const params = {
    page: pageNum,
    size: pageSize,
    sort: sortDir,
    orderBy,
    features: 'enable_category',
  };
  if (keyword) params.keyWord = keyword;
  if (categoryId) params.categoryId = categoryId;
  if (minPrice !== undefined && minPrice !== '') params.startSellPrice = minPrice;
  if (maxPrice !== undefined && maxPrice !== '') params.endSellPrice = maxPrice;

  const body = await cjRequest('GET', '/product/listV2', { params });
  const data = unwrapCjResponse(body, { fallbackMessage: 'CJ product search failed' });

  const products = (data.content || [])
    .flatMap((entry) => entry.productList || [])
    .map(mapProductSummary)
    .filter((p) => !isBlockedCategory(p.categoryId));

  return {
    products,
    pagination: {
      page: data.pageNumber || pageNum,
      limit: data.pageSize || pageSize,
      total: data.totalRecords ?? 0,
      totalPages: data.totalPages ?? 0,
    },
  };
};

// ─── Categories ───────────────────────────────────────────────────────────────

exports.getCategories = async () => {
  const body = await cjRequest('GET', '/product/getCategory');
  const data = unwrapCjResponse(body, { fallbackMessage: 'CJ category list request failed' });

  return (data || []).map((top) => ({
    id: top.categoryFirstId,
    name: top.categoryFirstName,
    children: (top.categoryFirstList || []).map((mid) => ({
      id: mid.categorySecondId,
      name: mid.categorySecondName,
      children: (mid.categorySecondList || [])
        .filter((leaf) => !isBlockedCategory(leaf.categoryId))
        .map((leaf) => ({
          id: leaf.categoryId,
          name: leaf.categoryName,
        })),
    })),
  }));
};

/**
 * Fetches live per-variant, per-warehouse stock for a product in a single
 * call. CJ's own /product/query response carries an `inventories` field per
 * variant, but it always comes back null there (confirmed empirically across
 * multiple unrelated products) - actual live stock only lives behind this
 * dedicated endpoint. Merged into getProductById() below.
 *
 * Endpoint: GET /product/stock/getInventoryByPid?pid={pid}
 *
 * @param {string} pid - CJ product ID
 * @returns {Promise<Map<string, Array<{countryCode: string, total: number, verified: number}>>>}
 *   keyed by CJ variant id (vid)
 */
async function getProductVariantInventory(pid) {
  const body = await cjRequest('GET', '/product/stock/getInventoryByPid', { params: { pid } });

  // Unlike most CJ endpoints (which signal success via `result: true`), this
  // one uses `success: true` with no `result` field - unwrapCjResponse()
  // expects the former and would wrongly treat this as an error, so this
  // envelope is checked directly instead.
  if (!body || !body.success || body.data === undefined || body.data === null) {
    throw new CJApiError(body?.message || 'CJ inventory request failed', 502, body?.code);
  }
  const data = body.data;

  const map = new Map();
  for (const entry of data.variantInventories || []) {
    map.set(
      entry.vid,
      (entry.inventory || []).map((inv) => ({
        countryCode: inv.countryCode,
        total: inv.totalInventory,
        verified: inv.verifiedWarehouse,
      })),
    );
  }
  return map;
}

// ─── Products - Detail ────────────────────────────────────────────────────────

/**
 * Fetches complete product details including all variants, images, and inventory.
 *
 * Endpoint: GET /product/query?pid={pid}
 * Docs: https://developers.cjdropshipping.com/en/api/api2/api/product.html#_2-query-product-details-get
 *
 * @param {string} pid - CJ product ID
 */
exports.getProductById = async (pid) => {
  const body = await cjRequest('GET', '/product/query', { params: { pid } });
  const p = unwrapCjResponse(body, { fallbackMessage: 'CJ product detail request failed' });

  // Blocked categories (see BLOCKED_CATEGORY_IDS) are off-limits even by
  // direct id - never let one reach a preview or import, not just search.
  if (isBlockedCategory(p.categoryId)) {
    throw new NotFoundError('Product not found');
  }

  // productKeyEn ("Color-Size") matches the slot order of variantKey ("Gray-38").
  // productKeySet/productKeyEnSet are returned in reversed order by CJ - do not use them for slot mapping.
  const keySet = p.productKeyEn ? p.productKeyEn.split('-') : [];
  const rawVars = p.variants || [];

  const variants = rawVars.map((v) => mapVariant(v, keySet));

  // Merge in live stock (see getProductVariantInventory doc comment above).
  // Non-fatal on failure - a transient inventory-endpoint error shouldn't
  // block an otherwise-good import/sync; the product just keeps whatever
  // stock it already had (0/null) until the next successful sync.
  try {
    const inventoryByVid = await getProductVariantInventory(pid);
    for (const variant of variants) {
      const inv = inventoryByVid.get(variant.id);
      if (inv) variant.inventory = inv;
    }
  } catch (err) {
    if (isDev()) console.error('[CJ] Failed to fetch live inventory for', pid, ':', err.message);
  }
  const { colors, sizes } = deriveOptions(rawVars, keySet);
  const images = parseImageSet(p.productImageSet);

  // Ensure the primary big image is always at index 0 without duplicating.
  if (p.bigImage && !images.includes(p.bigImage)) {
    images.unshift(p.bigImage);
  }

  return {
    id: p.pid,
    sku: p.productSku,
    name: p.productNameEn || p.productName,
    description: p.description || null,   // raw HTML from CJ
    price: p.sellPrice,
    suggestedPrice: p.suggestSellPrice || null,

    category: {
      id: p.categoryId,
      name: p.categoryName,
    },
    brand: p.supplierName || null,

    weight: p.productWeight || null,       // string range e.g. "1000.00-1120.00" grams
    packagingWeight: p.packingWeight || null,
    packageDimensions: variants[0]?.dimensions || null, // mm, from primary variant

    primaryImage: p.bigImage || images[0] || null,
    images,

    attributes: {
      logistics: p.productProEnSet || [],   // e.g. ["COMMON"]
      material: p.materialNameEnSet || [],
      packing: p.packingNameEnSet || [],
    },
    specifications: {
      optionTypes: keySet,                  // e.g. ["Color","Size"]
      customsCode: p.entryCode || null,
      customsName: p.entryNameEn || null,
    },
    shipping: {
      freeShipping: p.addMarkStatus === 1,
      packagingWeight: p.packingWeight || null,
      packingMaterials: p.packingNameEnSet || [],
    },

    variants,
    colors,
    sizes,

    video: Array.isArray(p.productVideo) && p.productVideo.length ? p.productVideo : null,
    listedNum: p.listedNum ?? null,
    status: p.status || null,
  };
};

// ─── Logistics - Freight Calculation ──────────────────────────────────────────

/**
 * Quotes shipping cost/carrier options for one item between two countries.
 *
 * Endpoint: POST /logistic/freightCalculate ("simple mode")
 * Docs: https://developers.cjdropshipping.com/en/api/api2/api/logistic.html
 *
 * CJ returns an empty array (not an error) when it has no logistics option
 * for the given route - that's a valid "not shippable there" result, not a
 * failure, so callers should treat [] as legitimate data.
 *
 * @param {object} options
 * @param {string} options.vid - CJ variant id (freight is quoted per-variant, not per-product)
 * @param {number} [options.quantity=1]
 * @param {string} options.startCountryCode - origin warehouse country code
 * @param {string} options.endCountryCode - destination country code
 * @returns {Promise<Array<{ logisticName: string, price: number, priceCny: number|null, aging: string|null }>>}
 */
exports.getFreightQuote = async ({ vid, quantity = 1, startCountryCode, endCountryCode }) => {
  const body = await cjRequest('POST', '/logistic/freightCalculate', {
    data: {
      startCountryCode,
      endCountryCode,
      products: [{ vid, quantity }],
    },
  });
  const data = unwrapCjResponse(body, { fallbackMessage: 'CJ freight calculation failed' });

  return (Array.isArray(data) ? data : []).map((q) => ({
    logisticName: q.logisticName || null,
    price: q.logisticPrice ?? null,
    priceCny: q.logisticPriceCn ?? null,
    aging: q.logisticAging || null,
  }));
};

// ─── Shopping - Order Automation (Sprint 7 / Step 19) ─────────────────────────

// payType: 1 = page payment (default), 2 = balance payment (spends real CJ
// wallet balance), 3 = create only, no payment. This store creates orders
// create-only by default - an admin reviews and pays from the CJ dashboard
// themselves. Configurable in case that's ever revisited, but never defaults
// to spending money automatically.
const ORDER_PAY_TYPE = Number(process.env.CJ_ORDER_PAY_TYPE) || 3;

/**
 * Creates an order in CJ for a set of variants/quantities - stages it for
 * fulfillment but (with the default payType=3) does NOT pay for it. Paying
 * requires a separate addCart -> confirmOrder -> payBalance sequence this
 * store does not call automatically; an admin pays from the CJ dashboard.
 *
 * Endpoint: POST /shopping/order/createOrderV2
 * Docs: https://developers.cjdropshipping.com/en/api/api2/api/shopping.html
 *
 * @param {object} options
 * @param {string} options.orderNumber - our own order number, must be unique per CJ account
 * @param {string} options.shippingCountryCode - ISO alpha-2
 * @param {string} options.shippingCountry
 * @param {string} options.shippingProvince
 * @param {string} options.shippingCity
 * @param {string} options.shippingCustomerName
 * @param {string} options.shippingAddress
 * @param {string} [options.shippingZip]
 * @param {string} [options.shippingPhone]
 * @param {string} [options.email]
 * @param {string} options.logisticName - carrier name, e.g. from getFreightQuote()
 * @param {string} options.fromCountryCode - origin warehouse country
 * @param {Array<{vid?: string, sku?: string, quantity: number, storeLineItemId?: string}>} options.products
 * @returns {Promise<{ cjOrderId: string|null, orderStatus: string|null, orderAmount: number|null, productAmount: number|null, postageAmount: number|null }>}
 */
exports.createCjOrder = async ({
  orderNumber,
  shippingCountryCode,
  shippingCountry,
  shippingProvince,
  shippingCity,
  shippingCustomerName,
  shippingAddress,
  shippingZip,
  shippingPhone,
  email,
  logisticName,
  fromCountryCode,
  products,
}) => {
  const body = await cjRequest('POST', '/shopping/order/createOrderV2', {
    data: {
      orderNumber,
      shippingCountryCode,
      shippingCountry,
      shippingProvince,
      shippingCity,
      shippingCustomerName,
      shippingAddress,
      shippingZip: shippingZip || undefined,
      shippingPhone: shippingPhone || undefined,
      email: email || undefined,
      logisticName,
      fromCountryCode,
      payType: ORDER_PAY_TYPE,
      products,
    },
  });
  const data = unwrapCjResponse(body, { fallbackMessage: 'CJ order creation failed' });

  return {
    cjOrderId: data.orderId !== undefined && data.orderId !== null ? String(data.orderId) : null,
    orderStatus: data.orderStatus || null,
    orderAmount: data.orderAmount ?? null,
    productAmount: data.productAmount ?? null,
    postageAmount: data.postageAmount ?? null,
  };
};

/**
 * Fetches the current status/tracking info for a CJ order.
 *
 * Endpoint: GET /shopping/order/getOrderDetail
 * Docs: https://developers.cjdropshipping.com/en/api/api2/api/shopping.html
 *
 * @param {string} cjOrderId
 * @returns {Promise<{ orderStatus: string|null, trackNumber: string|null, trackingProvider: string|null, logisticName: string|null }>}
 */
exports.getCjOrderDetail = async (cjOrderId) => {
  const body = await cjRequest('GET', '/shopping/order/getOrderDetail', {
    params: { orderId: cjOrderId },
  });
  const data = unwrapCjResponse(body, { fallbackMessage: 'CJ order detail request failed' });

  return {
    orderStatus: data.orderStatus || null,
    trackNumber: data.trackNumber || null,
    trackingProvider: data.trackingProvider || null,
    logisticName: data.logisticName || null,
  };
};

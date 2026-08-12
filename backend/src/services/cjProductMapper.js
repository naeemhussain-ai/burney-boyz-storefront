// Shared CJ -> local-schema field mapping. Used by BOTH the import flow
// (productImport.service.js, creates a new Product) and the sync flow
// (productSync.service.js, Sprint 7 Step 18, updates an existing one) so the
// two flows can never drift out of sync with each other - there is exactly
// one place that knows how a CJ product/variant turns into our schema shape.
const cjService = require('./cj.service');

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toIntOrNull(value) {
  const n = toNumberOrNull(value);
  return n === null ? null : Math.round(n);
}

// Sums inventory across every warehouse CJ reports for a variant into the
// single `stock` int our schema stores.
function sumStock(inventory) {
  if (!Array.isArray(inventory) || inventory.length === 0) return null;
  const total = inventory.reduce((sum, entry) => sum + (Number(entry?.total) || 0), 0);
  return Number.isFinite(total) ? total : null;
}

// Maps CJ's productKeySet-derived variant properties onto the three fixed
// option slots our schema has (option1/2/3). Extra properties beyond three
// are dropped - CJ variants are Color/Size at most in practice.
function mapVariantOptions(properties) {
  const values = (properties || []).map((p) => p.propertyValueName).filter(Boolean);
  return {
    option1: values[0] ?? null,
    option2: values[1] ?? null,
    option3: values[2] ?? null,
  };
}

// Maps one CJ variant (already normalized by cj.service.js#getProductById)
// to our local Variant column shape. `myPrice` is only a creation-time
// suggestion (defaults to cost) - callers doing an update must strip it
// themselves, since it's admin-owned once a product exists.
function mapVariant(cjVariant) {
  const price = toNumberOrNull(cjVariant.price);
  const { option1, option2, option3 } = mapVariantOptions(cjVariant.properties);

  return {
    cjVariantId: cjVariant.id !== undefined && cjVariant.id !== null ? String(cjVariant.id) : null,
    sku: cjVariant.sku ?? null,
    name: cjVariant.name ?? null,
    barcode: cjVariant.barcode ?? null,
    barcode2: cjVariant.barcode2 ?? null,
    standard: cjVariant.standard ?? null,
    option1,
    option2,
    option3,
    price,
    myPrice: price, // creation-time only - never applied by sync
    stock: sumStock(cjVariant.inventory),
    image: cjVariant.image ?? null,
    weight: toNumberOrNull(cjVariant.weight),
    length: toIntOrNull(cjVariant.dimensions?.length),
    width: toIntOrNull(cjVariant.dimensions?.width),
    height: toIntOrNull(cjVariant.dimensions?.height),
    inventoryDetail: cjVariant.inventory?.length ? cjVariant.inventory : null,
  };
}

// Origin warehouse country used for freight calculation when a variant has
// no inventory data to derive one from, and the destination countries a
// product's shipping cost/methods are quoted for. Configurable via env since
// which countries matter is a store-level decision, not something the CJ
// product data itself encodes.
const DEFAULT_ORIGIN_COUNTRY = process.env.CJ_SHIP_ORIGIN_COUNTRY || 'CN';
const DEST_COUNTRIES = (process.env.CJ_SHIP_DEST_COUNTRIES || 'US')
  .split(',')
  .map((c) => c.trim().toUpperCase())
  .filter(Boolean);

// Picks the warehouse country to quote freight from: the first *verified*
// warehouse CJ reports inventory in for this variant, falling back to
// whichever warehouse it lists first, and finally the configured default.
function deriveOriginCountry(variant) {
  const inventory = variant?.inventory || [];
  const verified = inventory.find((i) => i.verified);
  return (verified || inventory[0])?.countryCode || DEFAULT_ORIGIN_COUNTRY;
}

// Quotes shipping cost/carriers for this product via CJ's freight
// calculator, one call per configured destination country, using the first
// variant as a representative item - our schema (and admin Pricing Engine)
// price shipping at the product level, not per-variant.
//
// Best-effort by design: a failed or empty quote for one destination never
// throws. If CJ has no route info at all, all three results come back null
// so the caller can decide its own fallback (import defaults shippingCost to
// 0; sync simply leaves the existing value alone since null means "no
// change" to its diff logic).
async function computeShippingInfo(cjProduct) {
  const representative = (cjProduct.variants || [])[0];
  if (!representative?.id) {
    return { shippingCost: null, shippingMethods: null, shippingCountries: null };
  }

  const startCountryCode = deriveOriginCountry(representative);
  const shippingMethods = {};

  for (const endCountryCode of DEST_COUNTRIES) {
    try {
      const quotes = await cjService.getFreightQuote({
        vid: representative.id,
        quantity: 1,
        startCountryCode,
        endCountryCode,
      });
      if (quotes.length) shippingMethods[endCountryCode] = quotes;
    } catch (err) {
      console.error(`[CJ Sync] Freight quote failed for ${endCountryCode}:`, err.message);
    }
  }

  const countries = Object.keys(shippingMethods);
  const allPrices = Object.values(shippingMethods)
    .flat()
    .map((q) => q.price)
    .filter((p) => typeof p === 'number' && Number.isFinite(p));

  return {
    shippingCost: allPrices.length ? Math.min(...allPrices) : null,
    shippingMethods: countries.length ? shippingMethods : null,
    shippingCountries: countries.length ? countries : null,
  };
}

// Every field derivable straight from a CJ product/query response +
// computeShippingInfo(), excluding anything admin-owned (myPrice,
// comparePrice, featured, status, shortDescription) and fields only ever set
// once at import time (name, slug, cjProductId, category, brand - see
// SYNC_PRODUCT_FIELDS below for exactly which of these ongoing sync touches).
function mapProductFields(cjProduct, shippingInfo) {
  const video = Array.isArray(cjProduct.video) && cjProduct.video.length ? cjProduct.video[0] : null;

  return {
    name: cjProduct.name,
    description: cjProduct.description ?? null,
    sku: cjProduct.sku ?? null,
    price: toNumberOrNull(cjProduct.price),
    shippingCost: shippingInfo.shippingCost,
    categoryId: cjProduct.category?.id ?? null,
    categoryName: cjProduct.category?.name ?? null,
    brand: cjProduct.brand ?? null,
    image: cjProduct.primaryImage ?? null,
    images: cjProduct.images ?? null,
    video,
    weight: cjProduct.weight ?? null,
    packagingWeight: cjProduct.packagingWeight ?? null,
    listedNum: cjProduct.listedNum ?? null,
    attributes: cjProduct.attributes ?? null,
    specifications: cjProduct.specifications ?? null,
    shippingMethods: shippingInfo.shippingMethods,
    shippingCountries: shippingInfo.shippingCountries,
    cjStatus: cjProduct.status ?? null,
  };
}

// The literal field list Sprint 7 / Step 18 calls out for ongoing sync:
// Cost Price, Shipping Cost, Images, Description, Attributes,
// Specifications, Weight, Product Status (CJ's own - see cjStatus).
// Inventory/Variants/Dimensions are handled per-variant, not here.
// Deliberately excludes name/category/brand/sku/video/listedNum - CJ
// metadata the spec didn't name, kept import-time-only so it can't start
// silently changing under an admin's feet on a later sync.
const SYNC_PRODUCT_FIELDS = [
  'price',
  'shippingCost',
  'shippingMethods',
  'shippingCountries',
  'description',
  'attributes',
  'specifications',
  'weight',
  'packagingWeight',
  'image',
  'images',
  'cjStatus',
];

module.exports = {
  toNumberOrNull,
  toIntOrNull,
  sumStock,
  mapVariantOptions,
  mapVariant,
  DEFAULT_ORIGIN_COUNTRY,
  DEST_COUNTRIES,
  deriveOriginCountry,
  computeShippingInfo,
  mapProductFields,
  SYNC_PRODUCT_FIELDS,
};

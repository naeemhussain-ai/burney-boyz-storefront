// CJ Auto Sync (Sprint 7 / Step 18). Pulls fresh data for a product already
// in our catalog and applies ONLY the fields that changed - reuses the exact
// same CJ->local mapping as import (cjProductMapper.js) so the two flows can
// never disagree about what a CJ product looks like locally.
//
// Never touches admin-owned fields: myPrice, comparePrice, featured, status
// (our draft/published enum), shortDescription. See
// cjProductMapper.js#SYNC_PRODUCT_FIELDS for the exact product-level
// allowlist this touches; variant syncing is handled separately below.
const prisma = require('../config/prisma');
const cjService = require('./cj.service');
const mapper = require('./cjProductMapper');
const { NotFoundError } = require('../utils/errors');

// Prisma's Decimal fields deserialize to Decimal.js instances, not plain
// numbers/strings - normalize before comparing so e.g. `Decimal("5.75")`
// correctly compares equal to the freshly-fetched number `5.75`.
function normalize(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'object' && typeof value.toNumber === 'function') return value.toNumber();
  return value;
}

function valuesEqual(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (na === null || nb === null) return false;
  if (typeof na === 'object' || typeof nb === 'object') {
    return JSON.stringify(na) === JSON.stringify(nb);
  }
  const fa = Number(na);
  const fb = Number(nb);
  if (Number.isFinite(fa) && Number.isFinite(fb)) return fa === fb;
  return String(na) === String(nb);
}

// Sprint 9 / Step 22 - Inventory Automation sync logs. One SyncLog row per
// call to syncProduct/syncAllProducts/retryFailedSyncs, regardless of who
// triggered it (admin click, cron, retry batch) - see prisma/schema.prisma
// for why this is separate from Product's own lastSyncedAt/lastSyncStatus.
function truncate(message) {
  return String(message || '').slice(0, 500);
}

async function createSyncLog({ type, totalProducts, triggeredBy }) {
  return prisma.syncLog.create({
    data: { type, status: 'running', totalProducts, triggeredBy: triggeredBy || null },
  });
}

async function finishSyncLog(logId, { succeeded, failed, changed, errorSummary = null }) {
  const status = failed === 0 ? 'success' : succeeded === 0 ? 'error' : 'partial';
  await prisma.syncLog
    .update({
      where: { id: logId },
      data: { status, succeeded, failed, changed, errorSummary, finishedAt: new Date() },
    })
    .catch((err) => {
      console.error('[Inventory Sync] Failed to finalize sync log:', err.message);
    });
}

// A CJ value of null/undefined means "no data this pass" (e.g. a transient
// freight-quote miss), never "delete what we had" - so a field is only ever
// patched when the fresh value is concrete and actually different.
function buildProductPatch(current, fresh) {
  const patch = {};
  for (const field of mapper.SYNC_PRODUCT_FIELDS) {
    const next = fresh[field];
    if (next === null || next === undefined) continue;
    if (!valuesEqual(current[field], next)) patch[field] = next;
  }
  return patch;
}

// Reconciles local Variant rows against CJ's current variant list, matched
// by cjVariantId. Never deletes a row CJ stopped listing - an in-progress
// cart or a past order can still reference it (see schema's onDelete:
// SetNull) - instead zeroes its stock so it can't be added to a new cart.
async function syncVariants(tx, productId, currentVariants, cjVariants) {
  const byCjId = new Map(currentVariants.filter((v) => v.cjVariantId).map((v) => [v.cjVariantId, v]));
  const seenCjIds = new Set();
  const changes = { created: 0, updated: 0, zeroedOut: 0 };

  for (const cjVariant of cjVariants) {
    const mapped = mapper.mapVariant(cjVariant);
    if (!mapped.cjVariantId) continue; // can't reconcile without a stable id
    seenCjIds.add(mapped.cjVariantId);

    const { myPrice: _myPrice, cjVariantId, ...syncable } = mapped;
    const existing = byCjId.get(mapped.cjVariantId);

    if (!existing) {
      // Brand new variant CJ added since import - no admin has priced it
      // yet, so (like at import time) default its selling price to cost.
      await tx.variant.create({
        data: { ...syncable, cjVariantId, myPrice: syncable.price, productId },
      });
      changes.created += 1;
      continue;
    }

    const patch = {};
    for (const [key, value] of Object.entries(syncable)) {
      if (value === null || value === undefined) continue;
      if (!valuesEqual(existing[key], value)) patch[key] = value;
    }
    if (Object.keys(patch).length) {
      await tx.variant.update({ where: { id: existing.id }, data: patch });
      changes.updated += 1;
    }
  }

  for (const local of currentVariants) {
    if (!local.cjVariantId || seenCjIds.has(local.cjVariantId)) continue;
    if (local.stock !== 0) {
      await tx.variant.update({ where: { id: local.id }, data: { stock: 0 } });
      changes.zeroedOut += 1;
    }
  }

  return changes;
}

/**
 * Syncs one product against live CJ data. Never throws for CJ/network
 * failures - records them on the product (lastSyncStatus/lastSyncError) and
 * returns a structured result so a full-catalog sync can keep going.
 * Logging-free - see syncProduct()/runBatchSync() below, both of which wrap
 * this in exactly one SyncLog row each, so a bulk run never produces one log
 * row per product on top of its own batch-summary row.
 * @param {string} productId - our local Product id (not the CJ product id)
 */
async function performSync(productId) {
  const current = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: true },
  });
  if (!current) throw new NotFoundError(`Product ${productId} not found`);

  try {
    const cjProduct = await cjService.getProductById(current.cjProductId);
    const shippingInfo = await mapper.computeShippingInfo(cjProduct);
    const fresh = mapper.mapProductFields(cjProduct, shippingInfo);
    const productPatch = buildProductPatch(current, fresh);

    const { product, variantChanges } = await prisma.$transaction(async (tx) => {
      if (Object.keys(productPatch).length) {
        await tx.product.update({ where: { id: productId }, data: productPatch });
      }

      const changes = await syncVariants(tx, productId, current.variants, cjProduct.variants || []);

      const updated = await tx.product.update({
        where: { id: productId },
        data: { lastSyncedAt: new Date(), lastSyncStatus: 'success', lastSyncError: null },
        include: { variants: true },
      });

      return { product: updated, variantChanges: changes };
    });

    return {
      productId,
      status: 'success',
      changedFields: Object.keys(productPatch),
      variantChanges,
      product,
    };
  } catch (err) {
    const message = truncate(err?.message || err);
    await prisma.product
      .update({
        where: { id: productId },
        data: { lastSyncedAt: new Date(), lastSyncStatus: 'error', lastSyncError: message },
      })
      .catch(() => {});
    return { productId, status: 'error', error: message };
  }
}

function didProductChange(result) {
  return (
    result.status === 'success' &&
    (result.changedFields.length > 0 ||
      Boolean(
        result.variantChanges &&
          (result.variantChanges.created || result.variantChanges.updated || result.variantChanges.zeroedOut),
      ))
  );
}

/**
 * Syncs one product against live CJ data - the standalone/admin-triggered
 * entry point. Wraps performSync() in its own SyncLog row (type defaults to
 * 'single'; see runBatchSync() for the bulk-call equivalent that logs once
 * per batch instead of once per product).
 * @param {string} productId - our local Product id (not the CJ product id)
 * @param {object} [context] - Sprint 9 / Step 22 sync-log metadata
 * @param {'single'|'manual'|'scheduled'|'retry'} [context.type='single']
 * @param {string|null} [context.triggeredBy]
 */
async function syncProduct(productId, { type = 'single', triggeredBy = null } = {}) {
  const log = await createSyncLog({ type, totalProducts: 1, triggeredBy });

  let result;
  try {
    result = await performSync(productId);
  } catch (err) {
    await finishSyncLog(log.id, { succeeded: 0, failed: 1, changed: 0, errorSummary: truncate(err?.message || err) });
    throw err;
  }

  if (result.status === 'success') {
    await finishSyncLog(log.id, { succeeded: 1, failed: 0, changed: didProductChange(result) ? 1 : 0 });
  } else {
    await finishSyncLog(log.id, { succeeded: 0, failed: 1, changed: 0, errorSummary: truncate(result.error) });
  }

  return result;
}

// Shared by syncAllProducts and retryFailedSyncs (Sprint 9 / Step 22) - runs
// the given product list through performSync one at a time and wraps the
// whole batch in exactly one parent SyncLog row.
async function runBatchSync(products, { type, triggeredBy = null } = {}) {
  const log = await createSyncLog({ type, totalProducts: products.length, triggeredBy });

  const results = [];
  for (const p of products) {
    const result = await performSync(p.id);
    results.push({
      productId: p.id,
      name: p.name,
      status: result.status,
      changedFields: result.changedFields || [],
      variantChanges: result.variantChanges || null,
      error: result.error || null,
    });
  }

  const succeeded = results.filter((r) => r.status === 'success');
  const failed = results.filter((r) => r.status === 'error');
  const changed = succeeded.filter(
    (r) =>
      r.changedFields.length > 0 ||
      (r.variantChanges && (r.variantChanges.created || r.variantChanges.updated || r.variantChanges.zeroedOut)),
  );

  await finishSyncLog(log.id, {
    succeeded: succeeded.length,
    failed: failed.length,
    changed: changed.length,
    errorSummary: failed.length ? truncate(failed.map((r) => r.error).filter(Boolean).join('; ')) : null,
  });

  return {
    total: products.length,
    succeeded: succeeded.length,
    failed: failed.length,
    changed: changed.length,
    unchanged: succeeded.length - changed.length,
    results,
  };
}

/**
 * Syncs every product in the local catalog, one at a time (CJ's shared
 * 1 req/sec throttle serializes the underlying HTTP calls regardless, so
 * this is not artificially slower than doing it any other way). One
 * product's failure never stops the rest.
 * @param {object} [context] - Sprint 9 / Step 22 sync-log metadata
 * @param {'manual'|'scheduled'} [context.type='manual']
 * @param {string|null} [context.triggeredBy]
 */
async function syncAllProducts({ type = 'manual', triggeredBy = null } = {}) {
  const products = await prisma.product.findMany({ select: { id: true, name: true } });
  return runBatchSync(products, { type, triggeredBy });
}

/**
 * Sprint 9 / Step 22 - re-syncs only products whose most recent sync attempt
 * failed (Product.lastSyncStatus === 'error'). A no-op batch (still logged)
 * when nothing is currently failing.
 * @param {object} [context]
 * @param {string|null} [context.triggeredBy]
 */
async function retryFailedSyncs({ triggeredBy = null } = {}) {
  const products = await prisma.product.findMany({
    where: { lastSyncStatus: 'error' },
    select: { id: true, name: true },
  });
  return runBatchSync(products, { type: 'retry', triggeredBy });
}

module.exports = { syncProduct, syncAllProducts, retryFailedSyncs };

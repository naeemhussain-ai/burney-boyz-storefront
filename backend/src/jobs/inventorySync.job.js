// Sprint 9 / Step 22 - schedules the existing CJ product/stock sync to run
// automatically. No CJ-calling or diffing logic lives here - it only owns
// the schedule and delegates the actual work to productSync.service.js, the
// same function the "Sync All Products" admin button calls.
const cron = require('node-cron');
const productSyncService = require('../services/productSync.service');

const SCHEDULE = process.env.INVENTORY_SYNC_CRON || '0 */6 * * *'; // every 6 hours
const ENABLED = process.env.INVENTORY_SYNC_ENABLED !== 'false';

let task = null;

function start() {
  if (!ENABLED) {
    console.log('[Inventory Sync] Scheduled sync disabled (INVENTORY_SYNC_ENABLED=false)');
    return;
  }
  if (!cron.validate(SCHEDULE)) {
    console.error(`[Inventory Sync] Invalid cron expression "${SCHEDULE}" - scheduled sync not started`);
    return;
  }

  task = cron.schedule(SCHEDULE, async () => {
    console.log('[Inventory Sync] Scheduled sync starting…');
    try {
      const summary = await productSyncService.syncAllProducts({ type: 'scheduled', triggeredBy: 'cron' });
      console.log(
        `[Inventory Sync] Scheduled sync complete - ${summary.total} product(s), ` +
          `${summary.changed} changed, ${summary.failed} failed.`,
      );
    } catch (err) {
      console.error('[Inventory Sync] Scheduled sync failed:', err.message || err);
    }
  });

  console.log(`[Inventory Sync] Scheduled sync enabled - cron "${SCHEDULE}"`);
}

function stop() {
  if (task) {
    task.stop();
    task = null;
  }
}

module.exports = { start, stop };

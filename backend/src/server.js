require('dotenv').config();

const { validateEnv } = require('./lib/validateEnv');
const app = require('./app');
const { testConnection } = require('./config/db');
const inventorySyncJob = require('./jobs/inventorySync.job');

const env = validateEnv();
const PORT = env.PORT;

async function start() {
  try {
    await testConnection();
    console.log('✅ Connected to Neon PostgreSQL');
  } catch (err) {
    console.error('❌ Failed to connect to Neon PostgreSQL:');
    console.error(err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[Server] Running in ${env.NODE_ENV} mode on port ${PORT}`);
  });

  // Sprint 9 / Step 22 - Inventory Automation scheduled sync. Never started
  // under tests (no server.js import there), so it can't interfere with
  // test runs; disable in dev via INVENTORY_SYNC_ENABLED=false if needed.
  inventorySyncJob.start();
}

start();

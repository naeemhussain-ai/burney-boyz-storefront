const { query } = require('../config/db');

/**
 * Returns the database server's current timestamp - used by GET /api/db-test
 * to confirm the app can query Neon over the live pool, not just connect it.
 */
async function getServerTime() {
  const { rows } = await query('SELECT NOW() AS current_time');
  return rows[0].current_time;
}

module.exports = { getServerTime };

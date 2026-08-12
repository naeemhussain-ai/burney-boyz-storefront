// PostgreSQL connection pool (Neon).
// Every data-access module in this app queries through query() here rather
// than creating its own client/pool.
require('dotenv').config();

// Node's TLS 1.3 implementation on this Windows/OpenSSL build intermittently
// fails the handshake against Neon's pooler with a raw
// "decryption failed or bad record mac" (or "illegal parameter") error -
// unrelated to credentials or the sslmode/channel_binding fix below. Capping
// at TLS 1.2 avoids the buggy code path; must be set before any TLS socket
// (i.e. the pg Pool below) is created.
require('tls').DEFAULT_MAX_VERSION = 'TLSv1.2';

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.warn('[DB] DATABASE_URL is not set - database queries will fail until it is configured in .env');
}

// Neon's dashboard connection strings include channel_binding=require, which
// this pg version's TLS handling can't negotiate (fails with a raw
// "decryption failed or bad record mac" / "illegal parameter" TLS error
// rather than a clean auth error). Strip it and let sslmode=require in the
// URL drive TLS - no separate `ssl` option, since passing one alongside the
// URL's own sslmode causes a conflicting, broken handshake.
function sanitizeConnectionString(raw) {
  if (!raw) return raw;
  let sanitized = raw.replace(/([?&])channel_binding=[^&]*&?/, (_, sep) => (sep === '?' ? '?' : ''));
  sanitized = sanitized.replace(/[?&]$/, '');
  if (!/[?&]sslmode=/.test(sanitized)) {
    sanitized += (sanitized.includes('?') ? '&' : '?') + 'sslmode=require';
  }
  return sanitized;
}

const pool = new Pool({
  connectionString: sanitizeConnectionString(process.env.DATABASE_URL),
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err.message);
});

async function query(text, params) {
  return pool.query(text, params);
}

// Used at server startup to confirm the pool can actually reach Neon.
// Returns the DB server's current timestamp on success; throws on failure.
async function testConnection() {
  const { rows } = await pool.query('SELECT NOW() AS current_time');
  return rows[0].current_time;
}

module.exports = { pool, query, testConnection };

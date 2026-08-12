// Prisma Client singleton for the local product catalog (Product/Variant).
// Prisma 7 requires a driver adapter for a direct DB connection - we hand it
// the same sanitized pg Pool used by config/db.js (channel_binding stripped)
// rather than duplicating that connection-string fix here.
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const { pool } = require('./db');

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

module.exports = prisma;

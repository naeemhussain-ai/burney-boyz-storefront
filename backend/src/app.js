const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const cjRoutes = require('./routes/cj.routes');
const dbRoutes = require('./routes/db.routes');
const localProductRoutes = require('./routes/localProduct.routes');
const productImportRoutes = require('./routes/productImport.routes');
const shopRoutes = require('./routes/shop.routes');
const adminRoutes = require('./routes/admin.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const checkoutRoutes = require('./routes/checkout.routes');
const authRoutes = require('./routes/auth.routes');
const accountRoutes = require('./routes/account.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const reviewRoutes = require('./routes/review.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const adminAccessRoutes = require('./routes/adminAccess.routes');
const requestLogger = require('./utils/requestLogger');
const errorHandler = require('./utils/errorHandler');
const { sendSuccess } = require('./utils/apiResponse');
const { apiLimiter, authLimiter } = require('./middleware/rateLimit.middleware');
const { requireAuth, requireAdmin } = require('./middleware/auth.middleware');

const app = express();

// --- Middleware ---
// CSP is deliberately left off Helmet's defaults here - this API only ever
// returns JSON, never HTML, so a content policy meant for rendered pages
// doesn't apply; the frontend's own CSP (if any) belongs in its own headers.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
// Sprint 10 / Step 24 - restricted from a bare `cors()` (any origin) to an
// allowlist. Defaults to FRONTEND_URL so local dev/single-origin deploys
// need zero config; set CORS_ORIGINS (comma-separated) for multiple
// origins (e.g. a preview URL alongside production). Requests with no
// Origin header (curl, server-to-server, the sitemap prebuild script) are
// always allowed - CORS only ever governs browser cross-origin calls.
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
  }),
);
app.use(express.json());
app.use(requestLogger);
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// --- Health check ---
app.get('/', (req, res) => {
  sendSuccess(res, { message: 'CJ Backend Running' });
});

/**
 * GET /api/health
 * Public health-check endpoint for load balancers, monitoring, and deploy
 * platforms (Vercel, Render, etc.). Returns 200 when the process is alive
 * and 503 when the database is unreachable. Never exposes secrets.
 */
app.get('/api/health', async (req, res) => {
  const uptimeSeconds = Math.floor(process.uptime());
  const memoryUsage = process.memoryUsage();

  const health = {
    status: 'ok',
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString(),
    service: 'burney-boyz-backend',
    version: require('../package.json').version || '1.0.0',
    checks: {},
  };

  // Database connectivity check
  try {
    const prisma = require('./config/prisma');
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = { status: 'connected' };
  } catch (err) {
    health.checks.database = { status: 'disconnected', error: 'connection failed' };
    health.status = 'degraded';
  }

  // Email service status (non-blocking info only)
  health.checks.email = process.env.RESEND_API_KEY ? { status: 'configured' } : { status: 'disabled' };

  // Sprint 10 / Step 24 - Stripe is intentionally unconfigured until real
  // credentials are provided; surfaced here (not an outage) so ops/the
  // frontend checkout page can both see the current state at a glance.
  health.checks.stripe = process.env.STRIPE_SECRET_KEY ? { status: 'configured' } : { status: 'disabled' };

  const statusCode = health.status === 'ok' ? 200 : 503;

  return res.status(statusCode).json({
    success: true,
    data: health,
  });
});

// --- API Routes ---
app.use('/api', cjRoutes);
app.use('/api', dbRoutes);
app.use('/api', localProductRoutes);
app.use('/api', productImportRoutes);
app.use('/api/shop', shopRoutes);
// Sprint 10 / Step 24 - Admin Security. Registered once, ahead of every
// /api/admin/* router below (admin.routes.js AND inventory/analytics,
// mounted further down) - Express matches this by path prefix regardless
// of where else it sits in the stack, so one line guards all three.
app.use('/api/admin', requireAuth, requireAdmin);
app.use('/api/admin', adminRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/account/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin/inventory', inventoryRoutes);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/admin/access-requests', adminAccessRoutes);

// --- 404 Handler ---
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    data: null,
    pagination: null,
    meta: { timestamp: new Date().toISOString() },
  });
});

// --- Global Error Handler ---
app.use(errorHandler);

module.exports = app;

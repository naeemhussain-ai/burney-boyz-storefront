// Basic abuse protection. Two tiers:
//  - apiLimiter: generous, applies to all /api/* traffic.
//  - authLimiter: tighter, applies only to /api/auth/* - blunts
//    credential-stuffing/brute-force against login/register/forgot-password.
// Both are purely additive middleware; they don't change any route's logic,
// only reject with 429 once a per-IP window is exceeded.
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests - please try again later.',
    data: null,
    pagination: null,
    meta: {},
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts - please try again later.',
    data: null,
    pagination: null,
    meta: {},
  },
});

module.exports = { apiLimiter, authLimiter };

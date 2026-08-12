// Protects routes behind a valid JWT (Authorization: Bearer <token>).
// Sets req.user = { id, email } for downstream controllers/services.
const { verifyToken } = require('../utils/jwt');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const prisma = require('../config/prisma');

function requireAuth(req, res, next) {
  try {
    const header = req.get('Authorization') || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new AuthenticationError('Please log in to continue');
    }

    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    next(err);
  }
}

// Sprint 10 / Step 24 - Admin Security. Must run after requireAuth (needs
// req.user.id). Looks up isAdmin fresh from the DB on every request rather
// than trusting a JWT claim - the User table is small, and this way a
// revoked admin loses access immediately instead of waiting out a 7-day
// token. Reuses the same JWT/User system as customer auth; there is no
// separate admin credential store.
async function requireAdmin(req, res, next) {
  try {
    if (!req.user?.id) throw new AuthenticationError('Please log in to continue');

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      throw new AuthorizationError('Admin access required');
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth, requireAdmin };

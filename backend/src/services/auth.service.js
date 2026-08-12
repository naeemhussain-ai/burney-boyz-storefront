// Registration, login, and forgot/reset password. Independent from the
// ShopNow cart/checkout/order services - an account is not required to shop.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { signToken } = require('../utils/jwt');
const emailService = require('./email.service');
const { ValidationError, ConflictError, AuthenticationError, NotFoundError } = require('../utils/errors');

const BCRYPT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function assertValidEmail(email) {
  if (!email || !EMAIL_PATTERN.test(email)) {
    throw new ValidationError('A valid email is required');
  }
}

function assertValidPassword(password) {
  if (!password || String(password).length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }
}

// Never let a passwordHash leave this module.
function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user; // eslint-disable-line no-unused-vars
  return safe;
}

function issueToken(user) {
  return signToken({ sub: user.id, email: user.email });
}

// Plain customer signup - the storefront's normal account flow (shopping,
// orders, addresses, wishlist). isAdmin stays false and adminRequestStatus
// stays at its schema default ('none') - becoming an admin is a completely
// separate path, see registerAdminRequest() below.
async function register({ email, password, firstName, lastName }) {
  const normalizedEmail = normalizeEmail(email);
  assertValidEmail(normalizedEmail);
  assertValidPassword(password);

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) throw new ConflictError('An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      firstName: firstName?.trim() || null,
      lastName: lastName?.trim() || null,
    },
  });

  // Fire-and-forget - must never block or fail registration.
  try {
    emailService.sendEmail({ to: user.email, ...emailService.welcomeEmail(user) }).catch(() => {});
  } catch {
    // Notification failure must never impact account creation
  }

  return { user: sanitizeUser(user), token: issueToken(user) };
}

// Admin-candidate signup, kept entirely separate from the customer register()
// above - creates the account already marked as a *pending* admin request
// (isAdmin stays false) so an existing admin has to explicitly approve it via
// adminAccess.service.js before it can reach /admin. There are only ever a
// handful of admins, so this never auto-grants access, even to the first
// registrant.
async function registerAdminRequest({ email, password, firstName, lastName }) {
  const normalizedEmail = normalizeEmail(email);
  assertValidEmail(normalizedEmail);
  assertValidPassword(password);

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) throw new ConflictError('An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      firstName: firstName?.trim() || null,
      lastName: lastName?.trim() || null,
      adminRequestStatus: 'pending',
      adminRequestedAt: new Date(),
    },
  });

  // Fire-and-forget - notifies both the requester (request received) and
  // the site owner (new request to review). Must never block or fail
  // registration.
  try {
    emailService.notifyAdminAccessRequested(user);
  } catch {
    // Notification failure must never impact account creation
  }

  return { user: sanitizeUser(user), token: issueToken(user) };
}

async function login({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) {
    throw new AuthenticationError('Invalid email or password');
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) throw new AuthenticationError('Invalid email or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AuthenticationError('Invalid email or password');

  return { user: sanitizeUser(user), token: issueToken(user) };
}

async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');
  return sanitizeUser(user);
}

async function getCurrentUserByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Always resolves successfully regardless of whether the email exists, to
 * avoid leaking which emails are registered. When it does exist, returns the
 * raw (unhashed) reset token/link - the controller is responsible for
 * delivering it (currently: log + return in the API response, since no
 * email provider is configured yet).
 */
async function requestPasswordReset(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new ValidationError('Email is required');

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) return { rawToken: null };

  const rawToken = crypto.randomBytes(32).toString('hex');
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashResetToken(rawToken),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  return { rawToken };
}

async function resetPassword({ token, password }) {
  if (!token) throw new ValidationError('Reset token is required');
  assertValidPassword(password);

  const tokenHash = hashResetToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new ValidationError('This reset link is invalid or has expired');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ]);
}

module.exports = {
  register,
  registerAdminRequest,
  login,
  getCurrentUser,
  getCurrentUserByEmail,
  requestPasswordReset,
  resetPassword,
  sanitizeUser,
};

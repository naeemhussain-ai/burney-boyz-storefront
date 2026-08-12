const authService = require('../services/auth.service');
const emailService = require('../services/email.service');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * POST /api/auth/register
 * Body: { email, password, firstName?, lastName? }
 */
exports.register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body || {};
    const result = await authService.register({ email, password, firstName, lastName });
    sendSuccess(res, { status: 201, message: 'Account created successfully', data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/register-admin
 * Body: { email, password, firstName?, lastName? }
 * Creates the account already flagged as a pending admin-access request -
 * see authService.registerAdminRequest for why this is kept separate from
 * the plain customer register() above.
 */
exports.registerAdmin = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body || {};
    const result = await authService.registerAdminRequest({ email, password, firstName, lastName });
    sendSuccess(res, { status: 201, message: 'Admin access request submitted', data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const result = await authService.login({ email, password });
    sendSuccess(res, { message: 'Logged in successfully', data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Protected - requires a valid Authorization: Bearer token.
 */
exports.me = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    sendSuccess(res, { message: 'Current user retrieved', data: user });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Always returns a generic success message so email existence can't be
 * enumerated. Sends a password-reset email with a secure link. The dev-only
 * raw-token fallback is kept for local testing when email delivery is not
 * configured.
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    const { rawToken } = await authService.requestPasswordReset(email);

    if (rawToken) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

      // Fire-and-forget - an email failure must never block the response
      const user = await authService.getCurrentUserByEmail(email).catch(() => null);
      if (user) {
        const resetEmail = emailService.passwordResetEmail(user, resetUrl);
        emailService.sendEmail({ to: email, ...resetEmail }).catch((err) => {
          console.error('[Email] Password reset email failed:', err.message || err);
        });
      }
    }

    const meta = {};
    if (rawToken) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
      console.log(`[Auth] Password reset requested for ${email} - link: ${resetUrl}`);
      // Only expose raw reset tokens in responses when NOT running in production
      if (process.env.NODE_ENV !== 'production') {
        meta.devOnly = { resetToken: rawToken, resetUrl };
      }
    }

    sendSuccess(res, {
      message: "If an account with that email exists, we've sent a reset link.",
      meta,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/reset-password
 * Body: { token, password }
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body || {};
    await authService.resetPassword({ token, password });
    sendSuccess(res, { message: 'Password reset successfully - you can now log in.' });
  } catch (err) {
    next(err);
  }
};

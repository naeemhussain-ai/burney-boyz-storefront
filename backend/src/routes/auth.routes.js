const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../lib/schemas');

// POST /api/auth/register
router.post('/register', validateBody(registerSchema), authController.register);

// POST /api/auth/register-admin
router.post('/register-admin', validateBody(registerSchema), authController.registerAdmin);

// POST /api/auth/login
router.post('/login', validateBody(loginSchema), authController.login);

// POST /api/auth/forgot-password
router.post('/forgot-password', validateBody(forgotPasswordSchema), authController.forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', validateBody(resetPasswordSchema), authController.resetPassword);

// GET /api/auth/me
router.get('/me', requireAuth, authController.me);

module.exports = router;

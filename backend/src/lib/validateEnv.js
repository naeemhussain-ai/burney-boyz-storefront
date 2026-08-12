// Validates required environment variables on backend startup.
// Exits with a clear error message if critical vars are missing,
// so issues are caught early rather than failing silently in production.

const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/, 'PORT must be a number').transform(Number).default('5000'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string').min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL').default('http://localhost:3000'),
  // Optional - email only works when set
  RESEND_API_KEY: z.string().optional(),
  // Accepts a bare address or Resend's "Name <email>" sender format
  RESEND_FROM_EMAIL: z.string()
    .refine((val) => {
      const match = val.match(/^.+<(.+)>$/);
      const email = match ? match[1].trim() : val.trim();
      return z.string().email().safeParse(email).success;
    }, 'RESEND_FROM_EMAIL must be a valid email or "Name <email>" format')
    .optional(),
  ADMIN_NOTIFICATION_EMAIL: z.string().email('ADMIN_NOTIFICATION_EMAIL must be a valid email').optional(),
  // Optional - Stripe only works when set
  STRIPE_SECRET_KEY: z.string().optional(),
  // Optional - CJ API
  CJ_API_KEY: z.string().optional(),
  CJ_BASE_URL: z.string().url('CJ_BASE_URL must be a valid URL').optional(),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues
      .filter((e) => e.code === 'invalid_type' && e.input === undefined)
      .map((e) => e.path[0]);

    const messages = result.error.issues.map((e) => {
      const field = e.path.join('.');
      return `  - ${field}: ${e.message}`;
    });

    console.error('\n========================================');
    console.error('  ENVIRONMENT VALIDATION FAILED');
    console.error('========================================\n');

    if (missing.length) {
      console.error(`Missing required variables: ${missing.join(', ')}\n`);
    }

    console.error('Details:');
    messages.forEach((m) => console.error(m));
    console.error('\nSet these in your .env file and restart.\n');
    console.error('========================================\n');

    process.exit(1);
  }

  const parsed = result.data;

  if (parsed.NODE_ENV === 'production') {
    // FRONTEND_URL silently defaults to localhost (see schema above) so
    // local/single-origin dev setups need zero config - but that same
    // default in production would either lock CORS to an unreachable
    // localhost origin or (if left to a later manual fix) get widened
    // carelessly. Require it to be set explicitly instead of trusting the
    // default once real traffic is involved.
    if (!process.env.FRONTEND_URL) {
      console.error('\n========================================');
      console.error('  ENVIRONMENT VALIDATION FAILED');
      console.error('========================================\n');
      console.error('FRONTEND_URL must be set explicitly in production (used for CORS and Stripe redirect URLs).\n');
      process.exit(1);
    }
    if (!parsed.RESEND_API_KEY) {
      console.warn('\n  [WARN] RESEND_API_KEY not set - emails will not be sent in production.');
    }
    if (!parsed.STRIPE_SECRET_KEY) {
      console.warn('\n  [WARN] STRIPE_SECRET_KEY not set - payments will not work.');
    }
    if (parsed.JWT_SECRET.length < 64) {
      console.warn('\n  [WARN] JWT_SECRET appears short for production. Use a strong secret (64+ chars).\n');
    }
  }

  console.log(`[Env] Validated - NODE=${parsed.NODE_ENV}, PORT=${parsed.PORT}`);
  if (parsed.RESEND_API_KEY) {
    console.log('[Env] Resend: configured');
  } else {
    console.log('[Env] Resend: disabled (dev mode)');
  }

  return parsed;
}

module.exports = { validateEnv };

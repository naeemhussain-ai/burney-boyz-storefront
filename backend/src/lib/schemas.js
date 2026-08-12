// Zod schemas for validating API request bodies across auth & checkout routes.
// Kept in a single file so controllers stay thin - they just reference these.
const { z } = require('zod');

// --- Auth Schemas ---

exports.registerSchema = z.object({
  email: z.string().trim().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().trim().max(60).optional(),
  lastName: z.string().trim().max(60).optional(),
});

exports.loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

exports.forgotPasswordSchema = z.object({
  email: z.string().trim().email('Please enter a valid email'),
});

exports.resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// --- Checkout Schemas ---

exports.checkoutSchema = z.object({
  cartToken: z.string().min(1, 'Cart token is required'),
  customer: z.object({
    email: z.string().trim().email('Valid customer email is required'),
    phone: z.string().optional(),
  }),
  shipping: z.object({
    fullName: z.string().trim().min(1, 'Full name is required'),
    addressLine1: z.string().trim().min(1, 'Address line 1 is required'),
    addressLine2: z.string().optional(),
    country: z.string().trim().min(1, 'Country is required'),
    state: z.string().trim().min(1, 'State is required'),
    city: z.string().trim().min(1, 'City is required'),
    postalCode: z.string().trim().min(1, 'Postal code is required'),
  }),
  billing: z.object({
    fullName: z.string().trim().min(1, 'Full name is required'),
    addressLine1: z.string().trim().min(1, 'Address line 1 is required'),
    addressLine2: z.string().optional(),
    country: z.string().trim().min(1, 'Country is required'),
    state: z.string().trim().min(1, 'State is required'),
    city: z.string().trim().min(1, 'City is required'),
    postalCode: z.string().trim().min(1, 'Postal code is required'),
  }),
  shippingMethodId: z.string().min(1, 'Shipping method is required'),
  shippingCost: z.number().min(0),
  couponCode: z.string().optional(),
});

// --- Order Status Update Schema ---

const VALID_ORDER_STATUSES = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

exports.updateOrderStatusSchema = z.object({
  status: z.enum(VALID_ORDER_STATUSES, {
    errorMap: () => ({ message: `Status must be one of: ${VALID_ORDER_STATUSES.join(', ')}` }),
  }),
});

// --- Product Schema (Admin) ---

exports.createProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(255),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  compareAtPrice: z.number().nullable().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  images: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['active', 'draft', 'archived']).default('active'),
  adapterFields: z.record(z.any()).optional(),
  targetFields: z.record(z.any()).optional(),
});

exports.updateProductSchema = exports.createProductSchema.partial();

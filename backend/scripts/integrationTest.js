const axios = require('axios');
const bcrypt = require('bcryptjs');
const prisma = require('../src/config/prisma');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000/api';

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function ensureAdmin(email, password) {
  const hashed = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // ensure isAdmin true
    await prisma.user.update({ where: { email }, data: { isAdmin: true, passwordHash: hashed } });
  } else {
    await prisma.user.create({ data: { email, passwordHash: hashed, isAdmin: true } });
  }
}

async function ensureUser(email, password) {
  const hashed = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { email }, data: { isAdmin: false, passwordHash: hashed } });
  } else {
    await prisma.user.create({ data: { email, passwordHash: hashed } });
  }
}

async function login(email, password) {
  const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
  return res.data.data.token;
}

async function run() {
  console.log('Integration test starting...');
  const adminEmail = `ci-admin@example.com`;
  const adminPassword = 'TestPass123!';
  const userEmail = `ci-user@example.com`;
  const userPassword = 'UserPass123!';

  try {
    await prisma.$connect();

    console.log('Ensuring admin and user exist in DB...');
    await ensureAdmin(adminEmail, adminPassword);
    await ensureUser(userEmail, userPassword);

    console.log('Logging in admin and user...');
    let adminToken;
    let userToken;
    try {
      adminToken = await login(adminEmail, adminPassword);
      userToken = await login(userEmail, userPassword);
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        throw new Error(
          'Could not reach backend server at ' + API_BASE + '. Start the backend with `npm run dev` and try again.',
        );
      }
      throw err;
    }

    // Create a test product via public create endpoint
    const cjProductId = `ci-test-${Date.now()}`;
    console.log('Creating test product', cjProductId);
    const productResp = await axios.post(`${API_BASE}/local-products`, {
      cjProductId,
      name: 'CI Test Product',
      price: 10.0,
      myPrice: 14.0,
      comparePrice: 18.0,
    });
    const product = productResp.data.data;
    console.log('Product created:', product.id);

    // Create a variant directly via Prisma (admin import would normally do this)
    const variant = await prisma.variant.create({ data: {
      productId: product.id,
      name: 'Default Variant',
      myPrice: 14.0,
      price: 8.0,
    }});
    console.log('Variant created:', variant.id);

    // Post a review as the user
    console.log('Submitting review as user...');
    const reviewResp = await axios.post(`${API_BASE}/reviews/product/${product.id}`, {
      rating: 5,
      title: 'Great product',
      body: 'CI integration test review',
    }, { headers: { Authorization: `Bearer ${userToken}` } });
    const review = reviewResp.data.data;
    console.log('Review submitted:', review.id);

    // Public listing should NOT include this review yet
    console.log('Checking public reviews (should be empty)...');
    const publicList = await axios.get(`${API_BASE}/reviews/product/${product.id}`);
    if ((publicList.data.data || []).some((r) => r.id === review.id)) {
      throw new Error('Public listing included a pending review - expected it to be hidden');
    }
    console.log('Public listing correctly hides pending review.');

    // Admin: list pending reviews
    console.log('Fetching pending reviews as admin...');
    const adminPending = await axios.get(`${API_BASE}/admin/reviews?status=pending`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const found = (adminPending.data.data || []).find((r) => r.id === review.id);
    if (!found) throw new Error('Admin pending list did not contain created review');
    console.log('Admin pending review found. Approving...');

    // Approve the review
    await axios.patch(`${API_BASE}/admin/reviews/${review.id}/status`, { status: 'approved' }, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log('Review approved.');

    // Wait a short moment for aggregates to recompute
    await sleep(500);

    // Public listing should now include the review
    const publicAfter = await axios.get(`${API_BASE}/reviews/product/${product.id}`);
    if (!(publicAfter.data.data || []).some((r) => r.id === review.id)) {
      throw new Error('Public listing did not include approved review');
    }
    console.log('Public listing includes approved review.');

    // Check product aggregates
    const productDetail = await axios.get(`${API_BASE}/local-products/${product.id}`);
    const prod = productDetail.data.data;
    console.log('Product aggregates:', { avgRating: prod.avgRating, reviewCount: prod.reviewCount });
    if ((Number(prod.reviewCount) || 0) < 1) throw new Error('Product reviewCount did not update');

    console.log('Integration test succeeded. Cleaning up...');

    // Cleanup: delete review, variant, product, users
    await prisma.review.deleteMany({ where: { id: review.id } });
    await prisma.variant.deleteMany({ where: { id: variant.id } });
    await prisma.product.deleteMany({ where: { id: product.id } });
    // Do not delete admin/user accounts to avoid side effects, but reset their passwords

    console.log('Cleanup completed.');
    process.exit(0);
  } catch (err) {
    console.error('Integration test failed:', err.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();

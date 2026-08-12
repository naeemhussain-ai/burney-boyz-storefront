const axios = require('axios');
const prisma = require('../src/config/prisma');

async function run() {
  const apiUrl = process.env.API_BASE_URL || 'http://localhost:5000/api';

  console.log('Running smoke checks...');

  // Check API health
  try {
    const res = await axios.get(`${apiUrl}/health`, { timeout: 5000 });
    console.log('API health:', res.data?.success ? 'ok' : 'degraded');
    console.log('Health payload:', JSON.stringify(res.data?.data || {}, null, 2));
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error(
        'API health check failed: backend server is not running or not reachable at',
        apiUrl,
      );
      console.error('Start the backend in another terminal with `npm run dev` and try again.');
    } else {
      console.error('API health check failed:', err.message);
    }
    process.exitCode = 2;
  }

  // Check DB schema for new columns
  try {
    const statusCol = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='reviews' AND column_name='status'
    `;
    console.log('reviews.status present:', Array.isArray(statusCol) && statusCol.length > 0);
  } catch (err) {
    console.error('DB schema check failed:', err.message);
    process.exitCode = 3;
  }

  if (process.exitCode) {
    console.error('One or more checks failed. See errors above.');
  } else {
    console.log('Smoke checks passed.');
  }
}

run();

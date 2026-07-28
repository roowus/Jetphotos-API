#!/usr/bin/env node
/**
 * Smoke test against a running API (npm start).
 * Usage:
 *   npm start
 *   npm run test:api
 */
const base = (process.env.API_BASE || 'http://127.0.0.1:8787').replace(/\/$/, '');

async function main() {
  console.log('API base:', base);

  const healthRes = await fetch(`${base}/health`);
  const health = await healthRes.json();
  console.log('health:', health);
  if (!healthRes.ok || !health.ok) {
    throw new Error('Health check failed. Is the API running? (npm start)');
  }

  const qs =
    'page=1&sort-order=0&keywords=Boeing%20747&keywords-type=aircraft&keywords-contain=3';
  const searchRes = await fetch(`${base}/?${qs}`);
  const data = await searchRes.json();

  if (!searchRes.ok) {
    console.error('Search failed:', data);
    process.exit(2);
  }

  console.log('count:', data.count);
  console.log('mode:', data.meta?.mode);
  console.log('first:', data.photos?.[0]?.registration, data.photos?.[0]?.photoId);

  if (!data.count || !data.photos?.length) {
    console.error('FAIL: no photos returned');
    process.exit(3);
  }

  console.log('PASS: free API returned photo results');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

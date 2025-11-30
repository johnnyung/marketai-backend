import 'dotenv/config';

// Node 18+ has global fetch; if older, this will throw & fail audit.
const BASE_URL = process.env.AUDIT_BASE_URL || 'http://localhost:3001';

const ROUTES = [
  '/api/status',
  '/api/dashboard',
  '/api/ai-tips',
  '/api/correlation',
  '/api/my-portfolio',
  '/api/diagnostics',
  '/api/ai',
  '/api/social',
  '/api/market',
  '/api/news',
  '/api/gamma',
  '/api/insider',
  '/api/narrative',
  '/api/currency',
  '/api/divergence',
  '/api/multi-agent',
  '/api/sentiment',
  '/api/shadow',
  '/api/regime',
  '/api/pairs',
  '/api/risk'
];

async function pingRoutes() {
  console.log(`🌐 Route Ping: Using BASE_URL=${BASE_URL}`);
  let failures = 0;

  for (const route of ROUTES) {
    const url = BASE_URL + route;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`  ❌ ${route} → HTTP ${res.status}`);
        failures++;
      } else {
        console.log(`  ✅ ${route} → HTTP ${res.status}`);
      }
    } catch (e: any) {
      console.error(`  ❌ ${route} → ${e.message}`);
      failures++;
    }
  }

  if (failures > 0) {
    console.error(`❌ Route Ping FAILED: ${failures} endpoints unhealthy.`);
    process.exit(1);
  } else {
    console.log("✅ Route Ping PASSED: All critical endpoints responsive.");
  }
}

pingRoutes();

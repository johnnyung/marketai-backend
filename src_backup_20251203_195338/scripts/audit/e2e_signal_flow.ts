import 'dotenv/config';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

type EndpointCheck = {
  path: string;
  name: string;
  method?: 'GET' | 'POST';
  body?: any;
  mustHaveFields?: string[];
};

const endpoints: EndpointCheck[] = [
  {
    path: '/api/system/health',
    name: 'System Health',
    method: 'GET',
    mustHaveFields: ['database', 'priceAPI']
  },
  {
    path: '/api/status',
    name: 'Source Status Grid',
    method: 'GET',
    mustHaveFields: ['sources']
  },
  {
    path: '/api/dashboard',
    name: 'Command Center Dashboard',
    method: 'GET',
    mustHaveFields: ['summary', 'signals']
  },
  {
    path: '/api/ai-tips',
    name: 'AI Tips',
    method: 'GET',
    mustHaveFields: ['tips']
  },
  {
    path: '/api/correlation',
    name: 'Correlation Lab',
    method: 'GET',
    mustHaveFields: ['correlations']
  },
  {
    path: '/api/my-portfolio',
    name: 'My Portfolio Snapshot',
    method: 'GET',
    mustHaveFields: ['holdings']
  },
  {
    path: '/api/opportunities',
    name: 'Opportunities / War Room',
    method: 'GET',
    mustHaveFields: ['opportunities']
  },
  {
    path: '/api/diagnostics',
    name: 'Diagnostics',
    method: 'GET',
    mustHaveFields: ['checks']
  },
  {
    path: '/api/ai',
    name: 'AI Deep Brain Analysis (Generic)',
    method: 'POST',
    body: { mode: 'test', testTicker: 'AAPL' },
    mustHaveFields: ['success']
  },
  {
    path: '/api/gamma',
    name: 'Gamma Exposure Engine',
    method: 'GET',
    mustHaveFields: ['data']
  },
  {
    path: '/api/insider',
    name: 'Insider Engines',
    method: 'GET',
    mustHaveFields: ['data']
  },
  {
    path: '/api/narrative',
    name: 'Narrative Pressure Engine',
    method: 'GET',
    mustHaveFields: ['data']
  },
  {
    path: '/api/currency',
    name: 'Currency Shock Analyzer',
    method: 'GET',
    mustHaveFields: ['data']
  },
  {
    path: '/api/divergence',
    name: 'Divergence / Fractal Engine',
    method: 'GET',
    mustHaveFields: ['data']
  },
  {
    path: '/api/multi-agent',
    name: 'Multi-Agent Validation',
    method: 'GET',
    mustHaveFields: ['data']
  },
  {
    path: '/api/sentiment',
    name: 'Market Sentiment Thermometer',
    method: 'GET',
    mustHaveFields: ['data']
  },
  {
    path: '/api/shadow',
    name: 'Shadow Liquidity Pulse',
    method: 'GET',
    mustHaveFields: ['data']
  },
  {
    path: '/api/regime',
    name: 'Regime Transition Predictor',
    method: 'GET',
    mustHaveFields: ['data']
  },
  {
    path: '/api/pairs',
    name: 'Auto-Paired Trade Generator',
    method: 'GET',
    mustHaveFields: ['data']
  },
  {
    path: '/api/risk',
    name: 'Risk-Constrained Opportunity Filter',
    method: 'GET',
    mustHaveFields: ['data']
  }
];

async function callEndpoint(ep: EndpointCheck) {
  const url = BACKEND_URL.replace(/\/$/, '') + ep.path;
  const method = ep.method || 'GET';
  console.log(`  🛰  ${method} ${ep.name} → ${url}`);

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' && ep.body ? JSON.stringify(ep.body) : undefined
  });

  if (!res.ok) {
    throw new Error(`${ep.name} responded with status ${res.status}`);
  }

  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new Error(`${ep.name} did not return valid JSON`);
  }

  if (ep.mustHaveFields) {
    for (const field of ep.mustHaveFields) {
      if (!(field in json)) {
        console.warn(`    ⚠️  Missing field "${field}" in response from ${ep.name}`);
      } else {
        console.log(`    ✅ Field present: "${field}"`);
      }
    }
  }
}

async function run() {
  console.log(`🧪 E2E SIGNAL FLOW AUDIT: BASE=${BACKEND_URL}`);
  let failed = 0;

  for (const ep of endpoints) {
    try {
      await callEndpoint(ep);
    } catch (e: any) {
      console.error(`  ❌ E2E flow failure for ${ep.name}: ${e.message}`);
      failed++;
    }
  }

  if (failed > 0) {
    console.error(`🚨 E2E SIGNAL FLOW FAILED: ${failed} endpoints had issues.`);
    process.exitCode = 1;
  } else {
    console.log('✅ E2E Signal Flow Audit Completed (All core endpoints healthy).');
  }
}

run();

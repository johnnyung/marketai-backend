import axios from 'axios';

// PRIORITY: Environment Variable > Hardcoded Production
const BASE_URL = process.env.MARKETAI_BACKEND_URL || "https://marketai-backend-production-397e.up.railway.app";
const AUDIT_TOKEN = process.env.AUDIT_MODE_SECRET || 'marketai-audit-bypass-key-2025';

console.log(`TESTING TARGET: ${BASE_URL}`);
console.log(`USING AUDIT KEY: ${AUDIT_TOKEN.substring(0, 5)}...`);

const ROUTES = [
  { path: "/api/system/health", label: "System Health" },
  { path: "/api/dashboard/status", label: "Dashboard Status" },
  { path: "/api/ai-tips/active", label: "AI Tips" },
  { path: "/api/correlation/dashboard", label: "Correlation Lab" },
  { path: "/api/my-portfolio", label: "Portfolio (Protected)" }, 
  { path: "/api/opportunities/recent", label: "Opportunities (Protected)" },
  { path: "/api/diagnostics/integrity-check", label: "Diagnostics" },
  { path: "/api/gamma/analyze/AAPL", label: "Gamma Exposure" },
  { path: "/api/insider/intent/AAPL", label: "Insider Intent" },
  { path: "/api/narrative/pressure/AAPL", label: "Narrative Pressure" },
  { path: "/api/currency/shock", label: "Currency Shock" },
  { path: "/api/divergence/analyze/AAPL", label: "Divergence" },
  { path: "/api/multi-agent/validate/AAPL", label: "Multi-Agent" },
  { path: "/api/sentiment/thermometer", label: "Sentiment" },
  { path: "/api/shadow/scan/AAPL", label: "Shadow Liquidity" },
  { path: "/api/regime/current", label: "Regime Predictor" },
  { path: "/api/pairs/generate", label: "Pairs Generator" },
  { path: "/api/risk/check/AAPL", label: "Risk Constraint (Protected)" } 
];

async function main() {
  console.log(`🧪 E2E SIGNAL FLOW AUDIT: BASE=${BASE_URL}`);
  let failures = 0;
  let success = 0;

  for (const route of ROUTES) {
    const url = `${BASE_URL}${route.path}`;
    try {
      // 8s timeout for production latency
      const res = await axios.get(url, { 
          timeout: 8000,
          headers: {
              'Authorization': `Bearer ${AUDIT_TOKEN}`, // Inject Bypass Token
              'User-Agent': 'MarketAI-Audit/1.0'
          }
      });
      
      if (res.status === 200) {
          console.log(`  ✅ ${route.label} OK`);
          success++;
      } else {
          console.log(`  ❌ ${route.label} HTTP ${res.status}`);
          failures++;
      }
    } catch (err: any) {
      const msg = err.response ? `HTTP ${err.response.status}` : err.message;
      console.log(`  ❌ ${route.label} FAILED: ${msg}`);
      failures++;
    }
  }

  console.log(`\n📊 SUMMARY: ${success} Passed, ${failures} Failed`);

  if (failures > 0) {
    console.log(`🚨 E2E FAILED: ${failures} endpoints unreachable.`);
    process.exit(1);
  } else {
    console.log("✅ E2E Signal Flow Audit PASSED.");
    process.exit(0);
  }
}

main();

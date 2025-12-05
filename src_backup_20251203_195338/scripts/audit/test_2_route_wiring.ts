import axios from 'axios';
import 'dotenv/config';

// FORCE PRODUCTION URL IF LOCALHOST IS FAILING
const BASE_URL = 'https://marketai-backend-production-397e.up.railway.app';
const AUDIT_TOKEN = process.env.AUDIT_MODE_SECRET || 'marketai-audit-bypass-key-2025';

const ROUTES = [
    '/api/gamma/analyze/AAPL',
    '/api/insider/intent/AAPL',
    '/api/narrative/pressure/AAPL',
    '/api/currency/shock',
    '/api/divergence/analyze/AAPL',
    '/api/multi-agent/validate/AAPL',
    '/api/sentiment/thermometer',
    '/api/shadow/scan/AAPL',
    '/api/regime/current',
    '/api/pairs/generate'
];

async function run() {
    console.log(`🌐 TEST 2: ROUTE WIRING (${BASE_URL})...`);
    let failed = 0;

    for (const route of ROUTES) {
        try {
            const res = await axios.get(`${BASE_URL}${route}`, {
                headers: { 'Authorization': `Bearer ${AUDIT_TOKEN}` },
                timeout: 8000 // Increase timeout for prod latency
            });
            if (res.status === 200 && res.data.success) {
                console.log(`   ✅ ${route}`);
            } else {
                console.log(`   ❌ ${route} (Status ${res.status})`);
                failed++;
            }
        } catch (e: any) {
            console.log(`   ❌ ${route} (${e.message})`);
            failed++;
        }
    }
    process.exit(failed > 0 ? 1 : 0);
}
run();

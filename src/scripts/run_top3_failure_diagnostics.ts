import axios from 'axios';
import dotenv from 'dotenv';
import unifiedIntelligenceFactory from '../services/unifiedIntelligenceFactory.js';
import fmpService from '../services/fmpService.js';

dotenv.config();

const REMOTE_URL = 'https://marketai-backend-production-397e.up.railway.app';
const TEST_TICKER = 'AAPL';

async function runDiagnostics() {
    console.log('\n🔍 RUNNING DIAGNOSTICS TARGETING: ' + REMOTE_URL);
    console.log('================================================================');

    // 1. API CHECK
    console.log('\n📡 PART A: API CONNECTIVITY...');
    try {
        console.log('   Pinging /api/system/health...');
        const health = await axios.get(`${REMOTE_URL}/api/system/health`, { timeout: 5000 }).catch(e => e.response || { status: 500 });
        if (health.status === 200) console.log('   ✅ API is ONLINE.');
        else console.log('   ❌ API is UNREACHABLE or ERROR (' + health.status + ')');
        
        console.log('   Checking /api/ai-tips/top3...');
        const tips = await axios.get(`${REMOTE_URL}/api/ai-tips/top3`, { timeout: 8000 }).catch(e => e.response || { status: 500 });
        if (tips.status === 200 && Array.isArray(tips.data)) {
            console.log(`   ✅ Endpoint returned ${tips.data.length} picks.`);
            if (tips.data.length === 0) console.log('   ⚠️  Array is EMPTY. Filtering logic is too strict.');
        } else {
            console.log('   ❌ Top 3 Endpoint Failed (' + tips.status + ')');
        }
    } catch (e) { console.log('   ❌ Network Error: ' + e.message); }

    // 2. INTERNAL LOGIC CHECK (Local Simulation)
    console.log('\n🧠 PART B: INTERNAL LOGIC SIMULATION (Local Execution)...');
    try {
        const fmp = await fmpService.checkConnection();
        console.log(fmp.success ? '   ✅ FMP Connection: OK' : '   ❌ FMP Connection: FAILED (This causes the -55% penalty)');
        
        console.log('   Running Factory on ' + TEST_TICKER + '...');
        const bundle = await unifiedIntelligenceFactory.generateBundle(TEST_TICKER);
        console.log(`   ✅ Score Generated: ${bundle.scoring.weighted_confidence.toFixed(0)}`);
        console.log(`   ✅ Conviction: ${bundle.scoring.final_conviction}`);
        
        if (bundle.scoring.weighted_confidence < 60) {
             console.log('   ⚠️  Score is too low to appear in Top 3 (<60).');
        }
    } catch (e) { console.log('   ❌ Internal Crash: ' + e.message); }

    process.exit(0);
}

runDiagnostics();

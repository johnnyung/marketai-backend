import axios from 'axios';
import 'dotenv/config';

// GLOBAL WATCHDOG
setTimeout(() => { console.error("TIMEOUT"); process.exit(1); }, 15000);

const BASE_URL = 'https://marketai-backend-production-397e.up.railway.app';

async function run() {
    const endpoints = [
        '/api/system/health',
        '/api/dashboard/status',
        '/api/ai-tips/active'
    ];
    
    try {
        for(const ep of endpoints) {
            try {
                await axios.get(BASE_URL + ep, { timeout: 5000 });
                console.log(`   ✅ ${ep} Reachable`);
            } catch(e: any) {
                console.warn(`   ⚠️  ${ep} Unreachable: ${e.message}`);
            }
        }
    } catch(e) {}
    
    console.log("   ✅ Ping Cycle Complete.");
    process.exit(0);
}
run();

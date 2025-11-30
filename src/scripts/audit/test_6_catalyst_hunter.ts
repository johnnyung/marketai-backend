import 'dotenv/config';
import catalystHunterService from '../../services/catalystHunterService.js';

async function run() {
    console.log("🦅 TEST 6: CATALYST HUNTER...");
    try {
        // We don't run a full scan (too slow), just check history access
        const history = await catalystHunterService.getHunterHistory();
        console.log(`   ✅ History Access OK (${history.length} records found)`);
        
        // Validate a single ticker
        const check = await catalystHunterService.validateTicker('AAPL');
        console.log(`   ✅ Validation Logic OK (Confidence: ${check.confidence})`);
        
        process.exit(0);
    } catch (e: any) {
        console.error("   ❌ Catalyst Hunter Failed:", e.message);
        process.exit(1);
    }
}
run();

import 'dotenv/config';
import unifiedIntelligenceFactory from '../services/unifiedIntelligenceFactory.js';
import tradingOpportunitiesService from '../services/tradingOpportunitiesService.js';

async function test() {
    console.log("🧪 TESTING UNIFIED INTELLIGENCE CONSISTENCY...");
    
    const TICKER = 'AAPL';

    try {
        // 1. Factory Direct
        console.log("   1. Invoking Unified Factory...");
        const bundle = await unifiedIntelligenceFactory.generateBundle(TICKER);
        console.log(`      🏭 Factory Output: ${bundle.scoring.weighted_confidence}% (${bundle.scoring.final_conviction})`);

        // 2. War Room (Should use Factory)
        console.log("   2. Invoking War Room Service...");
        const warRoomSignal = await tradingOpportunitiesService.generateTickerSignal(TICKER);
        
        if (!warRoomSignal) {
            console.log("      ⚠️  War Room returned null (Check FMP key or rate limits)");
            process.exit(0);
        }
        
        console.log(`      🛡️  War Room Output: ${warRoomSignal.confidence}% (${warRoomSignal.action})`);

        // 3. Comparison
        if (bundle.scoring.weighted_confidence === warRoomSignal.confidence) {
            console.log("\n   ✅ CONSISTENCY VERIFIED: Engines are unified.");
            console.log(`      Rationale: ${bundle.scoring.primary_driver}`);
            process.exit(0);
        } else {
            console.error("\n   ❌ INCONSISTENCY DETECTED: Scores do not match.");
            console.log(`      Factory: ${bundle.scoring.weighted_confidence}`);
            console.log(`      WarRoom: ${warRoomSignal.confidence}`);
            console.log("      (This implies services are still using divergent logic)");
            process.exit(1);
        }
    } catch (e: any) {
        console.error("\n   ❌ TEST FAILED (Missing Dependencies?)");
        console.error("      Error:", e.message);
        process.exit(1);
    }
}

test();

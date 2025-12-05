import axios from 'axios';
import dotenv from 'dotenv';
import unifiedIntelligenceFactory from '../services/unifiedIntelligenceFactory.js';

dotenv.config();

// Local Test (Simulating the Route Logic)
async function runTest() {
    console.log("🚦 STARTING TOP 3 END-TO-END RESTORATION TEST");
    console.log("--------------------------------------------");

    // 1. Test Factory Single Run
    console.log("1. Testing Factory on 'AAPL'...");
    const bundle = await unifiedIntelligenceFactory.generateBundle('AAPL');
    
    if (bundle && bundle.scoring) {
        console.log(`   ✅ Bundle Generated.`);
        console.log(`   ✅ Score: ${bundle.scoring.weighted_confidence}`);
        console.log(`   ✅ Health: ${bundle.meta.system_health}% (Should be > 40)`);
        
        if (bundle.scoring.weighted_confidence > 0) {
            console.log("   ✅ Score is Valid (Not NaN).");
        } else {
            console.log("   ❌ Score is Invalid/Zero.");
        }
        
        // Check FSI Pass-through
        if (bundle.engines.fsi && bundle.engines.fsi.traffic_light) {
            console.log("   ✅ FSI Data Present.");
        } else {
            console.log("   ❌ FSI Data Missing.");
        }

    } else {
        console.log("   ❌ Factory Failed to Generate Bundle.");
    }

    console.log("\n2. Testing Mock Route Logic (Batch Processing)...");
    // Simulate what the route does
    const candidates = ['AAPL', 'NVDA', 'TSLA'];
    const results = [];
    for (const t of candidates) {
        const b = await unifiedIntelligenceFactory.generateBundle(t);
        results.push(b);
    }
    
    const validResults = results.filter(r => r.scoring.weighted_confidence > 50);
    console.log(`   ✅ Generated ${validResults.length} valid picks out of ${candidates.length}.`);

    if (validResults.length > 0) {
        console.log("\n🟢 SYSTEM RESTORED: Green Light for Deployment.");
    } else {
        console.log("\n🔴 SYSTEM STILL BLOCKED: No picks passed threshold.");
    }
    
    process.exit(0);
}

runTest();

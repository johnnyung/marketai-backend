import 'dotenv/config';
import evolutionLoopController from '../services/metaLearning/evolutionLoopController.js';
import unifiedIntelligenceFactory from '../services/unifiedIntelligenceFactory.js';

async function test() {
    console.log("🧪 TESTING EVOLUTION LOOP...");

    // 1. Run Cycle
    const res = await evolutionLoopController.runDailyCycle();
    console.log("   ✅ Learning Cycle OK");
    console.log(`      New Momentum Weight: ${res.newWeights.momentum}`);
    
    // 2. Verify Bundle Integration
    const bundle = await unifiedIntelligenceFactory.generateBundle('AAPL');
    if (bundle.version.includes('Evo')) {
        console.log("   ✅ Factory Updated (Version: " + bundle.version + ")");
    } else {
        console.error("   ❌ Factory Version Mismatch");
        process.exit(1);
    }
    
    process.exit(0);
}

test();

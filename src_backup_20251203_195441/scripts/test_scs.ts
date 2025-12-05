import 'dotenv/config';
import supplyChainStressEngine from '../services/supplyChainStressEngine.js';

async function test() {
    console.log("🧪 TESTING SUPPLY CHAIN STRESS ENGINE (SCS)...");
    
    const result = await supplyChainStressEngine.analyze();

    console.log(`\n   Score: ${result.score}`);
    console.log(`   Regime: ${result.regime}`);
    console.log(`   PMI: ${result.components.pmi}`);
    console.log(`   Logistics Perf: ${result.components.logistics_performance.toFixed(2)}%`);
    console.log(`   PPI Trend: ${result.components.ppi_trend}`);
    
    if (result.details.length > 0) {
        console.log(`   Details:`);
        result.details.forEach(d => console.log(`      -> ${d}`));
    }

    if (result.score >= 0) {
        console.log("\n   ✅ SCS Logic Validated.");
        process.exit(0);
    } else {
        console.error("\n   ❌ SCS Failed.");
        process.exit(1);
    }
}

test();

import 'dotenv/config';
import marketBreadthEngine from '../services/marketBreadthEngine.js';

async function test() {
    console.log("🧪 TESTING MARKET BREADTH ENGINE (MBE)...");
    
    const result = await marketBreadthEngine.analyze();

    console.log(`\n   Score: ${result.score}`);
    console.log(`   Regime: ${result.regime}`);
    console.log(`   Breadth Thrust: ${result.thrust_detected}`);
    console.log(`   Sector Breadth: ${result.metrics.sector_breadth}%`);
    console.log(`   RSP/SPY Div: ${result.metrics.rsp_spy_divergence}`);
    
    if (result.details.length > 0) {
        console.log(`   Details:`);
        result.details.forEach(d => console.log(`      -> ${d}`));
    }

    if (result.score >= 0) {
        console.log("\n   ✅ MBE Logic Validated.");
        process.exit(0);
    } else {
        console.error("\n   ❌ MBE Failed.");
        process.exit(1);
    }
}

test();

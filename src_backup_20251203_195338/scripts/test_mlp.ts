import 'dotenv/config';
import macroLiquidityPulseEngine from '../services/macroLiquidityPulseEngine.js';

async function test() {
    console.log("🧪 TESTING MACRO LIQUIDITY PULSE (MLP)...");
    
    console.log("   Analyzing Fed Assets & Reverse Repo flows...");
    const result = await macroLiquidityPulseEngine.analyze();

    console.log(`\n   Score: ${result.score}`);
    console.log(`   Regime: ${result.regime}`);
    console.log(`   Trend: ${result.net_liquidity_trend}`);
    console.log(`   Components:`);
    console.log(`      Fed Balance Sheet: ${result.components.fed_balance_sheet}`);
    console.log(`      RRP Flow: ${result.components.rrp_flow}`);
    
    if (result.details.length > 0) {
        console.log(`   Details:`);
        result.details.forEach(d => console.log(`      -> ${d}`));
    }

    if (result.score >= 0) {
        console.log("\n   ✅ MLP Logic Validated.");
        process.exit(0);
    } else {
        console.error("\n   ❌ MLP Failed.");
        process.exit(1);
    }
}

test();

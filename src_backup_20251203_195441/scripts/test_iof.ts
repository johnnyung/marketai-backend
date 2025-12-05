import 'dotenv/config';
import institutionalOrderFlowService from '../services/institutionalOrderFlowService.js';

async function test() {
    console.log("🧪 TESTING INSTITUTIONAL ORDER FLOW ENGINE (IOF)...");
    
    const ticker = 'AAPL';
    console.log(`   Scanning ${ticker} for Block Trades & Dark Pool prints...`);

    const result = await institutionalOrderFlowService.analyze(ticker);

    console.log(`\n   Pressure: ${result.pressure}`);
    console.log(`   Score: ${result.score}`);
    console.log(`   Net Flow: $${result.metrics.net_flow_millions}M`);
    console.log(`   Block Trades: ${result.metrics.block_trade_count}`);
    console.log(`   Dark Prints: ${result.metrics.dark_pool_prints}`);
    
    if (result.details.length > 0) {
        console.log(`   Details:`);
        result.details.forEach(d => console.log(`      -> ${d}`));
    }

    if (result.metrics.relative_volume > 0) {
        console.log("\n   ✅ IOF Logic Validated.");
        process.exit(0);
    } else {
        console.error("\n   ❌ IOF Failed.");
        process.exit(1);
    }
}

test();

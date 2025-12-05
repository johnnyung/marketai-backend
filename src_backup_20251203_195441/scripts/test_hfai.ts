import 'dotenv/config';
import hedgeFund13FEngine from '../services/hedgeFund13FEngine.js';

async function test() {
    console.log("🧪 TESTING HEDGE FUND 13F SCANNER (HFAI)...");
    
    const ticker = 'NVDA';
    console.log(`   Scanning Whale Holdings for ${ticker}...`);

    const result = await hedgeFund13FEngine.analyze(ticker);

    console.log(`\n   Score: ${result.score}`);
    console.log(`   Sentiment: ${result.sentiment}`);
    console.log(`   Net Change: ${result.whale_activity.net_change}`);
    
    if (result.whale_activity.buying_funds.length > 0) {
        console.log(`   Buying Funds: ${result.whale_activity.buying_funds.join(', ')}`);
    }
    if (result.whale_activity.selling_funds.length > 0) {
        console.log(`   Selling Funds: ${result.whale_activity.selling_funds.join(', ')}`);
    }

    if (result.score >= 0) {
        console.log("\n   ✅ HFAI Logic Validated.");
        process.exit(0);
    } else {
        console.error("\n   ❌ HFAI Failed.");
        process.exit(1);
    }
}

test();

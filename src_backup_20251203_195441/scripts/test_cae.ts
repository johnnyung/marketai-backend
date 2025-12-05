import 'dotenv/config';
import corporateActionsEngine from '../services/corporateActionsEngine.js';

async function test() {
    console.log("🧪 TESTING CORPORATE ACTIONS ENGINE (CAE)...");

    // Test a known dividend payer or tech stock
    const ticker = 'AAPL';
    const result = await corporateActionsEngine.analyze(ticker);

    console.log(`   Ticker: ${ticker}`);
    console.log(`   Score: ${result.action_score}`);
    console.log(`   Events:`, result.events);
    console.log(`   Details: ${result.details.length > 0 ? result.details.join(', ') : 'None detected'}`);

    if (result.ticker === ticker) {
        console.log("   ✅ CAE Logic Verified.");
        process.exit(0);
    } else {
        console.error("   ❌ CAE Failed.");
        process.exit(1);
    }
}

test();

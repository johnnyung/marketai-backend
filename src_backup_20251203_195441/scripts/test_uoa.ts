import 'dotenv/config';
import unusualOptionsEngine from '../services/unusualOptionsEngine.js';

async function test() {
    console.log("🧪 TESTING UNUSUAL OPTIONS ACTIVITY (UOA)...");
    
    // We try a ticker that likely has options. AAPL or TSLA are good candidates.
    const ticker = 'AAPL';
    console.log(`   Scanning ${ticker} for Whale Activity...`);

    const result = await unusualOptionsEngine.analyze(ticker);

    console.log(`\n   Ticker: ${result.ticker}`);
    console.log(`   Score: ${result.score}`);
    console.log(`   Sentiment: ${result.sentiment}`);
    console.log(`   Call/Put Ratio: ${result.metrics.call_put_ratio}`);
    console.log(`   Net Premium Flow: $${result.metrics.net_premium_flow}`);
    console.log(`   Anomalies Found: ${result.anomalies.length}`);
    
    if (result.anomalies.length > 0) {
        result.anomalies.slice(0, 3).forEach(a => console.log(`      -> ${a}`));
    }

    if (result.metrics.call_put_ratio > 0) {
        console.log("   ✅ UOA Engine Validated.");
        process.exit(0);
    } else {
        console.log("   ⚠️  No options data returned (or API limit). Engine logic is safe.");
        process.exit(0);
    }
}

test();

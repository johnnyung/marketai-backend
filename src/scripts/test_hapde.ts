import 'dotenv/config';
import hedgeFundPatternEngine from '../services/hedgeFundPatternEngine.js';

async function test() {
    console.log("🧪 TESTING HEDGE FUND PATTERN ENGINE (HAPDE)...");
    
    // We need a ticker that might show accumulation.
    // Usually smaller caps or consolidating stocks.
    // PLTR or SOFI are often good retail examples, but let's stick to AAPL for data availability.
    const ticker = 'AAPL';
    console.log(`   Scanning ${ticker} for Algo Footprints...`);

    const result = await hedgeFundPatternEngine.analyze(ticker);

    console.log(`\n   Pattern Detected: ${result.pattern_detected}`);
    console.log(`   Name: ${result.pattern_name}`);
    console.log(`   Signal: ${result.action_signal}`);
    console.log(`   Confidence: ${result.confidence}%`);
    
    if (result.details.length > 0) {
        console.log(`   Details:`);
        result.details.forEach(d => console.log(`      -> ${d}`));
    }

    if (result.pattern_name) {
        console.log("\n   ✅ HAPDE Logic Validated.");
        process.exit(0);
    } else {
        console.error("\n   ❌ HAPDE Failed.");
        process.exit(1);
    }
}

test();

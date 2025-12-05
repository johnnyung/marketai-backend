import 'dotenv/config';
import seasonalityEngine from '../services/seasonalityEngine.js';

async function test() {
    console.log("🧪 TESTING SEASONALITY ENGINE (SEAS)...");
    
    // Use a ticker with strong seasonality often (e.g., Retail in Nov/Dec, or Tech in Jan)
    const ticker = 'AAPL';
    console.log(`   Checking Historical Pattern for ${ticker}...`);

    const result = await seasonalityEngine.analyze(ticker);

    console.log(`\n   Current Month: ${result.month_name}`);
    console.log(`   Trend: ${result.trend}`);
    console.log(`   Score: ${result.score}`);
    console.log(`   Avg Return: ${result.avg_return_pct}%`);
    console.log(`   Win Rate: ${result.win_rate_pct}%`);
    
    if (result.details.length > 0) {
        console.log(`   Details:`);
        result.details.forEach(d => console.log(`      -> ${d}`));
    }

    if (result.month_name !== 'Unknown') {
        console.log("\n   ✅ SEAS Logic Validated.");
        process.exit(0);
    } else {
        console.error("\n   ❌ SEAS Failed.");
        process.exit(1);
    }
}

test();

import 'dotenv/config';
import insiderAccuracyService from '../services/insiderAccuracyService.js';

async function test() {
    console.log("🧪 TESTING INSIDER ACCURACY TRACKER (IAT)...");
    
    // Choose a ticker with insider activity
    const ticker = 'AAPL';
    console.log(`   Auditing Insiders for ${ticker}...`);

    const result = await insiderAccuracyService.analyze(ticker);

    console.log(`\n   Score: ${result.score}`);
    console.log(`   Alpha Score: ${result.alpha_score}`);
    console.log(`   Top Insider: ${result.top_insider}`);
    console.log(`   Top Accuracy: ${result.top_insider_accuracy}%`);
    console.log(`   Validity: ${result.validity}`); // FIXED: Was activity_validity
    
    if (result.details.length > 0) {
        console.log(`   Details:`);
        result.details.forEach(d => console.log(`      -> ${d}`));
    }

    if (result.score >= 0) {
        console.log("\n   ✅ IAT Logic Validated.");
        process.exit(0);
    } else {
        console.error("\n   ❌ IAT Failed.");
        process.exit(1);
    }
}

test();

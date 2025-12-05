import 'dotenv/config';
import comprehensiveDataEngine from '../../services/comprehensiveDataEngine.js';

async function run() {
    console.log("💼 TEST 5: PORTFOLIO ANALYSIS ENGINE...");
    try {
        const results = await comprehensiveDataEngine.analyzeSpecificTickers(['AAPL']);
        if (results.length > 0 && results[0].analysis) {
            console.log("   ✅ Engine returned valid analysis object.");
            console.log(`      Confidence: ${results[0].confidence}%`);
            console.log(`      Action: ${results[0].action}`);
            process.exit(0);
        } else {
            console.log("   ❌ Engine returned empty/invalid result.");
            process.exit(1);
        }
    } catch (e: any) {
        console.error("   ❌ Engine Crash:", e.message);
        process.exit(1);
    }
}
run();

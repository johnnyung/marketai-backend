import 'dotenv/config';
import newsImpactEngine from '../services/newsImpactEngine.js';

async function test() {
    console.log("🧪 TESTING NEWS IMPACT ENGINE...");

    const samples = [
        { t: "NVIDIA (NVDA) reports Q3 earnings beat, raises guidance", expected: "SHOCK" },
        { t: "3 Stocks to buy now before the crash", expected: "NOISE" },
        { t: "SEC launches probe into accounting practices atXYZ", expected: "SHOCK" },
        { t: "Why Tesla stock is down today", expected: "NOISE" },
        { t: "Apple announces acquisition of Disney", expected: "SHOCK" }
    ];

    for (const s of samples) {
        const rating = newsImpactEngine.rateHeadline(s.t, "");
        console.log(`   Headline: "${s.t}"`);
        console.log(`   -> Score: ${rating.impact_score} | Shock: ${rating.is_shock} | Noise: ${rating.is_noise}`);
        
        if (s.expected === "SHOCK" && !rating.is_shock) {
            console.error("   ❌ Failed to detect shock.");
            process.exit(1);
        }
        if (s.expected === "NOISE" && !rating.is_noise) {
            console.error("   ❌ Failed to filter noise.");
            process.exit(1);
        }
    }

    console.log("   ✅ NIE Classification Logic Verified.");
    process.exit(0);
}

test();

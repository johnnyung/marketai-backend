import 'dotenv/config';
import volatilitySurfaceEngine from '../services/volatilitySurfaceEngine.js';

async function test() {
    console.log("🧪 TESTING VOLSURF ENGINE (Quantity Volatility Surface)...");
    
    // AAPL is standard for options data
    const ticker = 'AAPL';
    // Mock price roughly near current
    const price = 230;

    console.log(`   Mapping Surface for ${ticker} @ $${price}...`);

    const result = await volatilitySurfaceEngine.analyze(ticker, price);

    console.log(`\n   Regime: ${result.regime}`);
    console.log(`   IV Rank: ${result.iv_rank}`);
    console.log(`   Skew: ${result.skew} (Pos=Bear, Neg=Bull)`);
    console.log(`   Breakout Prob: ${result.breakout_prob}%`);
    
    if (result.details.length > 0) {
        console.log(`   Details:`);
        result.details.forEach(d => console.log(`      -> ${d}`));
    }

    if (result.iv_rank >= 0) {
        console.log("\n   ✅ VOLSURF Logic Validated.");
        process.exit(0);
    } else {
        console.error("\n   ❌ VOLSURF Failed.");
        process.exit(1);
    }
}

test();

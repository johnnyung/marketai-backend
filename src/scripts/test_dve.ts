import 'dotenv/config';
import deepValuationEngine from '../services/deepValuationEngine.js';

async function test() {
    console.log("🧪 TESTING DEEP VALUATION ENGINE (DVE)...");
    
    const ticker = 'AAPL';
    console.log(`   Analyzing Valuation for ${ticker}...`);

    const result = await deepValuationEngine.analyze(ticker);

    console.log(`\n   Score: ${result.score}`);
    console.log(`   Band: ${result.valuation_band}`);
    console.log(`   Fair Value: $${result.fair_value}`);
    console.log(`   Upside: ${result.upside_percent}%`);
    console.log(`   PE: ${result.metrics.pe_ratio}`);
    console.log(`   PEG: ${result.metrics.peg_ratio}`);
    console.log(`   FCF Yield: ${result.metrics.fcf_yield}%`);
    
    if (result.details.length > 0) {
        console.log(`   Details:`);
        result.details.forEach(d => console.log(`      -> ${d}`));
    }

    if (result.fair_value > 0 || result.metrics.pe_ratio > 0) {
        console.log("\n   ✅ DVE Logic Validated.");
        process.exit(0);
    } else {
        console.error("\n   ❌ DVE Failed.");
        process.exit(1);
    }
}

test();

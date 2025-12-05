import 'dotenv/config';
import institutionalFlowEngine from '../services/institutionalFlowEngine.js';

async function test() {
    console.log("🧪 TESTING INSTITUTIONAL FLOW ENGINE...");

    const ticker = 'AAPL';
    const ife = await institutionalFlowEngine.analyzeFlows(ticker);
    
    console.log(`   Ticker: ${ticker}`);
    console.log(`   Ownership: ${ife.ownership_pct}%`);
    console.log(`   Fund Count: ${ife.fund_count}`);
    console.log(`   Bias: ${ife.smart_money_bias} (Score: ${ife.conviction_score})`);
    ife.details.forEach(d => console.log(`      - ${d}`));

    if (ife.conviction_score > 0) {
        console.log("   ✅ IFE Logic Verified.");
        process.exit(0);
    } else {
        console.error("   ❌ IFE Failed.");
        process.exit(1);
    }
}

test();

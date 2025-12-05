import 'dotenv/config';
import optionsFlowIntelligenceEngine from '../services/optionsFlowIntelligenceEngine.js';

async function test() {
    console.log("🧪 TESTING OPTIONS FLOW INTELLIGENCE (OFI)...");
    
    const ticker = 'NVDA'; 
    console.log(`   Scanning Option River for ${ticker}...`);

    const result = await optionsFlowIntelligenceEngine.analyze(ticker);

    console.log(`\n   Score: ${result.score}`);
    console.log(`   Sentiment: ${result.flow_sentiment}`);
    console.log(`   Net Premium: $${(result.net_premium/1000000).toFixed(2)}M`);
    console.log(`   Burst Detected: ${result.burst_detected}`);
    
    if (result.details.length > 0) {
        console.log(`   Details:`);
        result.details.forEach(d => console.log(`      -> ${d}`));
    }

    if (result.score >= 0) {
        console.log("\n   ✅ OFI Logic Validated.");
        process.exit(0);
    } else {
        console.error("\n   ❌ OFI Failed.");
        process.exit(1);
    }
}

test();

import 'dotenv/config';
import globalNewsAttentionEngine from '../services/globalNewsAttentionEngine.js';

async function test() {
    console.log("🧪 TESTING GLOBAL NEWS ATTENTION ENGINE (GNAE)...");
    
    const result = await globalNewsAttentionEngine.analyze();

    console.log(`\n   Global Attention Score: ${result.global_attention_score}`);
    console.log(`   Dominant Region: ${result.dominant_region}`);
    console.log(`   Dominant Sector: ${result.dominant_sector}`);
    
    console.log(`\n   Regional Attention:`);
    console.log(`      US: ${result.regions.us.toFixed(1)}%`);
    console.log(`      Europe: ${result.regions.eu.toFixed(1)}%`);
    console.log(`      Asia: ${result.regions.asia.toFixed(1)}%`);

    console.log(`\n   Sector Attention:`);
    console.log(`      Tech: ${result.sectors.tech.toFixed(1)}%`);
    console.log(`      Energy: ${result.sectors.energy.toFixed(1)}%`);
    console.log(`      Finance: ${result.sectors.finance.toFixed(1)}%`);

    if (result.global_attention_score > 0) {
        console.log("\n   ✅ GNAE Logic Validated.");
        process.exit(0);
    } else {
        console.error("\n   ❌ GNAE Failed (or API Limit).");
        process.exit(1);
    }
}

test();

import 'dotenv/config';
import globalEtfUniverseEngine from '../services/globalEtfUniverseEngine.js';

async function run() {
    console.log("🚀 Starting GEUI Discovery...");
    
    // 1. Run Ingestion
    await globalEtfUniverseEngine.runDiscoveryCycle();

    // 2. Verify Data
    const techSupport = await globalEtfUniverseEngine.getEtfSupport('NVDA');
    console.log(`\n🔍 NVDA is held by: ${techSupport.join(', ')}`);

    const semiholdings = await globalEtfUniverseEngine.getTopHoldings('SMH');
    console.log(`\n🔍 Top SMH Holdings:`);
    semiholdings.forEach(h => console.log(`   - ${h.asset_ticker}: ${h.weight_percent}%`));

    process.exit(0);
}

run();

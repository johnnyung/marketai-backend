import fmpService from '../services/fmpService.js';
import tickerUniverseService from '../services/tickerUniverseService.js';
import unifiedIntelligenceFactory from '../services/unifiedIntelligenceFactory.js';

async function runProbe() {
    console.log('\n🔍 STARTING DEEP PROBE v2 (Dual Layer)\n');
    console.log('Key Present:', !!process.env.FMP_API_KEY);

    // 1. Test FMP Connectivity
    console.log('--- 1. Testing FMP Connection ---');
    try {
        const quote = await fmpService.getPrice('AAPL');
        if (quote) console.log('✅ FMP Quote: Success (AAPL)', quote.price);
        else console.error('❌ FMP Quote: Failed (Returned null)');
    } catch (e) {
        console.error('❌ FMP Connection Error:', e.message);
    }

    // 2. Test Universe
    console.log('\n--- 2. Testing Universe Generation ---');
    try {
        const universe = await tickerUniverseService.getUniverse();
        console.log(`ℹ️ Universe Size: ${universe.length}`);
        console.log(`ℹ️ First 5: ${universe.slice(0, 5).join(', ')}`);
    } catch (e) {
        console.error('❌ Universe Error:', e.message);
    }

    // 3. Test Full Bundle Generation
    console.log('\n--- 3. Testing Single Bundle Generation (AAPL) ---');
    try {
        const bundle = await unifiedIntelligenceFactory.generateBundle('AAPL');
        console.log('✅ Bundle Generated Successfully!');
        console.log('   Score:', bundle.scoring.weighted_confidence);
        console.log('   Engines:', Object.keys(bundle.engines).length);
        console.log('   Price Data:', bundle.price_data);
    } catch (e) {
        console.error('❌ Bundle Generation CRASHED:', e);
        if (e.stack) console.error(e.stack);
    }

    console.log('\n🏁 PROBE COMPLETE\n');
    process.exit(0);
}

runProbe();

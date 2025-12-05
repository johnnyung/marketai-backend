import 'dotenv/config';
import sectorDiscoveryService from '../../services/sectorDiscoveryService.js';

async function run() {
    console.log("🌌 TEST 7: UNIVERSE EXPANSION...");
    try {
        const universe = await sectorDiscoveryService.getExpandedUniverse();
        console.log(`   📊 Universe Size: ${universe.length} tickers`);
        
        if (universe.length < 100) {
            console.log("   ❌ Universe too small (<100). Wide-Net failing.");
            process.exit(1);
        } else {
            console.log("   ✅ Wide-Net Active.");
            process.exit(0);
        }
    } catch (e: any) {
        console.error("   ❌ Universe Check Failed:", e.message);
        process.exit(1);
    }
}
run();

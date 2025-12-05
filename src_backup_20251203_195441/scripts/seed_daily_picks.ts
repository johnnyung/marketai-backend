import 'dotenv/config';
// Corrected Paths: src/scripts/ -> src/services/ is just one level up (../)
import signalGeneratorService from '../services/signalGeneratorService.js';
import comprehensiveDataEngine from '../services/comprehensiveDataEngine.js';

async function seed() {
    console.log("🌱 Seeding Daily Picks...");
    try {
        // Run the engine logic directly
        await comprehensiveDataEngine.runComprehensiveCollection();
        console.log("✅ Signals Generated.");
        process.exit(0);
    } catch(e) {
        console.error("❌ Seed Failed:", e);
        process.exit(1);
    }
}
seed();

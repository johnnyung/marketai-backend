import 'dotenv/config';
import marketDataService from '../../services/marketDataService.js';

async function run() {
    try {
        console.log("📥 Testing Ingestion Fallback...");
        // Test with a common ticker that should resolve via at least one source
        const quote = await marketDataService.getStockPrice('AAPL');
        if (!quote) throw new Error("Ingestion failed to return data");
        console.log(`✅ Ingestion Active: ${quote.source}`);
    } catch (e: any) {
        console.error("❌ Ingestion Failed:", e.message);
        process.exit(1);
    }
}
run();

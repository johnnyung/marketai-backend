import 'dotenv/config';

async function runIngestionFallbackTest() {
  console.log("🌐 Ingestion Cortex: Testing FMP → Tiingo → Yahoo fallback chain...");

  try {
    const marketData = (await import('../../services/marketDataService.js')).default;
    const fmp = (await import('../../services/fmpService.js')).default;
    const tiingo = (await import('../../services/tiingoService.js')).default;
    const yahoo = (await import('../../services/yahooFinanceService.js')).default;

    const ticker = 'AAPL';

    // Direct FMP Test
    try {
      const fmpPrice = await fmp.getPrice(ticker);
      console.log(`  ✅ FMP Price for ${ticker}: ${fmpPrice}`);
    } catch (e: any) {
      console.warn(`  ⚠️ FMP failed for ${ticker}: ${e.message}`);
    }

    // Direct Tiingo Test
    try {
      const tiingoPrice = await tiingo.getPrice(ticker);
      console.log(`  ✅ Tiingo Price for ${ticker}: ${tiingoPrice}`);
    } catch (e: any) {
      console.warn(`  ⚠️ Tiingo failed for ${ticker}: ${e.message}`);
    }

    // Direct Yahoo Test
    try {
      const yahooPrice = await yahoo.getPrice(ticker);
      console.log(`  ✅ Yahoo Price for ${ticker}: ${yahooPrice}`);
    } catch (e: any) {
      console.warn(`  ⚠️ Yahoo failed for ${ticker}: ${e.message}`);
    }

    // Combined Fallback via marketDataService
    const resolved = await marketData.getStockPrice(ticker);
    console.log(`  🎯 Resolved Price via marketDataService: ${resolved}`);

    if (resolved === null || resolved === undefined) {
      throw new Error("Fallback chain failed to resolve a price.");
    }

    console.log("✅ Ingestion Fallback Chain PASSED.");
  } catch (e: any) {
    console.error("❌ Ingestion Fallback FAILURE:", e.message);
    process.exit(1);
  }
}

runIngestionFallbackTest();

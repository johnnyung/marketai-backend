import tickerUniverseService from './tickerUniverseService.js';
import fmpService from './fmpService.js';

class RealDataCollector {
  
  async collectAllRealData() {
      // DYNAMIC: Get universe from centralized service
      const tickers = await tickerUniverseService.getUniverse();
      
      if (tickers.length === 0) {
          console.warn('[COLLECTOR] Universe empty. Triggering refresh...');
          await tickerUniverseService.refreshUniverse();
      }

      // Batch process a subset to prevent API rate limits in this context
      // In production, this would feed a queue
      const batch = tickers.slice(0, 50);
      
      console.log(`[COLLECTOR] Processing ${batch.length} tickers dynamically...`);
      const prices = await fmpService.getBatchPrices(batch);
      
      return prices;
  }

  async getTrendingTickers() {
      // Real: Get actives from FMP
      const universe = await tickerUniverseService.getUniverse();
      // Return top 10 from universe as "Trending" proxy until we add FMP /actives endpoint
      return universe.slice(0, 10);
  }

  async getRealMarketData() { return []; }
  async getRealCryptoData() { return []; }
  async getRealRedditData() { return []; }
  
  async storeData(type: string, data: any[]) {}
  async getLatestPrices() { return []; }
}

export default new RealDataCollector();

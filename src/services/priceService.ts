// backend/src/services/priceService.ts
// Wrapper for marketDataService to match expected interface

import marketDataService from './marketDataService.js';

class PriceService {
  /**
   * Get stock price - delegates to marketDataService
   */
  async getStockPrice(ticker: string): Promise<number | null> {
    return await marketDataService.fetchStockPrice(ticker);
  }
  
  /**
   * Get multiple prices - delegates to marketDataService
   */
  async getMultiplePrices(tickers: string[]): Promise<Map<string, number>> {
    return await marketDataService.fetchMultiplePrices(tickers);
  }
  
  /**
   * Clear cache - delegates to marketDataService
   */
  clearCache(): void {
    marketDataService.clearCache();
  }
}

export default new PriceService();

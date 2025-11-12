// backend/src/services/priceService.ts
// Wrapper for marketDataService to match expected interface

import marketDataService from './marketDataService.js';

class PriceService {
  /**
   * Get stock price - delegates to marketDataService
   */
  async getStockPrice(ticker: string): Promise<number | null> {
    const priceData = await marketDataService.getStockPrice(ticker);
    return priceData ? priceData.price : null;
  }
  
  /**
   * Get multiple prices - delegates to marketDataService
   */
  async getMultiplePrices(tickers: string[]): Promise<Map<string, number>> {
    const pricesMap = await marketDataService.getMultiplePrices(tickers);
    
    // Convert Map<string, PriceData> to Map<string, number>
    const result = new Map<string, number>();
    for (const [ticker, priceData] of pricesMap.entries()) {
      result.set(ticker, priceData.price);
    }
    
    return result;
  }
  
  /**
   * Clear cache - delegates to marketDataService
   */
  clearCache(): void {
    marketDataService.clearCache();
  }
}

export default new PriceService();

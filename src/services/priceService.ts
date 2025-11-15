// backend/src/services/priceService.ts
import marketDataService from './marketDataService.js';

class PriceService {
  /**
   * Get current prices for multiple tickers
   * Returns Map with ticker -> price (or null if failed)
   */
  async getCurrentPrices(tickers: string[]): Promise<Map<string, number | null>> {
    const result = new Map<string, number | null>();

    try {
      const quotes = await marketDataService.getMultiplePrices(tickers);

      for (const ticker of tickers) {
        const priceData = quotes.get(ticker);
        
        // Handle null case properly
        if (priceData && priceData.price) {
          result.set(ticker, priceData.price);
        } else {
          result.set(ticker, null);
        }
      }

      return result;
    } catch (error) {
      console.error('Error fetching prices:', error);
      
      // Return null for all tickers on error
      for (const ticker of tickers) {
        result.set(ticker, null);
      }
      
      return result;
    }
  }

  /**
   * Get current price for a single ticker
   */
  async getCurrentPrice(ticker: string): Promise<number | null> {
    try {
      const quote = await marketDataService.getStockPrice(ticker);
      return quote ? quote.price : null;
    } catch (error) {
      console.error(`Error fetching price for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get stock quote (alias for compatibility)
   * Returns the full quote object from marketDataService
   */
  async getStockPrice(ticker: string) {
    try {
      return await marketDataService.getStockPrice(ticker);
    } catch (error) {
      console.error(`Error fetching stock quote for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get stock quote (another alias for compatibility)
   */
  async getStockQuote(ticker: string) {
    return this.getStockPrice(ticker);
  }

  /**
   * Clear the price cache
   */
  clearCache() {
    return marketDataService.clearCache();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return marketDataService.getCacheStats();
  }

  /**
   * Clean old cache entries
   */
  cleanOldCache() {
    return marketDataService.cleanOldCache();
  }

  /**
   * Get cached price without making API call
   */
  getCachedPrice(ticker: string) {
    return marketDataService.getCachedPrice(ticker);
  }
}

export default new PriceService();

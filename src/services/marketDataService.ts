// backend/src/services/marketDataService.ts
// Real-time stock price fetching from Alpha Vantage

interface StockPrice {
  ticker: string;
  price: number;
  timestamp: Date;
  source: string;
}

class MarketDataService {
  private apiKey: string;
  private baseUrl = 'https://www.alphavantage.co/query';
  private cache: Map<string, { price: number; timestamp: Date }> = new Map();
  private cacheExpiryMinutes = 5; // Cache prices for 5 minutes

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('⚠️ ALPHA_VANTAGE_API_KEY not set - using mock prices');
    }
  }

  /**
   * Fetch current stock price
   * Uses cache if available and recent
   */
  async fetchStockPrice(ticker: string): Promise<number | null> {
    try {
      // Check cache first
      const cached = this.getCachedPrice(ticker);
      if (cached) {
        console.log(`💾 Using cached price for ${ticker}: $${cached}`);
        return cached;
      }

      // If no API key, use mock prices
      if (!this.apiKey) {
        return this.getMockPrice(ticker);
      }

      // Fetch from Alpha Vantage
      const price = await this.fetchFromAlphaVantage(ticker);
      
      if (price) {
        // Cache the price
        this.cache.set(ticker, {
          price,
          timestamp: new Date()
        });
        console.log(`📈 Fetched real price for ${ticker}: $${price}`);
        return price;
      }

      // Fallback to mock if API fails
      console.warn(`⚠️ API failed for ${ticker}, using mock price`);
      return this.getMockPrice(ticker);

    } catch (error) {
      console.error(`❌ Error fetching price for ${ticker}:`, error);
      return this.getMockPrice(ticker);
    }
  }

  /**
   * Fetch price from Alpha Vantage API
   */
  private async fetchFromAlphaVantage(ticker: string): Promise<number | null> {
    try {
      const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${this.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data: any = await response.json();

      // Check for API errors
      if (data['Error Message']) {
        console.error(`Alpha Vantage error: ${data['Error Message']}`);
        return null;
      }

      if (data['Note']) {
        console.warn(`Alpha Vantage rate limit: ${data['Note']}`);
        return null;
      }

      // Extract price from response
      const quote = data['Global Quote'];
      if (!quote || !quote['05. price']) {
        console.warn(`No price data for ${ticker}`);
        return null;
      }

      const price = parseFloat(quote['05. price']);
      
      if (isNaN(price) || price <= 0) {
        console.warn(`Invalid price for ${ticker}: ${quote['05. price']}`);
        return null;
      }

      return price;

    } catch (error) {
      console.error(`Alpha Vantage fetch error for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get cached price if available and recent
   */
  private getCachedPrice(ticker: string): number | null {
    const cached = this.cache.get(ticker);
    
    if (!cached) {
      return null;
    }

    // Check if cache is still valid
    const now = new Date();
    const ageMinutes = (now.getTime() - cached.timestamp.getTime()) / (1000 * 60);
    
    if (ageMinutes > this.cacheExpiryMinutes) {
      this.cache.delete(ticker);
      return null;
    }

    return cached.price;
  }

  /**
   * Mock prices for testing/fallback
   */
  private getMockPrice(ticker: string): number {
    const mockPrices: Record<string, number> = {
      'NVDA': 485.50,
      'TSLA': 242.84,
      'AAPL': 189.95,
      'MSFT': 378.91,
      'GOOGL': 141.80,
      'AMZN': 152.03,
      'META': 338.58,
      'AMD': 122.93,
      'NFLX': 456.66,
      'SPY': 455.48,
      'UPS': 131.45,
      'FDX': 265.78,
      'MRK': 98.32,
      'MTSR': 165.89,
      'PLTR': 42.18,
      'QQQ': 395.42,
      'DIA': 348.55,
      'IWM': 215.67
    };

    return mockPrices[ticker] || 100.00;
  }

  /**
   * Fetch multiple prices (with rate limiting)
   */
  async fetchMultiplePrices(tickers: string[]): Promise<Map<string, number>> {
    const prices = new Map<string, number>();
    
    console.log(`📊 Fetching prices for ${tickers.length} tickers...`);
    
    for (const ticker of tickers) {
      const price = await this.fetchStockPrice(ticker);
      
      if (price) {
        prices.set(ticker, price);
      }
      
      // Rate limiting: Alpha Vantage allows 5 calls/minute (free tier)
      // Wait 12 seconds between calls to stay under limit
      if (this.apiKey && tickers.indexOf(ticker) < tickers.length - 1) {
        await this.sleep(12000);
      }
    }
    
    console.log(`✅ Fetched ${prices.size}/${tickers.length} prices`);
    
    return prices;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Price cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; tickers: string[] } {
    return {
      size: this.cache.size,
      tickers: Array.from(this.cache.keys())
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new MarketDataService();

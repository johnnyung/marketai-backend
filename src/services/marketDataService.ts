// backend/src/services/marketDataService.ts
// Multi-API Price Service with Automatic Fallbacks
// Priority: Alpha Vantage → Finnhub → Yahoo Finance → Polygon.io

import axios from 'axios';

interface PriceData {
  price: number;
  change?: number;
  changePercent?: number;
  timestamp: Date;
  source: string;
}

interface CachedPrice {
  data: PriceData;
  cachedAt: number;
}

class MarketDataService {
  private cache = new Map<string, CachedPrice>();
  private readonly CACHE_TTL = 60000; // 1 minute cache
  
  // API Keys from environment
  private readonly ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY;
  private readonly FINNHUB_KEY = process.env.FINNHUB_API_KEY || 'free'; // Finnhub has free tier
  private readonly POLYGON_KEY = process.env.POLYGON_API_KEY;
  
  // Rate limiting
  private alphaVantageCallCount = 0;
  private alphaVantageResetTime = Date.now() + 60000; // Reset every minute
  private readonly ALPHA_VANTAGE_RATE_LIMIT = 5; // Free tier: 5 calls/minute

  /**
   * Get stock price with automatic fallback across multiple APIs
   */
  async getStockPrice(ticker: string): Promise<PriceData | null> {
    // Check cache first
    const cached = this.getFromCache(ticker);
    if (cached) {
      console.log(`  ✓ ${ticker}: $${cached.price.toFixed(2)} (Cached from ${cached.source})`);
      return cached;
    }

    // Try APIs in priority order
    const apis = [
      { name: 'Alpha Vantage', fn: () => this.getFromAlphaVantage(ticker) },
      { name: 'Finnhub', fn: () => this.getFromFinnhub(ticker) },
      { name: 'Yahoo Finance', fn: () => this.getFromYahooFinance(ticker) },
      { name: 'Polygon.io', fn: () => this.getFromPolygon(ticker) },
    ];

    for (const api of apis) {
      try {
        const priceData = await api.fn();
        if (priceData) {
          this.cache.set(ticker, {
            data: priceData,
            cachedAt: Date.now()
          });
          console.log(`  ✓ ${ticker}: $${priceData.price.toFixed(2)} (${api.name})`);
          return priceData;
        }
      } catch (error: any) {
        console.log(`  ⚠️ ${api.name} failed for ${ticker}: ${error.message}`);
        continue; // Try next API
      }
    }

    console.log(`  ❌ All APIs failed for ${ticker}`);
    return null;
  }

  /**
   * Get multiple prices efficiently (batching where possible)
   */
  async getMultiplePrices(tickers: string[]): Promise<Map<string, PriceData>> {
    const results = new Map<string, PriceData>();
    
    // Process in parallel with some delay between calls
    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];
      const priceData = await this.getStockPrice(ticker);
      
      if (priceData) {
        results.set(ticker, priceData);
      }
      
      // Small delay to avoid rate limits (200ms between calls)
      if (i < tickers.length - 1) {
        await this.sleep(200);
      }
    }
    
    return results;
  }

  /**
   * Alpha Vantage API (Primary)
   */
  private async getFromAlphaVantage(ticker: string): Promise<PriceData | null> {
    if (!this.ALPHA_VANTAGE_KEY) {
      throw new Error('Alpha Vantage API key not configured');
    }

    // Check rate limit
    if (Date.now() > this.alphaVantageResetTime) {
      this.alphaVantageCallCount = 0;
      this.alphaVantageResetTime = Date.now() + 60000;
    }

    if (this.alphaVantageCallCount >= this.ALPHA_VANTAGE_RATE_LIMIT) {
      throw new Error('Alpha Vantage rate limit exceeded (5/min)');
    }

    this.alphaVantageCallCount++;

    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${this.ALPHA_VANTAGE_KEY}`;
    const response = await axios.get(url, { timeout: 5000 });
    
    const quote = response.data['Global Quote'];
    if (!quote || !quote['05. price']) {
      throw new Error('No price data in response');
    }
    
    return {
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: parseFloat(quote['10. change percent']?.replace('%', '')),
      timestamp: new Date(),
      source: 'Alpha Vantage'
    };
  }

  /**
   * Finnhub API (Backup #1) - FREE tier available
   */
  private async getFromFinnhub(ticker: string): Promise<PriceData | null> {
    // Finnhub free tier: 60 calls/minute
    const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${this.FINNHUB_KEY}`;
    const response = await axios.get(url, { timeout: 5000 });
    
    const data = response.data;
    if (!data || !data.c) {
      throw new Error('No price data in response');
    }
    
    return {
      price: data.c, // current price
      change: data.d, // change
      changePercent: data.dp, // change percent
      timestamp: new Date(data.t * 1000), // timestamp
      source: 'Finnhub'
    };
  }

  /**
   * Yahoo Finance API (Backup #2) - FREE
   */
  private async getFromYahooFinance(ticker: string): Promise<PriceData | null> {
    // Using Yahoo Finance v8 API
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    const result = response.data?.chart?.result?.[0];
    if (!result || !result.meta || !result.meta.regularMarketPrice) {
      throw new Error('No price data in response');
    }
    
    const meta = result.meta;
    return {
      price: meta.regularMarketPrice,
      change: meta.regularMarketPrice - meta.previousClose,
      changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
      timestamp: new Date(meta.regularMarketTime * 1000),
      source: 'Yahoo Finance'
    };
  }

  /**
   * Polygon.io API (Backup #3)
   */
  private async getFromPolygon(ticker: string): Promise<PriceData | null> {
    if (!this.POLYGON_KEY) {
      throw new Error('Polygon API key not configured');
    }

    // Get previous close (free tier) or last trade
    const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${this.POLYGON_KEY}`;
    const response = await axios.get(url, { timeout: 5000 });
    
    const results = response.data?.results?.[0];
    if (!results || !results.c) {
      throw new Error('No price data in response');
    }
    
    return {
      price: results.c, // close price
      change: results.c - results.o, // close - open
      changePercent: ((results.c - results.o) / results.o) * 100,
      timestamp: new Date(results.t),
      source: 'Polygon.io'
    };
  }

  /**
   * Get from cache if still fresh
   */
  private getFromCache(ticker: string): PriceData | null {
    const cached = this.cache.get(ticker);
    if (!cached) return null;
    
    const age = Date.now() - cached.cachedAt;
    if (age > this.CACHE_TTL) {
      this.cache.delete(ticker);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Clear all cached prices
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Price cache cleared');
  }

  /**
   * Clear cache for specific ticker
   */
  clearTickerCache(ticker: string): void {
    this.cache.delete(ticker);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; tickers: string[] } {
    return {
      size: this.cache.size,
      tickers: Array.from(this.cache.keys())
    };
  }

  /**
   * Helper: Sleep for ms
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new MarketDataService();

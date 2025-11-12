// src/services/marketDataService.ts
// Multi-API price fetching with fallbacks
// FREE APIs: Finnhub (60/min), Yahoo Finance, IEX Cloud

import fetch from 'node-fetch';

interface PriceData {
  ticker: string;
  price: number;
  source: string;
  timestamp: Date;
}

// Price cache to avoid duplicate calls
const priceCache = new Map<string, { price: number; timestamp: Date }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class MarketDataService {
  private finnhubKey: string;
  private iexKey: string;

  constructor() {
    this.finnhubKey = process.env.FINNHUB_API_KEY || '';
    this.iexKey = process.env.IEX_API_KEY || '';
  }

  /**
   * Get stock price with fallback to multiple APIs
   */
  async getStockPrice(ticker: string): Promise<PriceData | null> {
    // Check cache first
    const cached = this.getCachedPrice(ticker);
    if (cached) {
      return cached;
    }

    // Try APIs in order: Finnhub -> Yahoo Finance -> IEX Cloud
    let result = await this.tryFinnhub(ticker);
    if (result) return this.cacheAndReturn(result);

    result = await this.tryYahooFinance(ticker);
    if (result) return this.cacheAndReturn(result);

    result = await this.tryIEXCloud(ticker);
    if (result) return this.cacheAndReturn(result);

    console.warn(`❌ All APIs failed for ${ticker}`);
    return null;
  }

  /**
   * Get multiple stock prices efficiently
   */
  async getMultiplePrices(tickers: string[]): Promise<Map<string, PriceData>> {
    const results = new Map<string, PriceData>();
    
    // Process in batches to respect rate limits
    const batchSize = 10;
    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (ticker) => {
          const price = await this.getStockPrice(ticker);
          if (price) {
            results.set(ticker, price);
          }
        })
      );
      
      // Small delay between batches
      if (i + batchSize < tickers.length) {
        await this.sleep(1000); // 1 second between batches
      }
    }
    
    return results;
  }

  /**
   * Finnhub API - FREE: 60 calls/minute
   * Sign up: https://finnhub.io/register
   */
  private async tryFinnhub(ticker: string): Promise<PriceData | null> {
    if (!this.finnhubKey) {
      return null;
    }

    try {
      const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${this.finnhubKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        return null;
      }

      const data: any = await response.json();
      
      if (data.c && data.c > 0) {
        return {
          ticker,
          price: data.c, // Current price
          source: 'Finnhub',
          timestamp: new Date()
        };
      }
    } catch (error) {
      console.error(`Finnhub error for ${ticker}:`, error);
    }
    
    return null;
  }

  /**
   * Yahoo Finance (via yfinance2 free API)
   * FREE: No key needed, reasonable rate limits
   */
  private async tryYahooFinance(ticker: string): Promise<PriceData | null> {
    try {
      // Using Yahoo Finance v8 API (no key required)
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      if (!response.ok) {
        return null;
      }

      const data: any = await response.json();
      
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      
      if (price && price > 0) {
        return {
          ticker,
          price,
          source: 'Yahoo Finance',
          timestamp: new Date()
        };
      }
    } catch (error) {
      console.error(`Yahoo Finance error for ${ticker}:`, error);
    }
    
    return null;
  }

  /**
   * IEX Cloud - FREE: 50,000 calls/month
   * Sign up: https://iexcloud.io/cloud-login#/register
   */
  private async tryIEXCloud(ticker: string): Promise<PriceData | null> {
    if (!this.iexKey) {
      return null;
    }

    try {
      const url = `https://cloud.iexapis.com/stable/stock/${ticker}/quote?token=${this.iexKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        return null;
      }

      const data: any = await response.json();
      
      if (data.latestPrice && data.latestPrice > 0) {
        return {
          ticker,
          price: data.latestPrice,
          source: 'IEX Cloud',
          timestamp: new Date()
        };
      }
    } catch (error) {
      console.error(`IEX Cloud error for ${ticker}:`, error);
    }
    
    return null;
  }

  /**
   * Check cache for recent price
   */
  private getCachedPrice(ticker: string): PriceData | null {
    const cached = priceCache.get(ticker);
    
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp.getTime();
    
    if (age < CACHE_DURATION) {
      return {
        ticker,
        price: cached.price,
        source: 'Cache',
        timestamp: cached.timestamp
      };
    }

    // Cache expired
    priceCache.delete(ticker);
    return null;
  }

  /**
   * Cache price and return
   */
  private cacheAndReturn(data: PriceData): PriceData {
    priceCache.set(data.ticker, {
      price: data.price,
      timestamp: data.timestamp
    });
    return data;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache() {
    priceCache.clear();
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: priceCache.size,
      tickers: Array.from(priceCache.keys())
    };
  }
}

export default new MarketDataService();

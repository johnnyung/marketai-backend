// backend/src/services/marketDataService.ts
// Multi-API Market Data Service with automatic fallbacks + cache
import axios from 'axios';

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  source: string;
}

interface CacheEntry {
  data: StockQuote;
  timestamp: number;
}

class MarketDataService {
  private alphaVantageKey: string;
  private finnhubKey: string;
  private cache: Map<string, CacheEntry>;
  private cacheTimeout: number;

  constructor() {
    this.alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY || '';
    this.finnhubKey = process.env.FINNHUB_API_KEY || '';
    this.cache = new Map();
    this.cacheTimeout = 60 * 1000; // 60 seconds cache
  }

  async getStockPrice(symbol: string): Promise<StockQuote | null> {
    // Check cache first
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`✅ ${symbol}: $${cached.data.price} (CACHE)`);
      return cached.data;
    }

    const apis = [
      { name: 'Alpha Vantage', fn: () => this.getFromAlphaVantage(symbol) },
      { name: 'Finnhub', fn: () => this.getFromFinnhub(symbol) },
      { name: 'Yahoo Finance', fn: () => this.getFromYahoo(symbol) }
    ];

    for (const api of apis) {
      try {
        console.log(`📡 Trying ${api.name} for ${symbol}...`);
        const result = await api.fn();
        if (result) {
          console.log(`✅ ${symbol}: $${result.price} (${api.name})`);
          
          // Cache the result
          this.cache.set(symbol, {
            data: result,
            timestamp: Date.now()
          });
          
          return result;
        }
      } catch (error: any) {
        console.log(`⚠️ ${api.name} failed for ${symbol}:`, error.message);
        continue;
      }
    }

    console.error(`❌ All APIs failed for ${symbol}`);
    return null;
  }

  private async getFromAlphaVantage(symbol: string): Promise<StockQuote | null> {
    if (!this.alphaVantageKey) {
      throw new Error('Alpha Vantage API key not configured');
    }

    const response = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.alphaVantageKey}`,
      { timeout: 10000 }
    );

    const quote = response.data['Global Quote'];
    if (!quote || !quote['05. price']) {
      if (response.data['Note']) {
        throw new Error('Rate limited');
      }
      throw new Error('No data returned');
    }

    return {
      symbol,
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
      volume: parseInt(quote['06. volume']),
      high: parseFloat(quote['03. high']),
      low: parseFloat(quote['04. low']),
      open: parseFloat(quote['02. open']),
      previousClose: parseFloat(quote['08. previous close']),
      source: 'Alpha Vantage'
    };
  }

  private async getFromFinnhub(symbol: string): Promise<StockQuote | null> {
    if (!this.finnhubKey) {
      throw new Error('Finnhub API key not configured');
    }

    const response = await axios.get(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${this.finnhubKey}`,
      { timeout: 10000 }
    );

    if (!response.data || response.data.c === 0) {
      throw new Error('No data returned');
    }

    return {
      symbol,
      price: response.data.c,
      change: response.data.d,
      changePercent: response.data.dp,
      high: response.data.h,
      low: response.data.l,
      open: response.data.o,
      previousClose: response.data.pc,
      source: 'Finnhub'
    };
  }

  private async getFromYahoo(symbol: string): Promise<StockQuote | null> {
    const response = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      }
    );

    const result = response.data?.chart?.result?.[0];
    if (!result || !result.meta) {
      throw new Error('No data returned');
    }

    const meta = result.meta;
    return {
      symbol,
      price: meta.regularMarketPrice,
      change: meta.regularMarketPrice - meta.previousClose,
      changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
      volume: meta.regularMarketVolume,
      high: meta.regularMarketDayHigh,
      low: meta.regularMarketDayLow,
      open: meta.regularMarketOpen,
      previousClose: meta.previousClose,
      source: 'Yahoo Finance'
    };
  }

  async getMultiplePrices(symbols: string[]): Promise<Map<string, StockQuote | null>> {
    const results = new Map<string, StockQuote | null>();
    
    const batchSize = 5;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const promises = batch.map(symbol => this.getStockPrice(symbol));
      const batchResults = await Promise.all(promises);
      
      batch.forEach((symbol, index) => {
        results.set(symbol, batchResults[index]);
      });

      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  // Cache management methods
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
      oldestEntry: this.getOldestCacheEntry()
    };
  }

  private getOldestCacheEntry() {
    let oldest: { symbol: string; age: number } | null = null;
    const now = Date.now();

    for (const [symbol, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (!oldest || age > oldest.age) {
        oldest = { symbol, age };
      }
    }

    return oldest;
  }

  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ Cleared ${size} cache entries`);
    return { cleared: size };
  }

  // Clean old cache entries
  cleanOldCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [symbol, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheTimeout) {
        this.cache.delete(symbol);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} old cache entries`);
    }

    return { cleaned };
  }

  // Get current price from cache only (no API call)
  getCachedPrice(symbol: string): StockQuote | null {
    const cached = this.cache.get(symbol);
    if (!cached) return null;
    
    // Return null if cache is expired
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      return null;
    }

    return cached.data;
  }
}

export default new MarketDataService();

// backend/src/services/finnhubService.ts
// Finnhub API Integration - Superior Alternative to Alpha Vantage
// Free Tier: 60 calls/min (vs Alpha Vantage's 5/min)
// API Docs: https://finnhub.io/docs/api

import axios from 'axios';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

interface StockQuote {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
  t: number;  // Timestamp
}

interface CompanyProfile {
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
  logo: string;
  finnhubIndustry: string;
}

interface CompanyNews {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

interface Recommendation {
  buy: number;
  hold: number;
  period: string;
  sell: number;
  strongBuy: number;
  strongSell: number;
  symbol: string;
}

class FinnhubService {
  
  /**
   * Get real-time stock quote
   * Rate Limit: 60 calls/min (FREE tier)
   */
  async getQuote(ticker: string): Promise<{ price: number; change: number; changePercent: number } | null> {
    try {
      console.log(`📊 Finnhub: Fetching quote for ${ticker}...`);
      
      const response = await axios.get<StockQuote>(`${BASE_URL}/quote`, {
        params: {
          symbol: ticker.toUpperCase(),
          token: FINNHUB_API_KEY
        },
        timeout: 5000
      });

      const quote = response.data;
      
      // Finnhub returns 0 for invalid tickers
      if (quote.c === 0 && quote.pc === 0) {
        console.log(`  ⚠️ ${ticker}: No data (invalid ticker?)`);
        return null;
      }

      console.log(`  ✓ ${ticker}: $${quote.c.toFixed(2)} (${quote.dp >= 0 ? '+' : ''}${quote.dp.toFixed(2)}%)`);
      
      return {
        price: quote.c,
        change: quote.d,
        changePercent: quote.dp
      };
      
    } catch (error: any) {
      console.error(`  ✗ Finnhub error for ${ticker}:`, error.message);
      return null;
    }
  }

  /**
   * Get company profile/overview
   */
  async getCompanyProfile(ticker: string): Promise<CompanyProfile | null> {
    try {
      console.log(`🏢 Finnhub: Fetching profile for ${ticker}...`);
      
      const response = await axios.get<CompanyProfile>(`${BASE_URL}/stock/profile2`, {
        params: {
          symbol: ticker.toUpperCase(),
          token: FINNHUB_API_KEY
        },
        timeout: 5000
      });

      if (!response.data || Object.keys(response.data).length === 0) {
        console.log(`  ⚠️ ${ticker}: No profile data`);
        return null;
      }

      console.log(`  ✓ ${ticker}: ${response.data.name || 'Unknown'}`);
      return response.data;
      
    } catch (error: any) {
      console.error(`  ✗ Finnhub profile error for ${ticker}:`, error.message);
      return null;
    }
  }

  /**
   * Get company news (last 30 days)
   */
  async getCompanyNews(ticker: string, limit: number = 10): Promise<CompanyNews[]> {
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);

      const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      console.log(`📰 Finnhub: Fetching news for ${ticker} (${fromDate} to ${toDate})...`);
      
      const response = await axios.get<CompanyNews[]>(`${BASE_URL}/company-news`, {
        params: {
          symbol: ticker.toUpperCase(),
          from: fromDate,
          to: toDate,
          token: FINNHUB_API_KEY
        },
        timeout: 10000
      });

      const news = response.data.slice(0, limit);
      console.log(`  ✓ Found ${news.length} news articles for ${ticker}`);
      
      return news;
      
    } catch (error: any) {
      console.error(`  ✗ Finnhub news error for ${ticker}:`, error.message);
      return [];
    }
  }

  /**
   * Get analyst recommendations
   */
  async getRecommendations(ticker: string): Promise<Recommendation[]> {
    try {
      console.log(`📊 Finnhub: Fetching recommendations for ${ticker}...`);
      
      const response = await axios.get<Recommendation[]>(`${BASE_URL}/stock/recommendation`, {
        params: {
          symbol: ticker.toUpperCase(),
          token: FINNHUB_API_KEY
        },
        timeout: 5000
      });

      console.log(`  ✓ Found ${response.data.length} recommendation periods for ${ticker}`);
      return response.data;
      
    } catch (error: any) {
      console.error(`  ✗ Finnhub recommendations error for ${ticker}:`, error.message);
      return [];
    }
  }

  /**
   * Get earnings calendar (upcoming earnings)
   */
  async getEarningsCalendar(days: number = 30): Promise<any[]> {
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + days);

      const fromDate = today.toISOString().split('T')[0];
      const toDate = futureDate.toISOString().split('T')[0];

      console.log(`📅 Finnhub: Fetching earnings calendar (${fromDate} to ${toDate})...`);
      
      const response = await axios.get(`${BASE_URL}/calendar/earnings`, {
        params: {
          from: fromDate,
          to: toDate,
          token: FINNHUB_API_KEY
        },
        timeout: 10000
      });

      const earnings = response.data.earningsCalendar || [];
      console.log(`  ✓ Found ${earnings.length} upcoming earnings`);
      
      return earnings;
      
    } catch (error: any) {
      console.error(`  ✗ Finnhub earnings calendar error:`, error.message);
      return [];
    }
  }

  /**
   * Get market news (general market)
   */
  async getMarketNews(category: string = 'general', limit: number = 20): Promise<CompanyNews[]> {
    try {
      console.log(`📰 Finnhub: Fetching market news (${category})...`);
      
      const response = await axios.get<CompanyNews[]>(`${BASE_URL}/news`, {
        params: {
          category,
          token: FINNHUB_API_KEY
        },
        timeout: 10000
      });

      const news = response.data.slice(0, limit);
      console.log(`  ✓ Found ${news.length} market news articles`);
      
      return news;
      
    } catch (error: any) {
      console.error(`  ✗ Finnhub market news error:`, error.message);
      return [];
    }
  }

  /**
   * Batch get quotes for multiple tickers (efficient!)
   */
  async getBatchQuotes(tickers: string[]): Promise<Map<string, { price: number; changePercent: number }>> {
    console.log(`📊 Finnhub: Batch fetching ${tickers.length} quotes...`);
    
    const results = new Map<string, { price: number; changePercent: number }>();
    
    // Finnhub free tier: 60 calls/min
    // We can safely do 1 call per second
    for (const ticker of tickers) {
      const quote = await this.getQuote(ticker);
      if (quote) {
        results.set(ticker, {
          price: quote.price,
          changePercent: quote.changePercent
        });
      }
      
      // Rate limiting: 1 second between calls (safe for free tier)
      await this.sleep(1000);
    }
    
    console.log(`  ✓ Successfully fetched ${results.size}/${tickers.length} quotes`);
    return results;
  }

  /**
   * Check API health/status
   */
  async checkApiHealth(): Promise<boolean> {
    try {
      // Test with a known ticker
      const quote = await this.getQuote('AAPL');
      return quote !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get API usage/rate limit info
   */
  getUsageInfo(): string {
    return `
Finnhub FREE Tier:
- Rate Limit: 60 calls/minute
- Real-time US stocks ✓
- Company profiles ✓
- Company news ✓
- Analyst recommendations ✓
- Earnings calendar ✓
- Market news ✓

Premium: $59.99/month for 300 calls/min
    `.trim();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new FinnhubService();

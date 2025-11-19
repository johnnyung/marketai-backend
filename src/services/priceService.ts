// backend/src/services/priceService.ts
// UPDATED: Now uses Finnhub instead of Alpha Vantage
// 60 calls/min vs 5 calls/min - 12x faster!

import finnhubService from './finnhubService.js';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

interface PriceData {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: Date;
}

class PriceService {
  
  /**
   * Get current price for a single ticker
   * Uses Finnhub (60 calls/min)
   */
  async getCurrentPrice(ticker: string): Promise<PriceData | null> {
    try {
      console.log(`💰 Getting price for ${ticker}...`);
      
      const quote = await finnhubService.getQuote(ticker);
      
      if (!quote) {
        console.log(`  ⚠️ No price data for ${ticker}`);
        return null;
      }

      const priceData: PriceData = {
        ticker: ticker.toUpperCase(),
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        timestamp: new Date()
      };

      // Cache in database
      await this.cachePrice(priceData);

      return priceData;
      
    } catch (error: any) {
      console.error(`❌ Price fetch error for ${ticker}:`, error.message);
      
      // Try to get cached price as fallback
      return await this.getCachedPrice(ticker);
    }
  }

  /**
   * Get prices for multiple tickers (batch operation)
   */
  async getBatchPrices(tickers: string[]): Promise<Map<string, PriceData>> {
    console.log(`\n💰 Batch fetching prices for ${tickers.length} tickers...`);
    
    const results = new Map<string, PriceData>();
    
    // Finnhub free tier: 60 calls/min
    // Safe to do 1 call per second (60 per minute)
    for (const ticker of tickers) {
      const priceData = await this.getCurrentPrice(ticker);
      
      if (priceData) {
        results.set(ticker, priceData);
      }
      
      // Rate limiting: 1 second between calls
      await this.sleep(1000);
    }
    
    console.log(`✅ Successfully fetched ${results.size}/${tickers.length} prices\n`);
    return results;
  }

  /**
   * Update all AI Tip Tracker positions with current prices
   */
  async updateAllTrackerPrices(): Promise<{ updated: number; failed: number }> {
    console.log('\n📊 Updating AI Tip Tracker prices...');
    
    try {
      // Get all open positions
      const result = await pool.query(`
        SELECT DISTINCT ticker 
        FROM ai_tip_tracker 
        WHERE status = 'OPEN'
        ORDER BY ticker
      `);

      const tickers = result.rows.map(row => row.ticker);
      console.log(`  → Found ${tickers.length} open positions to update`);

      if (tickers.length === 0) {
        return { updated: 0, failed: 0 };
      }

      let updated = 0;
      let failed = 0;

      for (const ticker of tickers) {
        const priceData = await this.getCurrentPrice(ticker);
        
        if (priceData) {
          // Update positions in ai_tip_tracker
          await pool.query(`
            UPDATE ai_tip_tracker
            SET 
              current_price = $1,
              last_price_update = NOW(),
              updated_at = NOW()
            WHERE ticker = $2 AND status = 'OPEN'
          `, [priceData.price, ticker]);
          
          updated++;
        } else {
          failed++;
        }

        // Rate limiting
        await this.sleep(1000);
      }

      console.log(`✅ Updated ${updated} positions, ${failed} failed\n`);
      return { updated, failed };
      
    } catch (error: any) {
      console.error('❌ Tracker price update failed:', error.message);
      return { updated: 0, failed: 0 };
    }
  }

  /**
   * Update watchlist prices
   */
  async updateWatchlistPrices(userId: number): Promise<number> {
    console.log(`\n📊 Updating watchlist prices for user ${userId}...`);
    
    try {
      const result = await pool.query(`
        SELECT DISTINCT symbol 
        FROM watchlist 
        WHERE user_id = $1
      `, [userId]);

      const symbols = result.rows.map(row => row.symbol);
      console.log(`  → Found ${symbols.length} watchlist items`);

      let updated = 0;

      for (const symbol of symbols) {
        const priceData = await this.getCurrentPrice(symbol);
        
        if (priceData) {
          await pool.query(`
            UPDATE watchlist
            SET 
              current_price = $1,
              price_change_pct = $2,
              last_price_update = NOW()
            WHERE symbol = $3 AND user_id = $4
          `, [priceData.price, priceData.changePercent, symbol, userId]);
          
          updated++;
        }

        await this.sleep(1000);
      }

      console.log(`✅ Updated ${updated} watchlist prices\n`);
      return updated;
      
    } catch (error: any) {
      console.error('❌ Watchlist price update failed:', error.message);
      return 0;
    }
  }

  /**
   * Cache price in database for fallback
   */
  private async cachePrice(priceData: PriceData): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO price_cache (
          ticker, price, change_amount, change_percent, cached_at
        ) VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (ticker) DO UPDATE SET
          price = EXCLUDED.price,
          change_amount = EXCLUDED.change_amount,
          change_percent = EXCLUDED.change_percent,
          cached_at = NOW()
      `, [
        priceData.ticker,
        priceData.price,
        priceData.change,
        priceData.changePercent
      ]);
    } catch (error) {
      // Cache failure is non-critical
    }
  }

  /**
   * Get cached price (fallback if API fails)
   */
  private async getCachedPrice(ticker: string): Promise<PriceData | null> {
    try {
      const result = await pool.query(`
        SELECT * FROM price_cache
        WHERE ticker = $1
        AND cached_at > NOW() - INTERVAL '1 hour'
      `, [ticker.toUpperCase()]);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        ticker: row.ticker,
        price: parseFloat(row.price),
        change: parseFloat(row.change_amount),
        changePercent: parseFloat(row.change_percent),
        timestamp: row.cached_at
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get company profile/info from Finnhub
   */
  async getCompanyProfile(ticker: string): Promise<any> {
    return await finnhubService.getCompanyProfile(ticker);
  }

  /**
   * Get company news from Finnhub
   */
  async getCompanyNews(ticker: string, limit: number = 10): Promise<any[]> {
    return await finnhubService.getCompanyNews(ticker, limit);
  }

  /**
   * Get analyst recommendations
   */
  async getRecommendations(ticker: string): Promise<any[]> {
    return await finnhubService.getRecommendations(ticker);
  }

  /**
   * Get earnings calendar
   */
  async getEarningsCalendar(days: number = 30) {
    return await finnhubService.getEarningsCalendar(days);
  }

  /**
   * Check if price service is healthy
   */
  async checkHealth(): Promise<boolean> {
    return await finnhubService.checkApiHealth();
  }

  /**
   * Get service info
   */
  getServiceInfo(): string {
    return `
Price Service (Finnhub-powered):
- Real-time quotes: 60 calls/min
- Company profiles ✓
- Company news ✓
- Analyst recommendations ✓
- Earnings calendar ✓

Upgrade from Alpha Vantage:
- 12x faster rate limit (60 vs 5 calls/min)
- More reliable data
- Better international coverage
    `.trim();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new PriceService();

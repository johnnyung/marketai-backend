// backend/src/services/priceUpdaterService.ts
// Updates current prices and P/L for all open AI Tip Tracker positions

import { Pool } from 'pg';
import axios from 'axios';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

interface Position {
  id: number;
  ticker: string;
  entry_price: string;
  shares: string;
  entry_date: string;
}

class PriceUpdaterService {
  /**
   * Get REAL current stock price from Alpha Vantage
   */
  private async getCurrentPrice(ticker: string): Promise<number | null> {
    try {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`;
      const response = await axios.get(url);
      
      const quote = response.data['Global Quote'];
      if (!quote || !quote['05. price']) {
        console.log(`⚠️ No price data for ${ticker}`);
        return null;
      }
      
      const price = parseFloat(quote['05. price']);
      console.log(`  ✓ ${ticker}: $${price.toFixed(2)}`);
      return price;
      
    } catch (error) {
      console.error(`❌ Error fetching price for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Update all open positions with current prices and P/L
   */
  async updateAllOpenPositions(): Promise<{ updated: number; failed: number; stats: any }> {
    console.log('\n💰 === UPDATING OPEN POSITIONS ===\n');
    
    try {
      // Step 1: Get all open positions
      console.log('📊 Step 1: Fetching open positions...');
      const result = await pool.query(`
        SELECT 
          id,
          ticker,
          entry_price,
          shares,
          entry_date
        FROM ai_tip_tracker
        WHERE status = 'OPEN'
        ORDER BY ticker
      `);

      const positions = result.rows as Position[];
      console.log(`✓ Found ${positions.length} open positions\n`);

      if (positions.length === 0) {
        console.log('⚠️ No open positions to update');
        return { updated: 0, failed: 0, stats: null };
      }

      // Step 2: Update each position
      console.log('💰 Step 2: Fetching current prices and updating P/L...');
      let updated = 0;
      let failed = 0;

      for (const position of positions) {
        const currentPrice = await this.getCurrentPrice(position.ticker);
        
        if (currentPrice) {
          await this.updatePosition(position, currentPrice);
          updated++;
        } else {
          failed++;
        }

        // Rate limiting - Alpha Vantage free tier: 5 calls/minute
        await this.sleep(12000); // 12 seconds between calls
      }

      console.log(`\n✅ Update complete: ${updated} updated, ${failed} failed\n`);

      // Step 3: Calculate summary stats
      const stats = await this.calculateStats();

      return { updated, failed, stats };

    } catch (error) {
      console.error('❌ Price update failed:', error);
      throw error;
    }
  }

  /**
   * Update a single position with current price and calculated P/L
   */
  private async updatePosition(position: Position, currentPrice: number): Promise<void> {
    try {
      const entryPrice = parseFloat(position.entry_price);
      const shares = parseFloat(position.shares);
      const mockInvestment = 100.00;

      // Calculate P/L
      const currentValue = shares * currentPrice;
      const currentPnl = currentValue - mockInvestment;
      const currentPnlPct = (currentPnl / mockInvestment) * 100;

      // Calculate days held
      const entryDate = new Date(position.entry_date);
      const now = new Date();
      const daysHeld = Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));

      // Update database
      await pool.query(`
        UPDATE ai_tip_tracker
        SET 
          current_price = $1,
          current_value = $2,
          current_pnl = $3,
          current_pnl_pct = $4,
          days_held = $5,
          last_price_update = NOW(),
          updated_at = NOW()
        WHERE id = $6
      `, [
        currentPrice,
        currentValue.toFixed(2),
        currentPnl.toFixed(2),
        currentPnlPct.toFixed(4),
        daysHeld,
        position.id
      ]);

      const pnlSign = currentPnl >= 0 ? '+' : '';
      console.log(
        `  ✓ ${position.ticker}: $${currentPrice.toFixed(2)} | ` +
        `P/L: ${pnlSign}$${currentPnl.toFixed(2)} (${pnlSign}${currentPnlPct.toFixed(2)}%) | ` +
        `${daysHeld} days`
      );

    } catch (error) {
      console.error(`❌ Failed to update ${position.ticker}:`, error);
    }
  }

  /**
   * Update a single ticker by ticker symbol
   */
  async updateSingleTicker(ticker: string): Promise<boolean> {
    try {
      console.log(`\n💰 Updating ${ticker}...`);
      
      const result = await pool.query(`
        SELECT 
          id,
          ticker,
          entry_price,
          shares,
          entry_date
        FROM ai_tip_tracker
        WHERE ticker = $1 AND status = 'OPEN'
        LIMIT 1
      `, [ticker.toUpperCase()]);

      if (result.rows.length === 0) {
        console.log(`⚠️ No open position found for ${ticker}`);
        return false;
      }

      const position = result.rows[0] as Position;
      const currentPrice = await this.getCurrentPrice(ticker);

      if (currentPrice) {
        await this.updatePosition(position, currentPrice);
        console.log(`✅ ${ticker} updated successfully`);
        return true;
      } else {
        console.log(`❌ Failed to get price for ${ticker}`);
        return false;
      }

    } catch (error) {
      console.error(`❌ Error updating ${ticker}:`, error);
      return false;
    }
  }

  /**
   * Calculate summary statistics
   */
  private async calculateStats(): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_positions,
          COUNT(*) FILTER (WHERE status = 'OPEN') as open_positions,
          COUNT(*) FILTER (WHERE status = 'CLOSED') as closed_positions,
          COALESCE(SUM(current_pnl) FILTER (WHERE status = 'OPEN'), 0) as total_open_pnl,
          COALESCE(SUM(final_pnl) FILTER (WHERE status = 'CLOSED'), 0) as total_closed_pnl,
          COALESCE(AVG(current_pnl_pct) FILTER (WHERE status = 'OPEN'), 0) as avg_open_return,
          COALESCE(AVG(final_pnl_pct) FILTER (WHERE status = 'CLOSED'), 0) as avg_closed_return
        FROM ai_tip_tracker
      `);

      const stats = result.rows[0];
      
      console.log('📊 Summary Statistics:');
      console.log(`  Total Positions: ${stats.total_positions}`);
      console.log(`  Open: ${stats.open_positions} | Closed: ${stats.closed_positions}`);
      console.log(`  Total P/L (Open): $${parseFloat(stats.total_open_pnl).toFixed(2)}`);
      console.log(`  Total P/L (Closed): $${parseFloat(stats.total_closed_pnl).toFixed(2)}`);
      console.log(`  Avg Return (Open): ${parseFloat(stats.avg_open_return).toFixed(2)}%`);
      console.log(`  Avg Return (Closed): ${parseFloat(stats.avg_closed_return).toFixed(2)}%`);

      return stats;

    } catch (error) {
      console.error('Failed to calculate stats:', error);
      return null;
    }
  }

  /**
   * Get update status/last update time
   */
  async getUpdateStatus(): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_positions,
          COUNT(*) FILTER (WHERE status = 'OPEN') as open_positions,
          MAX(last_price_update) as last_update,
          COUNT(*) FILTER (WHERE last_price_update IS NULL AND status = 'OPEN') as never_updated
        FROM ai_tip_tracker
      `);

      return result.rows[0];
    } catch (error) {
      console.error('Failed to get update status:', error);
      return null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new PriceUpdaterService();

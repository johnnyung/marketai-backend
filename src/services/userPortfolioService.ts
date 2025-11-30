import pool from '../db/index.js';
import comprehensiveDataEngine from './comprehensiveDataEngine.js';
import fmpService from './fmpService.js';

interface Holding {
  id: number;
  ticker: string;
  shares: number;
  avg_cost: number;
  purchase_date: string;
  notes: string;
  last_analysis?: any;
}

class UserPortfolioService {
  private USER_ID = 1; // Default user for v1

  // CRUD Operations
  async getHoldings(): Promise<Holding[]> {
      try {
          const res = await pool.query(`SELECT * FROM user_portfolio_holdings WHERE user_id = $1 ORDER BY ticker`, [this.USER_ID]);
          return res.rows;
      } catch (e) { return []; }
  }

  async addHolding(ticker: string, shares: number, price: number, date: string) {
      const symbol = ticker.toUpperCase().trim();
      let adjShares = shares;
      let adjPrice = price;

      try {
          // SPLIT ADJUSTMENT LOGIC
          const splits = await fmpService.getStockSplits(symbol);
          if (splits && splits.length > 0) {
              const purchaseDate = new Date(date);
              const relevantSplits = splits.filter((s: any) => new Date(s.date) > purchaseDate);
              relevantSplits.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

              for (const split of relevantSplits) {
                  const numerator = split.numerator || 1;
                  const denominator = split.denominator || 1;
                  const ratio = numerator / denominator;
                  adjShares *= ratio;
                  adjPrice /= ratio;
              }
          }
      } catch (e) {}

      await pool.query(`
        INSERT INTO user_portfolio_holdings (user_id, ticker, shares, avg_cost, purchase_date)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, ticker) DO UPDATE
        SET shares = $3, avg_cost = $4, purchase_date = $5
      `, [this.USER_ID, symbol, adjShares, adjPrice, date]);
  }

  async removeHolding(ticker: string) {
      await pool.query(`DELETE FROM user_portfolio_holdings WHERE user_id = $1 AND ticker = $2`, [this.USER_ID, ticker]);
  }

  // THE CRITICAL FIX: Ensure engine response is handled and saved
  async analyzePortfolio() {
      console.log("      💼 User Portfolio: Requesting Deep Brain Analysis...");
      
      const holdings = await this.getHoldings();
      if (holdings.length === 0) return { success: false, message: "Portfolio empty" };

      const tickers = holdings.map(h => h.ticker);
      
      // Call the main engine
      let results: any[] = [];
      try {
          results = await comprehensiveDataEngine.analyzeSpecificTickers(tickers);
      } catch (e: any) {
          console.error("      ❌ Analysis Engine Error:", e.message);
          return { success: false, error: "Engine Failure" };
      }
      
      if (results.length === 0) {
          console.log("      ⚠️  Engine returned no results.");
          return { success: false, message: "No signals generated." };
      }

      // Save results back to DB
      let updated = 0;
      for (const res of results) {
          try {
              await pool.query(`
                UPDATE user_portfolio_holdings
                SET last_analysis = $1, last_analyzed_at = NOW()
                WHERE user_id = $2 AND ticker = $3
              `, [JSON.stringify(res), this.USER_ID, res.ticker]);
              updated++;
          } catch (e) { console.error("      ❌ Save Error:", res.ticker); }
      }

      console.log(`      ✅ Analyzed & Updated ${updated} Holdings.`);
      return { success: true, analyzed: updated, data: results };
  }
}

export default new UserPortfolioService();

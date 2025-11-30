import pool from '../db/index.js';
import marketDataService from './marketDataService.js';
import paperTradingService from './paperTradingService.js';
import corporateQualityService from './corporateQualityService.js';
import momentumService from './momentumService.js';
import { withTimeout } from '../utils/withTimeout.js';

class TradeManagementService {

  async reviewPositions() {
    console.log('      ⚖️  The Magistrate: Reviewing Active Positions...');

    try {
      // 1. Get Open Positions (Protected)
      const portfolio = await withTimeout(
          paperTradingService.getPortfolioState(),
          'PaperTrading.getPortfolioState',
          5000
      ).catch(() => ({ positions: [], summary: { id: 0 } }));

      const positions = portfolio.positions || [];

      if (positions.length === 0) return;

      for (const pos of positions) {
          // Evaluate each position with strict timeout
          await withTimeout(
              this.evaluatePosition(pos, portfolio.summary.id),
              `Evaluate ${pos.ticker}`,
              3000
          ).catch(err => console.error(`Skipped ${pos.ticker}: ${err.message}`));
      }

    } catch (e: any) {
      console.error("Magistrate Error (Soft Fail):", e.message);
    }
  }

  private async evaluatePosition(pos: any, portfolioId: number) {
      const ticker = pos.ticker;
      const entryPrice = parseFloat(pos.avg_entry_price);
      const shares = parseFloat(pos.shares);
      
      const quote = await marketDataService.getStockPrice(ticker);
      if (!quote) return;
      const currentPrice = quote.price;
      const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;

      // Fast health check (timeout-wrapped internally by service)
      const health = await corporateQualityService.analyzeHealth(ticker);
      
      let action = 'HOLD';
      let reason = '';

      if (!health.passed) {
          action = 'SELL';
          reason = `[EMERGENCY EXIT] Health Fail`;
      } else if (pnlPct < -8.0) {
          action = 'SELL';
          reason = `[STOP LOSS] -8% Hit`;
      } else if (pnlPct > 30.0) {
          action = 'SELL';
          reason = `[PROFIT TAKE] +30% Hit`;
      }

      if (action === 'SELL') {
          console.log(`      🔨 MAGISTRATE: Selling ${ticker}. ${reason}`);
          await this.executeSell(portfolioId, ticker, shares, currentPrice, reason);
      }
  }

  private async executeSell(portfolioId: number, ticker: string, shares: number, price: number, reason: string) {
      const client = await pool.connect();
      try {
          await client.query('BEGIN');
          const totalVal = shares * price;
          await client.query(`UPDATE portfolios SET current_cash = current_cash + $1 WHERE id = $2`, [totalVal, portfolioId]);
          await client.query(`DELETE FROM stock_positions WHERE portfolio_id = $1 AND ticker = $2`, [portfolioId, ticker]);
          await client.query(`
              INSERT INTO trades (portfolio_id, ticker, action, shares, price, total_amount, reason, asset_type, executed_at)
              VALUES ($1, $2, 'SELL', $3, $4, $5, $6, 'stock', NOW())
          `, [portfolioId, ticker, shares, price, totalVal, reason]);
          await client.query('COMMIT');
      } catch (e) {
          await client.query('ROLLBACK');
      } finally {
          client.release();
      }
  }
}

export default new TradeManagementService();

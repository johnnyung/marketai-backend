import { Pool } from 'pg';
import marketDataService from './marketDataService.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

interface TradeParams {
  ticker: string;
  action: 'BUY' | 'SELL';
  quantity?: number;
  price?: number;
  reason?: string;
  tipId?: number;
  assetType?: string;
}

class PaperTradingService {
  
  private SYSTEM_PORTFOLIO_NAME = 'AI_PAPER_TRADING';

  async runCycle() {
      console.log('🤖 Auto-Trader: Running Execution Cycle...');
      try {
          await this.executeNewSignals();
          await this.monitorPositions();
          return { success: true };
      } catch (e: any) {
          console.error("Auto-Trader Error:", e.message);
          return { success: false, error: e.message };
      }
  }

  private async executeNewSignals() {
      const portfolio = await this.getSystemPortfolio();
      if (!portfolio) return;

      // Find active, unexecuted BUY tips
      const signals = await pool.query(`
          SELECT id, ticker, allocation_pct, action, stop_loss, target_price
          FROM ai_stock_tips
          WHERE status = 'active'
          AND action = 'BUY'
          AND is_executed = FALSE
          ORDER BY confidence DESC
      `);

      for (const signal of signals.rows) {
          const allocation = signal.allocation_pct || 5.0;
          const targetAmount = (parseFloat(portfolio.total_equity) * allocation) / 100;
          
          const quote = await marketDataService.getStockPrice(signal.ticker);
          if (!quote || quote.price <= 0) continue;

          // Ensure shares is an integer > 0
          const shares = Math.floor(targetAmount / quote.price);

          if (shares > 0 && parseFloat(portfolio.current_cash) >= (shares * quote.price)) {
              console.log(`   🚀 Executing BUY: ${signal.ticker} (${shares} shares @ $${quote.price})`);
              
              await this.executeTrade({
                  ticker: signal.ticker,
                  action: 'BUY',
                  quantity: shares, // Guaranteed non-null
                  price: quote.price,
                  reason: `AI Signal (Alloc: ${allocation}%)`,
                  tipId: signal.id,
                  assetType: 'stock'
              });
          } else {
              // Mark as 'skipped' to stop retrying if funds insufficient or price too high
              console.log(`   ⚠️ Skipping ${signal.ticker}: Insufficient funds or 0 shares.`);
          }
      }
  }

  private async monitorPositions() {
      const portfolio = await this.getSystemPortfolio();
      if (!portfolio) return;

      const positions = await pool.query(`
          SELECT p.*, t.stop_loss, t.target_price, t.signal_expiry, t.status as tip_status
          FROM stock_positions p
          LEFT JOIN ai_stock_tips t ON p.ticker = t.ticker AND t.status != 'closed'
          WHERE p.portfolio_id = $1
      `, [portfolio.id]);

      for (const pos of positions.rows) {
          const quote = await marketDataService.getStockPrice(pos.ticker);
          if (!quote) continue;

          const currentVal = parseFloat(pos.shares) * quote.price;
          const pnl = currentVal - parseFloat(pos.cost_basis);
          
          await pool.query(`
              UPDATE stock_positions
              SET current_price = $1, market_value = $2, unrealized_pnl = $3, updated_at = NOW()
              WHERE id = $4
          `, [quote.price, currentVal, pnl, pos.id]);

          let exitReason = "";
          if (pos.stop_loss && quote.price < pos.stop_loss) exitReason = "Stop Loss Hit";
          if (pos.target_price && quote.price > pos.target_price) exitReason = "Target Hit";
          if (pos.tip_status === 'expired' || pos.tip_status === 'watch_only') exitReason = "Signal Expired";

          if (exitReason) {
               console.log(`   📉 Executing SELL: ${pos.ticker} (${exitReason})`);
               await this.executeTrade({
                   ticker: pos.ticker,
                   action: 'SELL',
                   quantity: parseFloat(pos.shares),
                   price: quote.price,
                   reason: exitReason,
                   assetType: 'stock'
               });
          }
      }
      
      await this.updatePortfolioTotals(portfolio.id);
  }

  private async executeTrade(params: TradeParams) {
      // VALIDATION GUARD
      if (!params.quantity || params.quantity <= 0) {
          console.error(`   ❌ Trade Aborted: Invalid Quantity (${params.quantity}) for ${params.ticker}`);
          return;
      }
      if (!params.price || params.price <= 0) {
          console.error(`   ❌ Trade Aborted: Invalid Price for ${params.ticker}`);
          return;
      }

      const client = await pool.connect();
      try {
          await client.query('BEGIN');
          
          const portfolio = await this.getSystemPortfolio(client);
          const totalCost = params.quantity * params.price;
          const assetType = params.assetType || 'stock';

          if (params.action === 'BUY') {
              await client.query(`UPDATE portfolios SET current_cash = current_cash - $1 WHERE id = $2`, [totalCost, portfolio.id]);
              
              const existing = await client.query(`SELECT id, shares, cost_basis FROM stock_positions WHERE portfolio_id=$1 AND ticker=$2`, [portfolio.id, params.ticker]);
              if (existing.rows.length > 0) {
                  const newShares = parseFloat(existing.rows[0].shares) + params.quantity;
                  const newBasis = parseFloat(existing.rows[0].cost_basis) + totalCost;
                  const newAvg = newBasis / newShares;
                  await client.query(`UPDATE stock_positions SET shares=$1, cost_basis=$2, avg_entry_price=$3, updated_at=NOW() WHERE id=$4`, [newShares, newBasis, newAvg, existing.rows[0].id]);
              } else {
                  await client.query(`INSERT INTO stock_positions (portfolio_id, ticker, shares, avg_entry_price, current_price, cost_basis, market_value, unrealized_pnl) VALUES ($1, $2, $3, $4, $4, $5, $5, 0)`, [portfolio.id, params.ticker, params.quantity, params.price, totalCost]);
              }

              if (params.tipId) {
                  await client.query(`UPDATE ai_stock_tips SET is_executed=TRUE, execution_price=$1, execution_date=NOW(), position_id=(SELECT id FROM stock_positions WHERE portfolio_id=$3 AND ticker=$4) WHERE id=$2`, [params.price, params.tipId, portfolio.id, params.ticker]);
              }

          } else if (params.action === 'SELL') {
              await client.query(`UPDATE portfolios SET current_cash = current_cash + $1 WHERE id = $2`, [totalCost, portfolio.id]);
              await client.query(`DELETE FROM stock_positions WHERE portfolio_id=$1 AND ticker=$2`, [portfolio.id, params.ticker]);
              await client.query(`UPDATE ai_stock_tips SET status='closed', exit_price=$1, exit_date=NOW(), exit_reason=$2 WHERE ticker=$3 AND status='active'`, [params.price, params.reason, params.ticker]);
          }

          // DB INSERT with Validation
          await client.query(
            `INSERT INTO trades (portfolio_id, ticker, action, shares, price, total_amount, reason, asset_type, executed_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`, 
            [portfolio.id, params.ticker, params.action, params.quantity, params.price, totalCost, params.reason, assetType]
          );

          await client.query('COMMIT');
      } catch (e: any) {
          await client.query('ROLLBACK');
          console.error("   ❌ Trade Transaction Failed:", e.message);
      } finally {
          client.release();
      }
  }

  private async getSystemPortfolio(client?: any) {
      const query = `SELECT id, current_cash, (current_cash + COALESCE((SELECT SUM(market_value) FROM stock_positions WHERE portfolio_id=portfolios.id), 0)) as total_equity FROM portfolios WHERE name = $1`;
      const res = client ? await client.query(query, [this.SYSTEM_PORTFOLIO_NAME]) : await pool.query(query, [this.SYSTEM_PORTFOLIO_NAME]);
      return res.rows[0];
  }

  private async updatePortfolioTotals(id: number) {
     await pool.query(`UPDATE portfolios SET total_value = current_cash + COALESCE((SELECT SUM(market_value) FROM stock_positions WHERE portfolio_id=$1), 0) WHERE id=$1`, [id]);
  }
  
  async getPortfolioState() {
      const p = await this.getSystemPortfolio();
      const pos = await pool.query(`SELECT * FROM stock_positions WHERE portfolio_id=$1 ORDER BY market_value DESC`, [p.id]);
      const history = await pool.query(`SELECT * FROM trades WHERE portfolio_id=$1 ORDER BY executed_at DESC LIMIT 20`, [p.id]);
      return { summary: p, positions: pos.rows, history: history.rows };
  }
}

export default new PaperTradingService();

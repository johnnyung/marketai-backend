import { Pool } from 'pg';
import pool from '../db/index.js';
import unifiedIntelligenceFactory from './unifiedIntelligenceFactory.js';
import { adaptForPortfolio } from '../utils/uiResponseAdapter.js';

interface Holding {
  id?: number;
  ticker: string;
  shares: number;
  entry_price: number;
  current_price?: number;
}

class UserPortfolioService {
  
  // --- DB METHODS ---

  async getHoldings(userId: number = 1): Promise<Holding[]> {
    try {
      const res = await pool.query(
        'SELECT id, ticker, shares, avg_cost as entry_price FROM portfolio_positions WHERE user_id = $1',
        [userId]
      );
      return res.rows;
    } catch (e) {
      return [];
    }
  }

  async addHolding(ticker: string, shares: number, price: number, userId: number = 1) {
    await pool.query(
      `INSERT INTO portfolio_positions (user_id, ticker, shares, avg_cost)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, ticker)
       DO UPDATE SET shares = portfolio_positions.shares + $3, avg_cost = (portfolio_positions.avg_cost + $4) / 2`,
      [userId, ticker, shares, price]
    );
  }

  async removeHolding(ticker: string, userId: number = 1) {
    await pool.query('DELETE FROM portfolio_positions WHERE user_id = $1 AND ticker = $2', [userId, ticker]);
  }

  async analyzePortfolio(userId: number = 1) {
    const holdings = await this.getHoldings(userId);
    return this.processHoldings(holdings);
  }

  // --- DYNAMIC METHODS (For "Analyze My Portfolio" UI) ---

  async analyzeDynamicPortfolio(positions: Holding[]) {
      return this.processHoldings(positions);
  }

  // Shared Logic
  private async processHoldings(holdings: Holding[]) {
    if (!holdings || holdings.length === 0) {
        return {
            summary: { total_value: 0, health_score: 100, risk_level: 'LOW' },
            positions: []
        };
    }

    console.log(`[PORTFOLIO] Analyzing ${holdings.length} positions...`);

    const analysisResults = await Promise.all(
        holdings.map(async (pos) => {
            try {
                const bundle = await unifiedIntelligenceFactory.generateBundle(pos.ticker);
                return adaptForPortfolio(pos, bundle);
            } catch (err: any) {
                console.error(`[PORTFOLIO] Failed to analyze ${pos.ticker}: ${err.message}`);
                return null;
            }
        })
    );

    const validPositions = analysisResults.filter(p => p !== null);
    const totalValue = validPositions.reduce((sum, p) => sum + (p.market_value || 0), 0);
    const totalCost = validPositions.reduce((sum, p) => sum + ((p.shares * p.avg_cost) || 0), 0);
    const totalPnL = totalValue - totalCost;
    
    const avgScore = validPositions.length > 0
        ? validPositions.reduce((sum, p) => sum + (p.score || 0), 0) / validPositions.length
        : 0;

    return {
        summary: {
            total_value: parseFloat(totalValue.toFixed(2)),
            total_pnl: parseFloat(totalPnL.toFixed(2)),
            health_score: Math.round(avgScore),
            risk_level: avgScore < 50 ? 'HIGH' : avgScore < 75 ? 'MODERATE' : 'LOW',
            position_count: validPositions.length
        },
        positions: validPositions
    };
  }
}

export default new UserPortfolioService();

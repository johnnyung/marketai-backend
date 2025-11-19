import { query, transaction } from '../db/index.js';
import { futuresService } from './futures.js';

/**
 * Get user's portfolios
 */
export async function getUserPortfolios(userId: number) {
  const result = await query(
    `SELECT p.*, 
            (SELECT COUNT(*) FROM stock_positions WHERE portfolio_id = p.id) as stock_positions_count,
            (SELECT COUNT(*) FROM futures_positions WHERE portfolio_id = p.id) as futures_positions_count
     FROM portfolios p
     WHERE p.user_id = $1
     ORDER BY p.created_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Get portfolio by ID
 */
export async function getPortfolioById(portfolioId: number, userId: number) {
  const result = await query(
    'SELECT * FROM portfolios WHERE id = $1 AND user_id = $2',
    [portfolioId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Portfolio not found');
  }

  return result.rows[0];
}

/**
 * Create new portfolio
 */
export async function createPortfolio(
  userId: number,
  name: string,
  type: string,
  startingCash: number = 100000
) {
  const result = await query(
    `INSERT INTO portfolios (user_id, name, type, starting_cash, current_cash, total_value)
     VALUES ($1, $2, $3, $4, $4, $4)
     RETURNING *`,
    [userId, name, type, startingCash]
  );

  return result.rows[0];
}

/**
 * Get portfolio performance
 */
export async function getPortfolioPerformance(portfolioId: number) {
  // Get portfolio
  const portfolio = await query(
    'SELECT * FROM portfolios WHERE id = $1',
    [portfolioId]
  );

  if (portfolio.rows.length === 0) {
    throw new Error('Portfolio not found');
  }

  const p = portfolio.rows[0];

  // Get stock positions
  const stockPositions = await query(
    'SELECT * FROM stock_positions WHERE portfolio_id = $1',
    [portfolioId]
  );

  // Get futures positions
  const futuresPositions = await query(
    'SELECT * FROM futures_positions WHERE portfolio_id = $1',
    [portfolioId]
  );

  // Calculate total stock value
  const stockValue = stockPositions.rows.reduce((sum: number, pos: any) => {
    return sum + (pos.shares * pos.current_price);
  }, 0);

  // Calculate total futures unrealized P&L
  const futuresUnrealizedPnL = futuresPositions.rows.reduce(
    (sum: number, pos: any) => sum + parseFloat(pos.unrealized_pnl),
    0
  );

  // Calculate total margin used
  const marginUsed = await futuresService.calculateTotalMargin(portfolioId);

  const totalValue = parseFloat(p.current_cash) + stockValue + futuresUnrealizedPnL;
  const totalReturn = totalValue - parseFloat(p.starting_cash);
  const totalReturnPct = (totalReturn / parseFloat(p.starting_cash)) * 100;

  // Update portfolio total_value
  await query(
    'UPDATE portfolios SET total_value = $1 WHERE id = $2',
    [totalValue, portfolioId]
  );

  return {
    portfolioId,
    startingCash: parseFloat(p.starting_cash),
    currentCash: parseFloat(p.current_cash),
    stockValue,
    futuresUnrealizedPnL,
    marginUsed,
    totalValue,
    totalReturn,
    totalReturnPct,
    stockPositionsCount: stockPositions.rows.length,
    futuresPositionsCount: futuresPositions.rows.length,
  };
}

/**
 * Get portfolio trades
 */
export async function getPortfolioTrades(
  portfolioId: number,
  limit: number = 50
) {
  const result = await query(
    `SELECT * FROM trades 
     WHERE portfolio_id = $1 
     ORDER BY executed_at DESC 
     LIMIT $2`,
    [portfolioId, limit]
  );
  return result.rows;
}

/**
 * Get trade statistics
 */
export async function getTradeStatistics(portfolioId: number) {
  const result = await query(
    `SELECT 
       COUNT(*) as total_trades,
       SUM(CASE WHEN notes LIKE '%P&L:%' AND CAST(SUBSTRING(notes FROM 'P&L: \\$([0-9.-]+)') AS DECIMAL) > 0 THEN 1 ELSE 0 END) as winning_trades,
       SUM(CASE WHEN notes LIKE '%P&L:%' AND CAST(SUBSTRING(notes FROM 'P&L: \\$([0-9.-]+)') AS DECIMAL) < 0 THEN 1 ELSE 0 END) as losing_trades,
       AVG(CASE WHEN notes LIKE '%P&L:%' THEN CAST(SUBSTRING(notes FROM 'P&L: \\$([0-9.-]+)') AS DECIMAL) ELSE NULL END) as avg_pnl
     FROM trades
     WHERE portfolio_id = $1 AND notes LIKE '%P&L:%'`,
    [portfolioId]
  );

  const stats = result.rows[0];
  const winRate = stats.total_trades > 0 
    ? (parseInt(stats.winning_trades) / parseInt(stats.total_trades)) * 100 
    : 0;

  return {
    totalTrades: parseInt(stats.total_trades) || 0,
    winningTrades: parseInt(stats.winning_trades) || 0,
    losingTrades: parseInt(stats.losing_trades) || 0,
    winRate: winRate.toFixed(2),
    avgPnL: parseFloat(stats.avg_pnl) || 0,
  };
}

/**
 * Create daily portfolio snapshot
 */
export async function createDailySnapshot(portfolioId: number) {
  const performance = await getPortfolioPerformance(portfolioId);
  
  // Check if snapshot already exists for today
  const today = new Date().toISOString().split('T')[0];
  const existing = await query(
    'SELECT id FROM portfolio_snapshots WHERE portfolio_id = $1 AND snapshot_date = $2',
    [portfolioId, today]
  );

  if (existing.rows.length > 0) {
    // Update existing snapshot
    await query(
      `UPDATE portfolio_snapshots 
       SET total_value = $1, cash = $2, positions_value = $3, total_return_pct = $4
       WHERE portfolio_id = $5 AND snapshot_date = $6`,
      [
        performance.totalValue,
        performance.currentCash,
        performance.stockValue + performance.futuresUnrealizedPnL,
        performance.totalReturnPct,
        portfolioId,
        today,
      ]
    );
  } else {
    // Create new snapshot
    await query(
      `INSERT INTO portfolio_snapshots 
       (portfolio_id, total_value, cash, positions_value, total_return_pct, snapshot_date)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        portfolioId,
        performance.totalValue,
        performance.currentCash,
        performance.stockValue + performance.futuresUnrealizedPnL,
        performance.totalReturnPct,
        today,
      ]
    );
  }
}

/**
 * Get portfolio historical performance
 */
export async function getPortfolioHistory(portfolioId: number, days: number = 30) {
  const result = await query(
    `SELECT * FROM portfolio_snapshots 
     WHERE portfolio_id = $1 
     ORDER BY snapshot_date DESC 
     LIMIT $2`,
    [portfolioId, days]
  );
  return result.rows.reverse();
}

export const portfolioService = {
  getUserPortfolios,
  getPortfolioById,
  createPortfolio,
  getPortfolioPerformance,
  getPortfolioTrades,
  getTradeStatistics,
  createDailySnapshot,
  getPortfolioHistory,
};

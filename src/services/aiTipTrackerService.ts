/**
 * AI TIP TRACKER SERVICE - FIXED VERSION
 * 
 * Automatically tracks every AI recommendation with mock $100 investment
 */

import pool from '../db/index.js';
import marketDataService from './marketDataService.js';

interface AIRecommendation {
  ticker: string;
  companyName?: string;
  recommendationType: 'BUY' | 'SELL' | 'SHORT' | 'WATCH';
  entryPrice: number;
  aiReasoning: string;
  aiConfidence: number;
  aiPredictionTarget?: number;
  aiPredictionPct?: number;
  aiPredictionTimeframe?: string;
  aiThesis?: string;
  aiStrategy?: string;
  sector?: string;
  marketCapCategory?: string;
}

interface TrackerPosition {
  id: number;
  ticker: string;
  recommendationType: string;
  entryPrice: number;
  entryDate: Date;
  shares: number;
  status: string;
  currentPrice?: number;
  currentPnl?: number;
  currentPnlPct?: number;
  daysHeld: number;
  aiConfidence: number;
  aiPredictionPct?: number;
  aiPredictionDays?: number;
  aiReasoning: string;
}

// Fetch stock price using market data service
async function fetchStockPrice(ticker: string): Promise<number | null> {
  const priceData = await marketDataService.getStockPrice(ticker);
  if (priceData) {
    console.log(`✅ ${ticker}: $${priceData.price.toFixed(2)} (${priceData.source})`);
    return priceData.price;
  }
  return null;
}

class AITipTrackerService {
  
  /**
   * Create a new tracked position from AI recommendation
   */
  async createPosition(recommendation: AIRecommendation): Promise<number> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        ticker,
        companyName,
        recommendationType,
        entryPrice,
        aiReasoning,
        aiConfidence,
        aiPredictionTarget,
        aiPredictionPct,
        aiPredictionTimeframe,
        aiThesis,
        aiStrategy,
        sector,
        marketCapCategory
      } = recommendation;
      
      const mockInvestment = 100.00;
      const shares = mockInvestment / entryPrice;
      const aiPredictionDays = this.convertTimeframeToDays(aiPredictionTimeframe);
      
      const result = await client.query(`
        INSERT INTO ai_tip_tracker (
          ticker, company_name, recommendation_type, entry_price,
          entry_date, entry_time, mock_investment, shares,
          ai_reasoning, ai_confidence, ai_prediction_target,
          ai_prediction_pct, ai_prediction_timeframe, ai_prediction_days,
          ai_thesis, ai_strategy, sector, market_cap_category,
          current_price, current_value, current_pnl, current_pnl_pct,
          last_price_update
        ) VALUES (
          $1, $2, $3, $4, NOW(), CURRENT_TIME, $5, $6,
          $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $4, $5, 0, 0, NOW()
        ) RETURNING id
      `, [
        ticker, companyName, recommendationType, entryPrice,
        mockInvestment, shares, aiReasoning, aiConfidence,
        aiPredictionTarget, aiPredictionPct, aiPredictionTimeframe,
        aiPredictionDays, aiThesis, aiStrategy, sector, marketCapCategory
      ]);
      
      const positionId = result.rows[0].id;
      
      await client.query(`
        INSERT INTO ai_tip_tracker_daily_prices (
          tracker_id, date, close_price, position_value, pnl, pnl_pct, days_held
        ) VALUES ($1, CURRENT_DATE, $2, $3, 0, 0, 0)
      `, [positionId, entryPrice, mockInvestment]);
      
      await client.query('COMMIT');
      
      console.log(`✅ Created AI Tip Tracker position: ${ticker} @ $${entryPrice} (ID: ${positionId})`);
      
      return positionId;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error creating AI Tip Tracker position:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Update all open positions with current prices (OPTIMIZED WITH BATCH FETCHING)
   */
  async updateAllPositions(): Promise<void> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT id, ticker, entry_price, shares, recommendation_type,
               entry_date, ai_prediction_days, ai_prediction_pct
        FROM ai_tip_tracker
        WHERE status = 'OPEN'
      `);
      
      const positions = result.rows;
      console.log(`🔄 Updating ${positions.length} open positions with multi-API service...`);
      
      // Get all tickers
      const tickers = positions.map(p => p.ticker);
      
      // Fetch all prices in batch (much faster!)
      const pricesMap = await marketDataService.getMultiplePrices(tickers);
      
      console.log(`📊 Fetched ${pricesMap.size}/${tickers.length} prices`);
      
      // Update each position
      for (const position of positions) {
        try {
          const priceData = pricesMap.get(position.ticker);
          
          if (!priceData) {
            console.warn(`⚠️ No price data for ${position.ticker}`);
            continue;
          }
          
          const currentPrice = priceData.price;
          
          let pnlMultiplier = 1;
          if (position.recommendation_type === 'SHORT') {
            pnlMultiplier = -1;
          }
          
          const currentValue = position.shares * currentPrice;
          const currentPnl = (currentValue - 100) * pnlMultiplier;
          const currentPnlPct = (currentPnl / 100) * 100;
          const daysHeld = Math.floor((Date.now() - new Date(position.entry_date).getTime()) / (1000 * 60 * 60 * 24));
          
          await client.query(`
            UPDATE ai_tip_tracker
            SET current_price = $1, current_value = $2, current_pnl = $3,
                current_pnl_pct = $4, days_held = $5, last_price_update = NOW()
            WHERE id = $6
          `, [currentPrice, currentValue, currentPnl, currentPnlPct, daysHeld, position.id]);
          
          await client.query(`
            INSERT INTO ai_tip_tracker_daily_prices (
              tracker_id, date, close_price, position_value, pnl, pnl_pct, days_held
            ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6)
            ON CONFLICT (tracker_id, date) DO UPDATE
            SET close_price = $2, position_value = $3, pnl = $4, pnl_pct = $5, days_held = $6
          `, [position.id, currentPrice, currentValue, currentPnl, currentPnlPct, daysHeld]);
          
          console.log(`✅ ${position.ticker}: $${currentPrice.toFixed(2)} | P/L: $${currentPnl.toFixed(2)} (${priceData.source})`);
          
        } catch (error) {
          console.error(`Error updating position ${position.id}:`, error);
        }
      }
      
      await this.calculateSummaryStatistics();
      console.log(`✅ All positions updated with latest prices`);
      
    } catch (error) {
      console.error('❌ Error updating positions:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Update a single position with current price
   */
  async updatePosition(positionId: number, ticker: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      const currentPrice = await fetchStockPrice(ticker);
      
      if (!currentPrice) {
        console.warn(`⚠️ Could not fetch price for ${ticker}`);
        return;
      }
      
      const result = await client.query(`
        SELECT entry_price, shares, entry_date, recommendation_type
        FROM ai_tip_tracker WHERE id = $1
      `, [positionId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Position ${positionId} not found`);
      }
      
      const { entry_price, shares, entry_date, recommendation_type } = result.rows[0];
      
      let pnlMultiplier = 1;
      if (recommendation_type === 'SHORT') {
        pnlMultiplier = -1;
      }
      
      const currentValue = shares * currentPrice;
      const currentPnl = (currentValue - 100) * pnlMultiplier;
      const currentPnlPct = (currentPnl / 100) * 100;
      const daysHeld = Math.floor((Date.now() - new Date(entry_date).getTime()) / (1000 * 60 * 60 * 24));
      
      await client.query(`
        UPDATE ai_tip_tracker
        SET current_price = $1, current_value = $2, current_pnl = $3,
            current_pnl_pct = $4, days_held = $5, last_price_update = NOW()
        WHERE id = $6
      `, [currentPrice, currentValue, currentPnl, currentPnlPct, daysHeld, positionId]);
      
      await client.query(`
        INSERT INTO ai_tip_tracker_daily_prices (
          tracker_id, date, close_price, position_value, pnl, pnl_pct, days_held
        ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6)
        ON CONFLICT (tracker_id, date) DO UPDATE
        SET close_price = $2, position_value = $3, pnl = $4, pnl_pct = $5, days_held = $6
      `, [positionId, currentPrice, currentValue, currentPnl, currentPnlPct, daysHeld]);
      
      console.log(`✅ Updated ${ticker}: $${currentPrice} | P/L: $${currentPnl.toFixed(2)}`);
      
    } catch (error) {
      console.error(`❌ Error updating position ${positionId}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Close a position
   */
  async closePosition(
    positionId: number,
    exitReason: string,
    exitTriggeredBy: string = 'AI Signal'
  ): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const result = await client.query(`
        SELECT ticker, entry_price, entry_date, shares, recommendation_type,
               current_price, current_pnl, current_pnl_pct, days_held,
               ai_prediction_pct, ai_prediction_days
        FROM ai_tip_tracker
        WHERE id = $1 AND status = 'OPEN'
      `, [positionId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Open position ${positionId} not found`);
      }
      
      const position = result.rows[0];
      const exitPrice = await fetchStockPrice(position.ticker) || position.current_price;
      
      let pnlMultiplier = 1;
      if (position.recommendation_type === 'SHORT') {
        pnlMultiplier = -1;
      }
      
      const finalValue = position.shares * exitPrice;
      const finalPnl = (finalValue - 100) * pnlMultiplier;
      const finalPnlPct = (finalPnl / 100) * 100;
      
      const predictionAccuracyDirection = 
        (position.ai_prediction_pct > 0 && finalPnl > 0) ||
        (position.ai_prediction_pct < 0 && finalPnl < 0);
      
      const predictionAccuracyMagnitude = position.ai_prediction_pct
        ? Math.abs(finalPnlPct - position.ai_prediction_pct)
        : null;
      
      const predictionAccuracyTiming = position.ai_prediction_days
        ? position.days_held <= position.ai_prediction_days
        : null;
      
      const beatPrediction = position.ai_prediction_pct
        ? Math.abs(finalPnlPct) > Math.abs(position.ai_prediction_pct)
        : null;
      
      await client.query(`
        UPDATE ai_tip_tracker
        SET status = 'CLOSED', exit_price = $1, exit_date = NOW(),
            exit_time = CURRENT_TIME, exit_reason = $2, exit_triggered_by = $3,
            final_value = $4, final_pnl = $5, final_pnl_pct = $6,
            total_days_held = $7, prediction_accuracy_direction = $8,
            prediction_accuracy_magnitude = $9, prediction_accuracy_timing = $10,
            beat_prediction = $11
        WHERE id = $12
      `, [
        exitPrice, exitReason, exitTriggeredBy, finalValue, finalPnl,
        finalPnlPct, position.days_held, predictionAccuracyDirection,
        predictionAccuracyMagnitude, predictionAccuracyTiming, beatPrediction,
        positionId
      ]);
      
      await client.query('COMMIT');
      
      const emoji = finalPnl > 0 ? '✅' : '❌';
      console.log(`${emoji} Closed ${position.ticker}: $${finalPnl.toFixed(2)} (${finalPnlPct.toFixed(2)}%)`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error closing position:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get all open positions
   */
  async getOpenPositions(): Promise<TrackerPosition[]> {
    const result = await pool.query(`
      SELECT id, ticker, company_name, recommendation_type,
             entry_price, entry_date, shares, status,
             current_price, current_pnl, current_pnl_pct, days_held,
             ai_confidence, ai_prediction_pct, ai_prediction_days,
             ai_reasoning, ai_thesis
      FROM ai_tip_tracker
      WHERE status = 'OPEN'
      ORDER BY entry_date DESC
    `);
    
    return result.rows;
  }
  
  /**
   * Get closed positions
   */
  async getClosedPositions(limit: number = 50): Promise<any[]> {
    const result = await pool.query(`
      SELECT id, ticker, company_name, recommendation_type,
             entry_price, entry_date, exit_price, exit_date,
             final_pnl, final_pnl_pct, total_days_held,
             ai_confidence, ai_prediction_pct, ai_reasoning,
             prediction_accuracy_direction, prediction_accuracy_magnitude,
             prediction_accuracy_timing, beat_prediction, exit_reason
      FROM ai_tip_tracker
      WHERE status = 'CLOSED'
      ORDER BY exit_date DESC
      LIMIT $1
    `, [limit]);
    
    return result.rows;
  }
  
  /**
   * Get performance summary
   */
  async getPerformanceSummary(periodType: string = 'ALL_TIME'): Promise<any> {
    const result = await pool.query(`
      SELECT * FROM ai_tip_tracker_summary
      WHERE period_type = $1
      ORDER BY calculated_at DESC
      LIMIT 1
    `, [periodType]);
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    await this.calculateSummaryStatistics();
    return this.getPerformanceSummary(periodType);
  }
  
  /**
   * Calculate and store summary statistics
   */
  async calculateSummaryStatistics(): Promise<void> {
    const client = await pool.connect();
    
    try {
      const allTimeStats = await client.query(`
        SELECT
          COUNT(*) as total_picks,
          COUNT(*) FILTER (WHERE status = 'OPEN') as open_positions,
          COUNT(*) FILTER (WHERE status = 'CLOSED') as closed_positions,
          COUNT(*) FILTER (WHERE status = 'CLOSED' AND final_pnl > 0) as winners,
          COUNT(*) FILTER (WHERE status = 'CLOSED' AND final_pnl <= 0) as losers,
          ROUND(
            COUNT(*) FILTER (WHERE status = 'CLOSED' AND final_pnl > 0)::NUMERIC /
            NULLIF(COUNT(*) FILTER (WHERE status = 'CLOSED'), 0) * 100, 2
          ) as win_rate,
          SUM(mock_investment) as total_invested,
          SUM(CASE WHEN status = 'OPEN' THEN current_value ELSE final_value END) as current_value,
          SUM(COALESCE(final_pnl, current_pnl)) as total_pnl,
          AVG(COALESCE(final_pnl_pct, current_pnl_pct)) as avg_return,
          AVG(final_pnl) FILTER (WHERE status = 'CLOSED' AND final_pnl > 0) as avg_win,
          AVG(final_pnl) FILTER (WHERE status = 'CLOSED' AND final_pnl <= 0) as avg_loss,
          AVG(COALESCE(total_days_held, days_held)) as avg_hold_days,
          COUNT(*) FILTER (WHERE prediction_accuracy_direction = true)::NUMERIC /
            NULLIF(COUNT(*) FILTER (WHERE status = 'CLOSED'), 0) * 100 as direction_accuracy
        FROM ai_tip_tracker
      `);
      
      const stats = allTimeStats.rows[0];
      
      const bestPick = await client.query(`
        SELECT ticker, final_pnl FROM ai_tip_tracker
        WHERE status = 'CLOSED' ORDER BY final_pnl DESC LIMIT 1
      `);
      
      const worstPick = await client.query(`
        SELECT ticker, final_pnl FROM ai_tip_tracker
        WHERE status = 'CLOSED' ORDER BY final_pnl ASC LIMIT 1
      `);
      
      await client.query(`
        INSERT INTO ai_tip_tracker_summary (
          period_type, period_start, period_end,
          total_picks, open_positions, closed_positions,
          winners, losers, win_rate,
          total_invested, current_value, total_pnl, avg_return_per_pick,
          avg_win_amount, avg_loss_amount,
          best_pick_ticker, best_pick_pnl,
          worst_pick_ticker, worst_pick_pnl,
          direction_accuracy_pct, avg_hold_days
        ) VALUES (
          'ALL_TIME', NULL, NULL,
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18
        )
        ON CONFLICT (period_type, period_start, period_end)
        DO UPDATE SET
          total_picks = $1, open_positions = $2, closed_positions = $3,
          winners = $4, losers = $5, win_rate = $6,
          total_invested = $7, current_value = $8, total_pnl = $9,
          avg_return_per_pick = $10, avg_win_amount = $11, avg_loss_amount = $12,
          best_pick_ticker = $13, best_pick_pnl = $14,
          worst_pick_ticker = $15, worst_pick_pnl = $16,
          direction_accuracy_pct = $17, avg_hold_days = $18,
          calculated_at = NOW()
      `, [
        stats.total_picks, stats.open_positions, stats.closed_positions,
        stats.winners, stats.losers, stats.win_rate,
        stats.total_invested, stats.current_value, stats.total_pnl,
        stats.avg_return, stats.avg_win, stats.avg_loss,
        bestPick.rows[0]?.ticker, bestPick.rows[0]?.final_pnl,
        worstPick.rows[0]?.ticker, worstPick.rows[0]?.final_pnl,
        stats.direction_accuracy, stats.avg_hold_days
      ]);
      
      console.log('✅ Summary statistics calculated');
      
    } catch (error) {
      console.error('❌ Error calculating summary statistics:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Check if any positions should be closed based on AI criteria
   */
  async checkExitSignals(): Promise<void> {
    const openPositions = await this.getOpenPositions();
    
    for (const position of openPositions) {
      try {
        // Check stop loss (down 7%)
        if (position.currentPnlPct && position.currentPnlPct <= -7) {
          await this.closePosition(position.id, 'Stop Loss Hit', 'Auto Stop');
          continue;
        }
        
        // Check if target hit
        if (position.aiPredictionPct && position.currentPnlPct && 
            position.currentPnlPct >= position.aiPredictionPct) {
          await this.closePosition(position.id, 'Target Hit', 'AI Signal');
          continue;
        }
        
        // Check if held too long (3x predicted timeframe)
        if (position.aiPredictionDays && position.daysHeld >= position.aiPredictionDays * 3) {
          await this.closePosition(position.id, 'Time Decay', 'Auto Exit');
          continue;
        }
        
      } catch (error) {
        console.error(`Error checking exit signals for position ${position.id}:`, error);
      }
    }
  }
  
  /**
   * Helper: Convert timeframe string to days
   */
  private convertTimeframeToDays(timeframe?: string): number | null {
    if (!timeframe) return null;
    
    const lower = timeframe.toLowerCase();
    
    if (lower.includes('day')) {
      const match = lower.match(/(\d+)/);
      return match ? parseInt(match[1]) : null;
    }
    if (lower.includes('week')) {
      const match = lower.match(/(\d+)/);
      return match ? parseInt(match[1]) * 7 : null;
    }
    if (lower.includes('month')) {
      const match = lower.match(/(\d+)/);
      return match ? parseInt(match[1]) * 30 : null;
    }
    
    return null;
  }
}

export default new AITipTrackerService();

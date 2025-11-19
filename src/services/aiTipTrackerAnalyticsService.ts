// backend/src/services/aiTipTrackerAnalyticsService.ts
// Advanced Analytics for AI Tip Tracker

import pool from '../db/index.js';

interface MonthlyPerformance {
  month: string;
  total_picks: number;
  closed_picks: number;
  winners: number;
  win_rate: number;
  total_pnl: number;
  avg_pnl_pct: number;
}

interface ConfidenceBracket {
  bracket: string;
  min_confidence: number;
  max_confidence: number;
  total_picks: number;
  winners: number;
  win_rate: number;
  avg_pnl_pct: number;
  total_pnl: number;
}

interface SectorPerformance {
  sector: string;
  total_picks: number;
  closed_picks: number;
  winners: number;
  win_rate: number;
  avg_pnl_pct: number;
  total_pnl: number;
  best_pick: string;
  best_pick_pnl: number;
}

interface TimeframePerformance {
  timeframe: string;
  total_picks: number;
  winners: number;
  win_rate: number;
  avg_pnl_pct: number;
  avg_days_held: number;
}

interface TopPerformer {
  rank: number;
  ticker: string;
  company_name: string;
  entry_date: Date;
  exit_date: Date;
  days_held: number;
  pnl_pct: number;
  pnl_amount: number;
  ai_confidence: number;
  recommendation_type: string;
}

interface RecentWin {
  ticker: string;
  company_name: string;
  exit_date: Date;
  pnl_pct: number;
  pnl_amount: number;
  days_held: number;
  ai_confidence: number;
}

class AITipTrackerAnalyticsService {
  
  /**
   * Get monthly performance trends (last 12 months)
   */
  async getMonthlyTrends(): Promise<MonthlyPerformance[]> {
    const result = await pool.query(`
      WITH monthly_data AS (
        SELECT 
          TO_CHAR(entry_date, 'YYYY-MM') as month,
          COUNT(*) as total_picks,
          COUNT(*) FILTER (WHERE status = 'CLOSED') as closed_picks,
          COUNT(*) FILTER (WHERE status = 'CLOSED' AND final_pnl > 0) as winners,
          COALESCE(SUM(final_pnl) FILTER (WHERE status = 'CLOSED'), 0) as total_pnl,
          COALESCE(AVG(final_pnl_pct) FILTER (WHERE status = 'CLOSED'), 0) as avg_pnl_pct
        FROM ai_tip_tracker
        WHERE entry_date >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR(entry_date, 'YYYY-MM')
      )
      SELECT 
        month,
        total_picks,
        closed_picks,
        winners,
        CASE 
          WHEN closed_picks > 0 THEN ROUND((winners::numeric / closed_picks * 100), 2)
          ELSE 0 
        END as win_rate,
        ROUND(total_pnl::numeric, 2) as total_pnl,
        ROUND(avg_pnl_pct::numeric, 2) as avg_pnl_pct
      FROM monthly_data
      ORDER BY month DESC
      LIMIT 12
    `);
    
    return result.rows;
  }

  /**
   * Get performance by confidence bracket
   */
  async getConfidenceBrackets(): Promise<ConfidenceBracket[]> {
    const result = await pool.query(`
      WITH confidence_brackets AS (
        SELECT 
          CASE 
            WHEN ai_confidence >= 90 THEN '90-100%'
            WHEN ai_confidence >= 80 THEN '80-89%'
            WHEN ai_confidence >= 70 THEN '70-79%'
            ELSE '<70%'
          END as bracket,
          CASE 
            WHEN ai_confidence >= 90 THEN 90
            WHEN ai_confidence >= 80 THEN 80
            WHEN ai_confidence >= 70 THEN 70
            ELSE 0
          END as min_confidence,
          CASE 
            WHEN ai_confidence >= 90 THEN 100
            WHEN ai_confidence >= 80 THEN 89
            WHEN ai_confidence >= 70 THEN 79
            ELSE 69
          END as max_confidence,
          COUNT(*) FILTER (WHERE status = 'CLOSED') as total_picks,
          COUNT(*) FILTER (WHERE status = 'CLOSED' AND final_pnl > 0) as winners,
          COALESCE(AVG(final_pnl_pct) FILTER (WHERE status = 'CLOSED'), 0) as avg_pnl_pct,
          COALESCE(SUM(final_pnl) FILTER (WHERE status = 'CLOSED'), 0) as total_pnl
        FROM ai_tip_tracker
        GROUP BY 
          CASE 
            WHEN ai_confidence >= 90 THEN '90-100%'
            WHEN ai_confidence >= 80 THEN '80-89%'
            WHEN ai_confidence >= 70 THEN '70-79%'
            ELSE '<70%'
          END,
          CASE 
            WHEN ai_confidence >= 90 THEN 90
            WHEN ai_confidence >= 80 THEN 80
            WHEN ai_confidence >= 70 THEN 70
            ELSE 0
          END,
          CASE 
            WHEN ai_confidence >= 90 THEN 100
            WHEN ai_confidence >= 80 THEN 89
            WHEN ai_confidence >= 70 THEN 79
            ELSE 69
          END
      )
      SELECT 
        bracket,
        min_confidence,
        max_confidence,
        total_picks,
        winners,
        CASE 
          WHEN total_picks > 0 THEN ROUND((winners::numeric / total_picks * 100), 2)
          ELSE 0 
        END as win_rate,
        ROUND(avg_pnl_pct::numeric, 2) as avg_pnl_pct,
        ROUND(total_pnl::numeric, 2) as total_pnl
      FROM confidence_brackets
      WHERE total_picks > 0
      ORDER BY min_confidence DESC
    `);
    
    return result.rows;
  }

  /**
   * Get performance by sector
   */
  async getSectorPerformance(): Promise<SectorPerformance[]> {
    const result = await pool.query(`
      WITH sector_stats AS (
        SELECT 
          COALESCE(sector, 'Unknown') as sector,
          COUNT(*) as total_picks,
          COUNT(*) FILTER (WHERE status = 'CLOSED') as closed_picks,
          COUNT(*) FILTER (WHERE status = 'CLOSED' AND final_pnl > 0) as winners,
          COALESCE(AVG(final_pnl_pct) FILTER (WHERE status = 'CLOSED'), 0) as avg_pnl_pct,
          COALESCE(SUM(final_pnl) FILTER (WHERE status = 'CLOSED'), 0) as total_pnl
        FROM ai_tip_tracker
        GROUP BY COALESCE(sector, 'Unknown')
      ),
      sector_best AS (
        SELECT DISTINCT ON (sector)
          COALESCE(sector, 'Unknown') as sector,
          ticker as best_pick,
          final_pnl_pct as best_pick_pnl
        FROM ai_tip_tracker
        WHERE status = 'CLOSED'
        ORDER BY sector, final_pnl_pct DESC
      )
      SELECT 
        s.sector,
        s.total_picks,
        s.closed_picks,
        s.winners,
        CASE 
          WHEN s.closed_picks > 0 THEN ROUND((s.winners::numeric / s.closed_picks * 100), 2)
          ELSE 0 
        END as win_rate,
        ROUND(s.avg_pnl_pct::numeric, 2) as avg_pnl_pct,
        ROUND(s.total_pnl::numeric, 2) as total_pnl,
        COALESCE(b.best_pick, 'N/A') as best_pick,
        COALESCE(ROUND(b.best_pick_pnl::numeric, 2), 0) as best_pick_pnl
      FROM sector_stats s
      LEFT JOIN sector_best b ON s.sector = b.sector
      WHERE s.closed_picks > 0
      ORDER BY s.total_pnl DESC
    `);
    
    return result.rows;
  }

  /**
   * Get performance by timeframe
   */
  async getTimeframePerformance(): Promise<TimeframePerformance[]> {
    const result = await pool.query(`
      SELECT 
        COALESCE(ai_prediction_timeframe, 'Unknown') as timeframe,
        COUNT(*) FILTER (WHERE status = 'CLOSED') as total_picks,
        COUNT(*) FILTER (WHERE status = 'CLOSED' AND final_pnl > 0) as winners,
        CASE 
          WHEN COUNT(*) FILTER (WHERE status = 'CLOSED') > 0 
          THEN ROUND((COUNT(*) FILTER (WHERE status = 'CLOSED' AND final_pnl > 0)::numeric / 
               COUNT(*) FILTER (WHERE status = 'CLOSED') * 100), 2)
          ELSE 0 
        END as win_rate,
        ROUND(COALESCE(AVG(final_pnl_pct) FILTER (WHERE status = 'CLOSED'), 0)::numeric, 2) as avg_pnl_pct,
        ROUND(COALESCE(AVG(total_days_held) FILTER (WHERE status = 'CLOSED'), 0)::numeric, 1) as avg_days_held
      FROM ai_tip_tracker
      GROUP BY COALESCE(ai_prediction_timeframe, 'Unknown')
      HAVING COUNT(*) FILTER (WHERE status = 'CLOSED') > 0
      ORDER BY avg_pnl_pct DESC
    `);
    
    return result.rows;
  }

  /**
   * Get top 10 performers (all time)
   */
  async getTopPerformers(limit: number = 10): Promise<TopPerformer[]> {
    const result = await pool.query(`
      SELECT 
        ROW_NUMBER() OVER (ORDER BY final_pnl_pct DESC) as rank,
        ticker,
        company_name,
        entry_date,
        exit_date,
        total_days_held as days_held,
        ROUND(final_pnl_pct::numeric, 2) as pnl_pct,
        ROUND(final_pnl::numeric, 2) as pnl_amount,
        ai_confidence,
        recommendation_type
      FROM ai_tip_tracker
      WHERE status = 'CLOSED' AND final_pnl_pct IS NOT NULL
      ORDER BY final_pnl_pct DESC
      LIMIT $1
    `, [limit]);
    
    return result.rows;
  }

  /**
   * Get worst 10 performers (all time)
   */
  async getWorstPerformers(limit: number = 10): Promise<TopPerformer[]> {
    const result = await pool.query(`
      SELECT 
        ROW_NUMBER() OVER (ORDER BY final_pnl_pct ASC) as rank,
        ticker,
        company_name,
        entry_date,
        exit_date,
        total_days_held as days_held,
        ROUND(final_pnl_pct::numeric, 2) as pnl_pct,
        ROUND(final_pnl::numeric, 2) as pnl_amount,
        ai_confidence,
        recommendation_type
      FROM ai_tip_tracker
      WHERE status = 'CLOSED' AND final_pnl_pct IS NOT NULL
      ORDER BY final_pnl_pct ASC
      LIMIT $1
    `, [limit]);
    
    return result.rows;
  }

  /**
   * Get recent wins (last 7 days)
   */
  async getRecentWins(days: number = 7): Promise<RecentWin[]> {
    const result = await pool.query(`
      SELECT 
        ticker,
        company_name,
        exit_date,
        ROUND(final_pnl_pct::numeric, 2) as pnl_pct,
        ROUND(final_pnl::numeric, 2) as pnl_amount,
        total_days_held as days_held,
        ai_confidence
      FROM ai_tip_tracker
      WHERE status = 'CLOSED' 
        AND final_pnl > 0
        AND exit_date >= NOW() - INTERVAL '1 day' * $1
      ORDER BY exit_date DESC, final_pnl_pct DESC
      LIMIT 20
    `, [days]);
    
    return result.rows;
  }

  /**
   * Get ROI projections based on historical data
   */
  async getROIProjections() {
    try {
      const result = await pool.query(`
        WITH historical_performance AS (
          SELECT 
            COUNT(*) as total_closed,
            AVG(final_pnl_pct) as avg_return_pct,
            STDDEV(final_pnl_pct) as stddev_return,
            COUNT(*) FILTER (WHERE final_pnl > 0) as winners,
            AVG(total_days_held) as avg_hold_days
          FROM ai_tip_tracker
          WHERE status = 'CLOSED'
        )
        SELECT 
          total_closed,
          ROUND(COALESCE(avg_return_pct, 0)::numeric, 2) as avg_return_pct,
          ROUND(COALESCE(stddev_return, 0)::numeric, 2) as stddev_return,
          CASE 
            WHEN total_closed > 0 THEN ROUND((winners::numeric / total_closed * 100), 2)
            ELSE 0
          END as win_rate,
          ROUND(COALESCE(avg_hold_days, 0)::numeric, 1) as avg_hold_days,
          -- Projections for $1000 investment
          ROUND((1000 * (1 + COALESCE(avg_return_pct, 0)/100))::numeric, 2) as projected_value_1k,
          ROUND((1000 * COALESCE(avg_return_pct, 0)/100)::numeric, 2) as projected_gain_1k,
          -- Projections for $10000 investment
          ROUND((10000 * (1 + COALESCE(avg_return_pct, 0)/100))::numeric, 2) as projected_value_10k,
          ROUND((10000 * COALESCE(avg_return_pct, 0)/100)::numeric, 2) as projected_gain_10k
        FROM historical_performance
      `);
      
      return result.rows[0] || {
        total_closed: 0,
        avg_return_pct: 0,
        stddev_return: 0,
        win_rate: 0,
        avg_hold_days: 0,
        projected_value_1k: 1000,
        projected_gain_1k: 0,
        projected_value_10k: 10000,
        projected_gain_10k: 0
      };
    } catch (error) {
      console.error('Error in getROIProjections:', error);
      return null;
    }
  }

  /**
   * Get benchmark comparison (vs S&P 500)
   */
  async getBenchmarkComparison() {
    try {
      const result = await pool.query(`
        WITH tracker_performance AS (
          SELECT 
            AVG(final_pnl_pct) as avg_return,
            COUNT(*) FILTER (WHERE final_pnl > 0) * 100.0 / NULLIF(COUNT(*), 0) as win_rate
          FROM ai_tip_tracker
          WHERE status = 'CLOSED'
        )
        SELECT 
          ROUND(COALESCE(avg_return, 0)::numeric, 2) as tracker_avg_return,
          ROUND(COALESCE(win_rate, 0)::numeric, 2) as tracker_win_rate,
          8.5 as sp500_avg_annual_return,
          -- Calculate how much better/worse than S&P 500
          ROUND((COALESCE(avg_return, 0) - 8.5)::numeric, 2) as vs_sp500_diff,
          CASE 
            WHEN COALESCE(avg_return, 0) > 8.5 THEN 'OUTPERFORMING'
            WHEN COALESCE(avg_return, 0) < 8.5 THEN 'UNDERPERFORMING'
            ELSE 'MATCHING'
          END as vs_sp500_status
        FROM tracker_performance
      `);
      
      return result.rows[0] || {
        tracker_avg_return: 0,
        tracker_win_rate: 0,
        sp500_avg_annual_return: 8.5,
        vs_sp500_diff: -8.5,
        vs_sp500_status: 'UNDERPERFORMING'
      };
    } catch (error) {
      console.error('Error in getBenchmarkComparison:', error);
      return null;
    }
  }

  /**
   * Get quick stats for dashboard
   */
  async getQuickStats() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_picks,
        COUNT(*) FILTER (WHERE status = 'OPEN') as open_positions,
        COUNT(*) FILTER (WHERE status = 'CLOSED') as closed_positions,
        COUNT(*) FILTER (WHERE status = 'CLOSED' AND final_pnl > 0) as winners,
        COUNT(*) FILTER (WHERE status = 'CLOSED' AND final_pnl <= 0) as losers,
        ROUND((COUNT(*) FILTER (WHERE status = 'CLOSED' AND final_pnl > 0)::numeric / 
               NULLIF(COUNT(*) FILTER (WHERE status = 'CLOSED'), 0) * 100), 2) as win_rate,
        ROUND(COALESCE(SUM(final_pnl) FILTER (WHERE status = 'CLOSED'), 0)::numeric, 2) as total_pnl,
        ROUND(COALESCE(AVG(final_pnl_pct) FILTER (WHERE status = 'CLOSED'), 0)::numeric, 2) as avg_return_pct,
        ROUND(COALESCE(SUM(current_pnl) FILTER (WHERE status = 'OPEN'), 0)::numeric, 2) as open_pnl
      FROM ai_tip_tracker
    `);
    
    return result.rows[0];
  }
}

export default new AITipTrackerAnalyticsService();

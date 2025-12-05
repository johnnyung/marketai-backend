import pool from '../db/index.js';

interface SectorBias {
  sector: string;
  bias_multiplier: number;
  win_rate: number;
  edge_score: number; // 0-100 score of system competence
  reason: string;
}

class SipeLearningService {
  
  private cache: Record<string, SectorBias> = {};
  private lastUpdate = 0;

  /**
   * Get the bias multiplier for a specific sector based on past performance
   */
  async getSectorBias(sector: string): Promise<SectorBias> {
    await this.ensureCache();
    
    // Normalize sector string (FMP sector names can vary slightly)
    const cleanSector = sector || 'Unknown';
    
    const cached = this.cache[cleanSector];
    if (cached) return cached;

    return {
        sector: cleanSector,
        bias_multiplier: 1.0,
        win_rate: 50,
        edge_score: 50,
        reason: "No sector history available"
    };
  }

  /**
   * LEARN: Analyze prediction_results table to update sector biases
   * (Runs nightly via Cron)
   */
  async runLearningCycle() {
    console.log("      🏭 SIPE: Updating Sector Competence Models...");
    
    try {
      // 1. Aggregating Performance by Sector
      // Note: We join with ai_stock_tips to get the sector if not in prediction_results directly
      // Assuming prediction_results has ticker, we map ticker -> sector via a view or just lookup
      // For V1, we will assume we stored 'sector' in ai_stock_tips and join on ticker
      
      // Complex Query to calc performance metrics
      const res = await pool.query(`
        WITH outcomes AS (
            SELECT
                t.sector,
                COUNT(*) as total,
                SUM(CASE WHEN p.result_outcome = 'WIN' THEN 1 ELSE 0 END) as wins,
                AVG(p.performance_pnl) as avg_return
            FROM prediction_results p
            JOIN ai_stock_tips t ON p.ticker = t.ticker AND t.created_at BETWEEN p.date_predicted - INTERVAL '1 hour' AND p.date_predicted + INTERVAL '1 hour'
            WHERE p.result_outcome IN ('WIN', 'LOSS')
            AND p.created_at > NOW() - INTERVAL '180 days'
            GROUP BY t.sector
        )
        SELECT * FROM outcomes WHERE total >= 5
      `);

      for (const row of res.rows) {
          const sector = row.sector;
          const winRate = (parseInt(row.wins) / parseInt(row.total)) * 100;
          const avgPnl = parseFloat(row.avg_return);
          
          // Logic: Determine Multiplier
          let mult = 1.0;
          
          if (winRate > 65) mult = 1.15;      // Strong Edge
          else if (winRate > 55) mult = 1.05; // Slight Edge
          else if (winRate < 35) mult = 0.85; // Strong Weakness
          else if (winRate < 45) mult = 0.95; // Slight Weakness

          // Penalty for negative expectancy even if winrate is okay
          if (avgPnl < 0) mult = Math.min(mult, 0.95);

          await pool.query(`
            INSERT INTO sector_bias_learning_snapshots (sector, win_rate, avg_pnl, bias_multiplier, sample_size, last_updated)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (sector) DO UPDATE SET
            win_rate = $2, avg_pnl = $3, bias_multiplier = $4, sample_size = $5, last_updated = NOW()
          `, [sector, winRate, avgPnl, mult, row.total]);
          
          console.log(`      -> Learned ${sector}: WR ${winRate.toFixed(1)}% -> x${mult.toFixed(2)}`);
      }
      
      // Invalidate cache
      this.lastUpdate = 0;

    } catch (e: any) {
      console.error("SIPE Learning Failed:", e.message);
    }
  }

  private async ensureCache() {
    if (Date.now() - this.lastUpdate < 3600000) return; // 1h cache
    try {
        const res = await pool.query("SELECT * FROM sector_bias_learning_snapshots");
        res.rows.forEach(r => {
            this.cache[r.sector] = {
                sector: r.sector,
                bias_multiplier: parseFloat(r.bias_multiplier),
                win_rate: parseFloat(r.win_rate),
                edge_score: parseFloat(r.win_rate), // Proxy for edge
                reason: `System Win Rate in ${r.sector} is ${parseFloat(r.win_rate).toFixed(1)}%`
            };
        });
        this.lastUpdate = Date.now();
    } catch (e) {}
  }
}

export default new SipeLearningService();

import pool from '../db/index.js';

interface EngineWeights {
  momentum: number;
  value: number;
  catalyst: number;
  shadow: number;
  insider: number;
  gamma: number;
  narrative: number;
  fsi: number;
}

class WdiwaAttributionService {
  
  private cache: EngineWeights | null = null;
  private lastUpdate = 0;

  /**
   * Get current engine weights based on attribution learning
   */
  async getEngineWeights(): Promise<EngineWeights> {
    // Cache for 4 hours
    if (this.cache && (Date.now() - this.lastUpdate < 14400000)) return this.cache;

    try {
        const res = await pool.query(`
            SELECT engine_weights
            FROM attribution_learning_snapshots
            ORDER BY snapshot_date DESC, created_at DESC
            LIMIT 1
        `);

        const weights = res.rows[0]?.engine_weights || this.getDefaultWeights();
        this.cache = weights;
        this.lastUpdate = Date.now();
        return weights;

    } catch (e) {
        return this.getDefaultWeights();
    }
  }

  /**
   * LEARN: Analyze closed WINNING trades to attribute credit
   * Runs nightly
   */
  async runAttributionCycle() {
      console.log("      🕵️  WDIWA: Forensic Analysis of Winning Trades...");

      try {
          // 1. Get Recent Wins (Last 30 days)
          const wins = await pool.query(`
              SELECT id, ticker, agent_signals
              FROM prediction_results
              WHERE result_outcome = 'WIN'
              AND date_predicted > NOW() - INTERVAL '30 days'
          `);

          if (wins.rows.length < 5) {
              console.log("      ⚠️  Not enough wins to calibrate weights.");
              return;
          }

          // 2. Calculate Attribution Scores
          const scores: Record<string, number> = {
              momentum: 0, value: 0, catalyst: 0, shadow: 0,
              insider: 0, gamma: 0, narrative: 0, fsi: 0
          };
          
          let totalAttributed = 0;

          for (const trade of wins.rows) {
              const signals = trade.agent_signals || {};
              
              // Which engine signaled 'BUY' or 'BULL'?
              if (signals.momentum?.verdict === 'BULL') scores.momentum++;
              if (signals.value?.verdict === 'BULL') scores.value++;
              if (signals.catalyst?.verdict === 'BULL') scores.catalyst++;
              if (signals.shadow?.bias === 'ACCUMULATION') scores.shadow++;
              if (signals.insider?.classification === 'OPPORTUNISTIC') scores.insider++;
              if (signals.gamma?.volatility_regime === 'SUPPRESSED') scores.gamma++;
              if ((signals.narrative?.pressure_score || 0) > 60) scores.narrative++;
              if (signals.fsi?.traffic_light === 'GREEN') scores.fsi++;
              
              totalAttributed++;
          }

          // 3. Normalize into Multipliers
          // Average contribution rate per engine
          // Base is 1.0. If engine contributed to >50% of wins, boost > 1.0.
          const newWeights = this.getDefaultWeights();
          let bestDriver = 'NONE';
          let maxScore = 0;

          for (const key of Object.keys(scores)) {
              const k = key as keyof EngineWeights;
              const winContributionRate = scores[key] / wins.rows.length; // 0 to 1
              
              // Adjustment Logic:
              // < 20% Contribution -> 0.9 (Penalty)
              // > 50% Contribution -> 1.1 (Boost)
              // > 75% Contribution -> 1.25 (Super Boost)
              
              if (winContributionRate > 0.75) newWeights[k] = 1.25;
              else if (winContributionRate > 0.50) newWeights[k] = 1.1;
              else if (winContributionRate < 0.20) newWeights[k] = 0.9;
              else newWeights[k] = 1.0;

              if (scores[key] > maxScore) {
                  maxScore = scores[key];
                  bestDriver = key;
              }
              
              // console.log(`      -> ${key}: Contrib ${(winContributionRate*100).toFixed(0)}% -> x${newWeights[k]}`);
          }

          // 4. Save Snapshot
          await pool.query(`
              INSERT INTO attribution_learning_snapshots (engine_weights, primary_win_driver, total_wins_analyzed, created_at)
              VALUES ($1, $2, $3, NOW())
          `, [JSON.stringify(newWeights), bestDriver, wins.rows.length]);

          console.log(`      ✅ WDIWA: Updated Weights. Primary Driver: ${bestDriver}`);
          
          // Invalidate cache
          this.cache = null;

      } catch (e: any) {
          console.error("WDIWA Error:", e.message);
      }
  }

  private getDefaultWeights(): EngineWeights {
      return {
          momentum: 1.0, value: 1.0, catalyst: 1.0, shadow: 1.0,
          insider: 1.0, gamma: 1.0, narrative: 1.0, fsi: 1.0
      };
  }
}

export default new WdiwaAttributionService();

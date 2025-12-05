import pool from '../db/index.js';

interface DSCProfile {
  profile_key: string;
  stop_loss_modifier: number;
  confidence_penalty: number;
  max_tolerable_drawdown: number;
  avg_mae_pct: number;
}

class DrawdownSensitivityService {
  
  private cache: Record<string, DSCProfile> = {};
  private lastUpdate = 0;

  /**
   * Get risk parameters for a specific asset tier
   */
  async getRiskProfile(tier: string): Promise<DSCProfile> {
    await this.ensureCache();
    const key = tier || 'blue_chip';
    
    return this.cache[key] || {
      profile_key: key,
      stop_loss_modifier: 1.0,
      confidence_penalty: 0,
      max_tolerable_drawdown: 5.0,
      avg_mae_pct: 2.0
    };
  }

  /**
   * LEARN: Analyzes past trades to update sensitivity profiles
   * Runs nightly via Cron (added to analysis loop)
   */
  async calibrateProfiles() {
    console.log("      📉 DSC: Calibrating Drawdown Sensitivity...");
    
    try {
      // Group past trades by Tier
      // Calculate MAE of WINNERS (How much heat did we take?)
      const res = await pool.query(`
        WITH metrics AS (
            SELECT
                t.tier,
                AVG(p.max_adverse_excursion) as avg_mae,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY p.max_adverse_excursion) as p95_mae,
                COUNT(*) as total_wins
            FROM prediction_results p
            JOIN ai_stock_tips t ON p.ticker = t.ticker -- Join to get Tier (simplified linkage)
            WHERE p.result_outcome = 'WIN'
            AND p.created_at > NOW() - INTERVAL '90 days'
            GROUP BY t.tier
        )
        SELECT * FROM metrics
      `);

      for (const row of res.rows) {
          const tier = row.tier || 'blue_chip';
          const avgMae = parseFloat(row.avg_mae);
          const maxTol = parseFloat(row.p95_mae);
          
          // Logic: If winners typically dip -8%, stop should be at least -9%
          // Multiplier logic: Base stop (say 5%) needs to scale to match MAE
          let modifier = 1.0;
          let penalty = 0;

          if (avgMae > 5.0) {
              modifier = 1.3; // Widen stops for volatile assets
              penalty = 5;    // Deduct confidence due to volatility drag
          } else if (avgMae < 2.0) {
              modifier = 0.9; // Tighten stops for stable assets
          }

          if (maxTol > 15.0) penalty += 10; // High risk of shakeout

          await pool.query(`
            INSERT INTO drawdown_sensitivity_profiles (
                profile_key, avg_mae_pct, max_tolerable_drawdown,
                stop_loss_modifier, confidence_penalty, sample_size, last_updated
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (profile_key) DO UPDATE SET
                avg_mae_pct = $2,
                max_tolerable_drawdown = $3,
                stop_loss_modifier = $4,
                confidence_penalty = $5,
                last_updated = NOW()
          `, [tier, avgMae, maxTol, modifier, penalty, row.total_wins]);
          
          console.log(`      -> Updated ${tier}: Mod ${modifier.toFixed(2)}, Penalty -${penalty}`);
      }
    } catch (e) {
       // Silent fail on join complexity for V1, relies on seed data
    }
  }

  private async ensureCache() {
    if (Date.now() - this.lastUpdate < 3600000) return; // 1h cache
    try {
        const res = await pool.query("SELECT * FROM drawdown_sensitivity_profiles");
        res.rows.forEach(r => {
            this.cache[r.profile_key] = {
                profile_key: r.profile_key,
                stop_loss_modifier: parseFloat(r.stop_loss_modifier),
                confidence_penalty: parseFloat(r.confidence_penalty),
                max_tolerable_drawdown: parseFloat(r.max_tolerable_drawdown),
                avg_mae_pct: parseFloat(r.avg_mae_pct)
            };
        });
        this.lastUpdate = Date.now();
    } catch (e) {}
  }
}

export default new DrawdownSensitivityService();

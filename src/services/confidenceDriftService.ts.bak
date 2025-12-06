import { pool } from '../db/index.js';

interface DriftMetrics {
  correction_factor: number;
  drift_bias: number;
  avg_confidence: number;
  actual_win_rate: number;
  status: 'STABLE' | 'INFLATED' | 'TIMID';
}

class ConfidenceDriftService {
  
  private cache: DriftMetrics | null = null;
  private lastUpdate = 0;

  /**
   * Get the current normalization factor
   */
  async getDriftCorrection(): Promise<DriftMetrics> {
    // Cache for 4 hours
    if (this.cache && (Date.now() - this.lastUpdate < 14400000)) return this.cache;

    try {
        const res = await pool.query(`
            SELECT correction_factor, drift_bias, avg_confidence_30d, avg_win_rate_30d
            FROM confidence_drift_snapshots
            ORDER BY snapshot_date DESC
            LIMIT 1
        `);

        const row = res.rows[0] || { correction_factor: 1.0, drift_bias: 0, avg_confidence_30d: 75, avg_win_rate_30d: 75 };
        
        let status: DriftMetrics['status'] = 'STABLE';
        if (row.correction_factor < 0.95) status = 'INFLATED';
        if (row.correction_factor > 1.05) status = 'TIMID';

        const metrics: DriftMetrics = {
            correction_factor: parseFloat(row.correction_factor),
            drift_bias: parseFloat(row.drift_bias),
            avg_confidence: parseFloat(row.avg_confidence_30d),
            actual_win_rate: parseFloat(row.avg_win_rate_30d),
            status
        };

        this.cache = metrics;
        this.lastUpdate = Date.now();
        return metrics;

    } catch (e) {
        return { correction_factor: 1.0, drift_bias: 0, avg_confidence: 75, actual_win_rate: 75, status: 'STABLE' };
    }
  }

  /**
   * LEARN: Analyze gap between Confidence and Reality
   * Runs nightly
   */
  async runCalibrationCycle() {
    console.log("      🌡️  CDC: Calibrating Confidence Thermostat...");

    try {
        // 1. Get Rolling Stats (Last 30 Days)
        // Join predictions with their original confidence
        const res = await pool.query(`
            SELECT
                AVG(confidence_at_prediction) as avg_conf,
                SUM(CASE WHEN result_outcome = 'WIN' THEN 1 ELSE 0 END)::numeric / COUNT(*) as win_rate,
                COUNT(*) as total
            FROM prediction_results
            WHERE date_predicted > NOW() - INTERVAL '30 days'
            AND result_outcome IN ('WIN', 'LOSS')
        `);

        if (parseInt(res.rows[0].total) < 10) {
            console.log("      ⚠️  Insufficient data for CDC calibration.");
            return;
        }

        const avgConf = parseFloat(res.rows[0].avg_conf);
        const winRate = parseFloat(res.rows[0].win_rate) * 100; // Convert to percentage
        
        // 2. Calculate Drift
        // Bias = Avg Confidence - Actual Win Rate
        // Positive Bias = Overconfident (Needs deflation)
        // Negative Bias = Underconfident (Needs inflation)
        const bias = avgConf - winRate;
        
        // 3. Determine Correction Factor
        // We apply a dampened correction to avoid swinging too wild
        // Factor = 1.0 - (Bias / 200) -> e.g. Bias +10 => 0.95 multiplier
        let factor = 1.0 - (bias / 200);
        
        // Safety Clamps (0.8x to 1.2x)
        factor = Math.max(0.8, Math.min(1.2, factor));

        // 4. Save Snapshot
        await pool.query(`
            INSERT INTO confidence_drift_snapshots (
                avg_confidence_30d, avg_win_rate_30d, drift_bias, correction_factor, sample_size, snapshot_date
            ) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
            ON CONFLICT (snapshot_date) DO UPDATE SET
                avg_confidence_30d = $1,
                avg_win_rate_30d = $2,
                drift_bias = $3,
                correction_factor = $4,
                sample_size = $5
        `, [avgConf, winRate, bias, factor, res.rows[0].total]);

        console.log(`      -> 📉 Bias: ${bias.toFixed(1)} (Conf ${avgConf.toFixed(1)}% vs Win ${winRate.toFixed(1)}%)`);
        console.log(`      -> 🔧 Correction Factor: x${factor.toFixed(3)}`);
        
        // Invalidate cache
        this.cache = null;

    } catch (e: any) {
        console.error("CDC Calibration Error:", e.message);
    }
  }
}

export default new ConfidenceDriftService();

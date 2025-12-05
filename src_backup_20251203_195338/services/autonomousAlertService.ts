import pool from '../db/index.js';
import { TechnicalMath } from '../utils/mathUtils.js';

interface AnomalyCheck {
  metric: string;
  current: number;
  history: number[];
  threshold_sd: number; // Standard Deviations
}

class AutonomousAlertService {

  async runMonitoringCycle() {
    console.log("      🚨 Alert Engine: Scanning for System Anomalies...");

    try {
        // 1. Check Confidence Stability
        // Are we suddenly losing confidence in everything?
        const confHistory = await pool.query(`
            SELECT AVG(confidence) as val, DATE(created_at) as d
            FROM ai_stock_tips
            WHERE created_at > NOW() - INTERVAL '30 days'
            GROUP BY d ORDER BY d DESC
        `);
        
        if (confHistory.rows.length > 5) {
            const current = parseFloat(confHistory.rows[0].val);
            const history = confHistory.rows.slice(1).map(r => parseFloat(r.val));
            await this.detectAnomaly({ metric: 'Confidence', current, history, threshold_sd: 1.5 });
        }

        // 2. Check Win Rate Stability (Rolling 7 day)
        // Did the Deep Brain suddenly get stupid?
        // (Mocking calculation here, usually derived from prediction_results aggregation)
        const winStats = await pool.query(`
            SELECT avg_win_rate_30d FROM confidence_drift_snapshots
            ORDER BY snapshot_date DESC LIMIT 7
        `);
        if (winStats.rows.length > 2) {
            const current = parseFloat(winStats.rows[0].avg_win_rate_30d);
            const history = winStats.rows.slice(1).map(r => parseFloat(r.avg_win_rate_30d));
            await this.detectAnomaly({ metric: 'Win Rate', current, history, threshold_sd: 1.5 });
        }

        // 3. Check Ingestion Volume
        // Did a data feed die?
        const ingestStats = await pool.query(`
            SELECT total_collected FROM digest_stats
            ORDER BY date DESC LIMIT 7
        `);
        if (ingestStats.rows.length > 2) {
            const current = parseInt(ingestStats.rows[0].total_collected);
            const history = ingestStats.rows.slice(1).map(r => parseInt(r.total_collected));
            // Only care about DROP in ingestion
            await this.detectAnomaly({ metric: 'Data Ingestion', current, history, threshold_sd: 2.0 });
        }

    } catch (e: any) {
        console.error("Alert Engine Failure:", e.message);
    }
  }

  private async detectAnomaly(check: AnomalyCheck) {
      const mean = check.history.reduce((a, b) => a + b, 0) / check.history.length;
      const stdDev = TechnicalMath.calculateVolatility(check.history); // Using utility for SD
      
      if (stdDev === 0) return;

      const zScore = (check.current - mean) / stdDev;

      // Detect Negative Deviations (Drops in performance/data)
      if (zScore < -check.threshold_sd) {
          const type = check.metric === 'Data Ingestion' ? 'DATA_OUTAGE' : 'PERFORMANCE_DIP';
          const msg = `${check.metric} dropped significantly (Z: ${zScore.toFixed(2)}). Current: ${check.current.toFixed(1)} vs Avg: ${mean.toFixed(1)}`;
          
          await this.createAlert(type, 'HIGH', msg, { z_score: zScore, current: check.current, mean });
          console.log(`      -> ⚠️  ANOMALY DETECTED: ${msg}`);
      }
      
      // Detect Spikes (if relevant, e.g. Volatility)
      // For now, we focus on system degradation.
  }

  async createAlert(type: string, severity: string, message: string, details: any) {
      // Dedup: Don't create same alert if one exists from today
      const exists = await pool.query(`
          SELECT id FROM system_alerts 
          WHERE alert_type = $1 AND created_at > CURRENT_DATE
      `, [type]);

      if (exists.rows.length === 0) {
          await pool.query(`
              INSERT INTO system_alerts (alert_type, severity, message, details)
              VALUES ($1, $2, $3, $4)
          `, [type, severity, message, JSON.stringify(details)]);
      }
  }

  async getRecentAlerts(limit = 10) {
      const res = await pool.query(`SELECT * FROM system_alerts ORDER BY created_at DESC LIMIT $1`, [limit]);
      return res.rows;
  }
}

export default new AutonomousAlertService();

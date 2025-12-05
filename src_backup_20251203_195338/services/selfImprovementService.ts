import pool from '../db/index.js';
import metaCortexService from './metaCortexService.js';
import evolutionEngine from './evolutionEngine.js';
import autonomousAlertService from './autonomousAlertService.js';
import confidenceDriftService from './confidenceDriftService.js';
import wdiwaAttributionService from './wdiwaAttributionService.js';

interface DashboardView {
  system_health: any;
  evolution_roadmap: any[];
  learning_status: {
    confidence_drift: any;
    attribution_weights: any;
  };
  active_alerts: any[];
  missed_opportunities: any[];
  strategic_summary: string[];
}

class SelfImprovementService {

  async getDashboard(): Promise<DashboardView> {
    console.log("      🧠 Generating Self-Improvement View...");

    try {
        // 1. Parallel Fetch of Meta-Layers
        const [health, plan, alerts, drift, weights] = await Promise.all([
            metaCortexService.runDiagnostics(),
            evolutionEngine.getLatestPlan(),
            autonomousAlertService.getRecentAlerts(5),
            confidenceDriftService.getDriftCorrection(),
            wdiwaAttributionService.getEngineWeights()
        ]);

        // 2. Analyze Missed Opportunities
        // Definition: Trades where Outcome=WIN but Confidence < 70 (System was right but timid)
        const missed = await this.getMissedOpportunities();

        // 3. Synthesize Strategic Recommendations
        const strategy = [];
        
        if (drift.status !== 'STABLE') {
            strategy.push(`Fix Confidence Drift (${drift.status}): Apply correction factor x${drift.correction_factor}`);
        }
        
        if (missed.length > 2) {
            strategy.push(`Boost Aggression: System missed ${missed.length} winning trades due to low confidence.`);
        }
        
        // FIXED: Changed .blind_spots to .blind_spot_report to match MetaCortex interface
        if (health.blind_spot_report && health.blind_spot_report.length > 0) {
            strategy.push(`Close Data Gaps: ${health.blind_spot_report.length} blind spots detected.`);
        }

        if (plan && plan.upgrades) {
            const highPri = plan.upgrades.filter((u: any) => u.priority === 'CRITICAL').length;
            if (highPri > 0) strategy.push(`Execute ${highPri} CRITICAL upgrades from Evolution Engine.`);
        }

        return {
            system_health: health,
            evolution_roadmap: plan?.upgrades || [],
            learning_status: {
                confidence_drift: drift,
                attribution_weights: weights
            },
            active_alerts: alerts,
            missed_opportunities: missed,
            strategic_summary: strategy
        };

    } catch (e: any) {
        console.error("Dashboard Gen Error:", e);
        throw new Error("Failed to generate Self-Improvement Dashboard");
    }
  }

  private async getMissedOpportunities() {
      try {
          const res = await pool.query(`
            SELECT ticker, confidence_at_prediction, performance_pnl, date_predicted
            FROM prediction_results
            WHERE result_outcome = 'WIN'
            AND confidence_at_prediction < 70
            ORDER BY date_predicted DESC
            LIMIT 5
          `);
          return res.rows;
      } catch (e) { return []; }
  }
}

export default new SelfImprovementService();

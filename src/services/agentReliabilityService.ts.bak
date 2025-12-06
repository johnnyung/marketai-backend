import { pool } from '../db/index.js';

interface AgentStats {
  name: string;
  wins: number;
  losses: number;
  total: number;
  totalPnl: number;
}

const AGENTS = [
  'Momentum', 'Value', 'Catalyst', 'Divergence',
  'ShadowLiquidity', 'NarrativePressure', 'InsiderIntent',
  'GammaExposure', 'FSIFundamentals', 'Regime'
];

class AgentReliabilityService {

  /**
   * Main entry point: Analyzes historical performance of all agents.
   */
  async runReliabilityAnalysis(daysBack: number = 90) {
    console.log(`   ⚖️  Agent Reliability: Analyzing last ${daysBack} days...`);
    
    try {
      // 1. Fetch graded predictions with agent signal data
      const res = await pool.query(`
        SELECT result_outcome, performance_pnl, agent_signals
        FROM prediction_results
        WHERE result_outcome IN ('WIN', 'LOSS')
        AND date_predicted > NOW() - INTERVAL '${daysBack} days'
      `);
      
      if (res.rows.length < 10) {
          console.log("      ⚠️  Insufficient data for reliability analysis (Need > 10 graded trades).");
          return { processed: 0, success: true };
      }

      // 2. Initialize Stats
      const stats: Record<string, AgentStats> = {};
      AGENTS.forEach(a => stats[a] = { name: a, wins: 0, losses: 0, total: 0, totalPnl: 0 });

      // 3. Attribution Logic (Did the agent agree with the trade?)
      // We assume a prediction was a "Buy".
      // If agent signal was bullish/positive -> They get credit/blame.
      for (const row of res.rows) {
          const outcome = row.result_outcome;
          const pnl = parseFloat(row.performance_pnl);
          const signals = row.agent_signals || {};

          // Map generic JSON structure to specific agents
          // This depends on how signalGeneratorService saves 'agent_signals'
          // We normalize common keys here
          this.attribute(stats['Momentum'], signals.momentum?.verdict === 'BULL', outcome, pnl);
          this.attribute(stats['Value'], signals.value?.verdict === 'BULL', outcome, pnl);
          this.attribute(stats['Catalyst'], signals.catalyst?.verdict === 'BULL', outcome, pnl);
          this.attribute(stats['Divergence'], !!signals.fractal?.has_divergence, outcome, pnl);
          this.attribute(stats['ShadowLiquidity'], signals.shadow?.bias === 'ACCUMULATION', outcome, pnl);
          this.attribute(stats['NarrativePressure'], (signals.narrative?.pressure_score || 0) > 60, outcome, pnl);
          this.attribute(stats['InsiderIntent'], signals.insider?.classification === 'OPPORTUNISTIC', outcome, pnl);
          this.attribute(stats['GammaExposure'], signals.gamma?.volatility_regime === 'SUPPRESSED', outcome, pnl);
          this.attribute(stats['FSIFundamentals'], signals.fsi?.traffic_light === 'GREEN', outcome, pnl);
          // Regime usually filters, but we can track if "RISK_ON" was correct
          this.attribute(stats['Regime'], signals.regime?.current_regime === 'RISK_ON', outcome, pnl);
      }

      // 4. Calculate & Save Scores
      for (const agent of AGENTS) {
          await this.calculateAndSave(stats[agent]);
      }
      
      return { processed: res.rows.length, success: true };

    } catch (e: any) {
      console.error("      ❌ Reliability Analysis Failed:", e.message);
      return { processed: 0, success: false, error: e.message };
    }
  }

  private attribute(stat: AgentStats, active: boolean, outcome: string, pnl: number) {
      if (!active) return;
      stat.total++;
      stat.totalPnl += pnl;
      if (outcome === 'WIN') stat.wins++;
      else stat.losses++;
  }

  private async calculateAndSave(stat: AgentStats) {
      if (stat.total === 0) return;

      const winRate = (stat.wins / stat.total) * 100;
      const avgPnl = stat.totalPnl / stat.total;
      
      // Multiplier Logic
      let multiplier = 1.0;
      if (winRate > 65) multiplier = 1.10;      // Strong
      else if (winRate < 40) multiplier = 0.80; // Poor
      else if (winRate < 50) multiplier = 0.90; // Weak
      
      // Save Snapshot
      await pool.query(`
        INSERT INTO agent_reliability_snapshots (
            agent_name, win_rate, avg_pnl_contribution, consistency_score,
            reliability_multiplier, sample_size, snapshot_date
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
        ON CONFLICT (agent_name, snapshot_date) DO UPDATE SET
            win_rate = $2,
            avg_pnl_contribution = $3,
            reliability_multiplier = $5,
            sample_size = $6
      `, [stat.name, winRate, avgPnl, 0, multiplier, stat.total]);
      
      console.log(`      -> ${stat.name}: Win Rate ${winRate.toFixed(1)}% | Mult: ${multiplier.toFixed(2)}`);
  }
}

export default new AgentReliabilityService();

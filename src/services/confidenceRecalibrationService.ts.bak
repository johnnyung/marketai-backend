import { pool } from '../db/index.js';
import drawdownSensitivityService from './drawdownSensitivityService.js';
import sipeLearningService from './sipeLearningService.js';
import smcwLearningService from './smcwLearningService.js';
import wdiwaAttributionService from './wdiwaAttributionService.js'; // POT PHASE 11

interface Multipliers {
  agent: number;
  fsi: number;
  narrative: number;
  shadow: number;
  regime: number;
  drawdown: number;
  sector: number;
  seasonal: number;
  attribution: number; // NEW
}

class ConfidenceRecalibrationService {
  
  private agentReliabilityCache: Record<string, number> = {};
  private lastCacheUpdate = 0;

  async recalibrate(
    baseConfidence: number,
    agents: any,
    fsi: any,
    narrative: any,
    shadow: any,
    regime: any,
    tier: string = 'blue_chip',
    sector: string = 'General'
  ): Promise<{ score: number, multipliers: Multipliers, reason: string }> {
    
    await this.ensureCache();
    const weights = await wdiwaAttributionService.getEngineWeights(); // POT 11

    let agentMult = 1.0;
    let activeAgents = 0;

    if (agents) {
        if (agents.momentum?.verdict === 'BULL') {
            agentMult += (this.getRel('Momentum') * weights.momentum);
            activeAgents++;
        }
        if (agents.value?.verdict === 'BULL') {
            agentMult += (this.getRel('Value') * weights.value);
            activeAgents++;
        }
        if (agents.catalyst?.verdict === 'BULL') {
            agentMult += (this.getRel('Catalyst') * weights.catalyst);
            activeAgents++;
        }
    }
    
    if (activeAgents > 0) agentMult = agentMult / activeAgents;
    else agentMult = 1.0;

    // FSI
    let fsiMult = 1.0;
    if (fsi?.traffic_light === 'GREEN') fsiMult = 1.1 * weights.fsi;
    else if (fsi?.traffic_light === 'RED') fsiMult = 0.6;
    else if (fsi?.traffic_light === 'YELLOW') fsiMult = 0.9;

    // Narrative
    let narrMult = 1.0;
    if (narrative?.pressure_score > 80) narrMult = 1.15 * weights.narrative;
    else if (narrative?.pressure_score < 20) narrMult = 0.9;

    // Shadow
    let shadowMult = 1.0;
    if (shadow?.bias === 'ACCUMULATION') shadowMult = 1.1 * weights.shadow;
    else if (shadow?.bias === 'DISTRIBUTION') shadowMult = 0.8;

    // Regime
    let regimeMult = 1.0;
    if (regime?.current_regime === 'RISK_ON') regimeMult = 1.05;
    else if (regime?.current_regime === 'RISK_OFF') regimeMult = 0.85;

    // DSC
    const dsc = await drawdownSensitivityService.getRiskProfile(tier);
    const dscPenalty = dsc.confidence_penalty || 0;
    const dscMult = 1.0 - (dscPenalty / 100);

    // SIPE
    const sipe = await sipeLearningService.getSectorBias(sector);
    const sectorMult = sipe.bias_multiplier;

    // SMCW
    const smcw = await smcwLearningService.getCurrentSeasonality();
    const seasonalMult = smcw.confidence_modifier;

    // --- FINAL CALCULATION ---
    const rawScore = baseConfidence * agentMult * fsiMult * narrMult * shadowMult * regimeMult * dscMult * sectorMult * seasonalMult;
    const finalScore = Math.min(99, Math.max(1, Math.round(rawScore)));

    // Construct reason using strongest driver
    let topDriver = "Multi-Factor";
    if (weights.shadow > 1.1) topDriver = "Institutional Flow";
    if (weights.fsi > 1.1) topDriver = "Fundamentals";
    if (weights.narrative > 1.1) topDriver = "Sentiment";

    const reason = `Base ${baseConfidence} -> Adj ${finalScore}. (${topDriver} Weighted)`;

    return {
        score: finalScore,
        multipliers: {
            agent: agentMult,
            fsi: fsiMult,
            narrative: narrMult,
            shadow: shadowMult,
            regime: regimeMult,
            drawdown: dscMult,
            sector: sectorMult,
            seasonal: seasonalMult,
            attribution: 1.0 // Placeholder for display
        },
        reason
    };
  }

  private getRel(agentName: string): number {
      return this.agentReliabilityCache[agentName] || 1.0;
  }

  private async ensureCache() {
      if (Date.now() - this.lastCacheUpdate < 3600000) return;
      try {
          const res = await pool.query(`SELECT agent_name, reliability_multiplier FROM agent_reliability_snapshots WHERE snapshot_date = CURRENT_DATE`);
          if (res.rows.length > 0) {
              res.rows.forEach(r => { this.agentReliabilityCache[r.agent_name] = parseFloat(r.reliability_multiplier); });
          }
          this.lastCacheUpdate = Date.now();
      } catch (e) {}
  }
}

export default new ConfidenceRecalibrationService();
